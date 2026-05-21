import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, flowToken } = await req.json()

    if (!orderId && !flowToken) {
      throw new Error("Se requiere orderId o flowToken")
    }

    // 1. Create client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch Order from Database
    let queryBuilder = supabaseClient.from('orders').select('*')
    if (orderId) {
      queryBuilder = queryBuilder.eq('id', orderId)
    } else {
      queryBuilder = queryBuilder.eq('flow_token', flowToken)
    }

    const { data: order, error: orderError } = await queryBuilder.single()
    if (orderError || !order) {
      throw new Error(`Pedido no encontrado en la base de datos. ${orderId ? `orderId: ${orderId}` : `flowToken: ${flowToken}`}`)
    }

    if (!order.flow_token) {
      throw new Error('El pedido no tiene un token de Flow asociado.')
    }

    // 3. Fetch Flow Settings from Database using tenant_id
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'flow_settings')
      .eq('tenant_id', order.tenant_id)
      .single()

    if (settingsError || !settingsData?.value) {
      throw new Error(`Configuración de Flow no encontrada para la tienda (tenant_id: ${order.tenant_id})`)
    }

    const { apiKey, secret, isSandbox } = settingsData.value as any

    if (!apiKey || !secret) {
      throw new Error('La tienda no tiene apiKey o secret de Flow configurados.')
    }

    const FLOW_URL = isSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api"

    // 4. Verify payment status with Flow
    const params: any = {
      apiKey: apiKey,
      token: order.flow_token
    }

    const sortedKeys = Object.keys(params).sort()
    let toSign = ""
    for (const key of sortedKeys) {
      toSign += key + params[key]
    }

    const encoder = new TextEncoder()
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(toSign)
    )
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const searchParams = new URLSearchParams()
    searchParams.append('apiKey', apiKey)
    searchParams.append('token', order.flow_token)
    searchParams.append('s', signature)

    const statusResponse = await fetch(`${FLOW_URL}/payment/getStatus?${searchParams.toString()}`)
    const statusData = await statusResponse.json()

    if (!statusResponse.ok) {
      throw new Error(`Error de estado de Flow: ${JSON.stringify(statusData)}`)
    }

    // 5. Update Database
    // Flow status: 1 = pending, 2 = paid, 3 = rejected, 4 = cancelled
    let dbStatus = 'pending'
    if (statusData.status === 2) dbStatus = 'paid'
    if (statusData.status === 3 || statusData.status === 4) dbStatus = 'rejected'

    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        status: dbStatus,
        payment_details: statusData,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, order: updatedOrder }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error en flow-check-status:", errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
