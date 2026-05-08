import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FLOW_API_KEY = Deno.env.get('FLOW_API_KEY')
const FLOW_SECRET = Deno.env.get('FLOW_SECRET')
const FLOW_URL = Deno.env.get('FLOW_URL') || "https://sandbox.flow.cl/api"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, email, total, userId } = await req.json()

    // 1. Create client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch Flow Settings from Database
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'flow_settings')
      .single()

    if (settingsError || !settingsData?.value) {
      throw new Error('No se ha configurado Flow en el panel de administración.')
    }

    const { apiKey, secret, isSandbox } = settingsData.value as any
    const FLOW_URL = isSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api"

    // 3. Insert order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: userId,
        total,
        status: 'pending',
        items,
        customer_email: email
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 4. Prepare Flow Request
    const params: any = {
      amount: Math.round(total),
      apiKey: apiKey,
      commerceOrder: order.id,
      currency: "CLP",
      email: email,
      subject: `Pedido #${order.id.toString().slice(0, 8)} - Charles Shopping`,
      urlConfirmation: `${Deno.env.get('SUPABASE_URL')}/functions/v1/flow-webhook`,
      urlReturn: `${req.headers.get('origin')}/checkout/success`,
      urlError: `${req.headers.get('origin')}/checkout/failure`,
    }

    // Sort keys and concatenate for signature
    const sortedKeys = Object.keys(params).sort()
    let toSign = ""
    for (const key of sortedKeys) {
      toSign += key + params[key]
    }
    
    // HMAC-SHA256
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

    params.s = signature

    // 5. Call Flow
    const formData = new URLSearchParams()
    for (const k in params) {
      formData.append(k, params[k])
    }

    const flowResponse = await fetch(`${FLOW_URL}/payment/create`, {
      method: "POST",
      body: formData,
    })

    const flowData = await flowResponse.json()

    if (!flowResponse.ok) {
      throw new Error(`Error de Flow: ${JSON.stringify(flowData)}`)
    }

    // 6. Update order with token
    await supabaseClient
      .from('orders')
      .update({ flow_token: flowData.token })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({ url: `${flowData.url}?token=${flowData.token}`, orderId: order.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
