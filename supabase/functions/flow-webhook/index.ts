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
    const formData = await req.formData()
    const token = formData.get('token')

    if (!token) throw new Error("No se proporcionó token")

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
      throw new Error('Configuración de Flow no encontrada.')
    }

    const { apiKey, secret, isSandbox } = settingsData.value as any
    const FLOW_URL = isSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api"

    // 3. Verify payment status with Flow
    const params: any = {
      apiKey: apiKey,
      token: token
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

    const query = new URLSearchParams()
    query.append('apiKey', apiKey)
    query.append('token', token as string)
    query.append('s', signature)

    const statusResponse = await fetch(`${FLOW_URL}/payment/getStatus?${query.toString()}`)
    const statusData = await statusResponse.json()

    if (!statusResponse.ok) {
      throw new Error(`Error de estado de Flow: ${JSON.stringify(statusData)}`)
    }

    // 4. Update Database
    // Flow status: 1 = pending, 2 = paid, 3 = rejected, 4 = cancelled
    let dbStatus = 'pending'
    if (statusData.status === 2) dbStatus = 'paid'
    if (statusData.status === 3 || statusData.status === 4) dbStatus = 'rejected'

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        status: dbStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', statusData.commerceOrder)

    if (updateError) throw updateError

    // 5. Respond to Flow
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Error en Webhook:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
