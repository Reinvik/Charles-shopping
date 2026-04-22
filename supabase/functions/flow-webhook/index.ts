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
  // Webhooks from Flow come as POST application/x-www-form-urlencoded
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const token = formData.get('token')

    if (!token) throw new Error("No token provided")

    // 1. Verify payment status with Flow
    const params: any = {
      apiKey: FLOW_API_KEY,
      token: token
    }

    const sortedKeys = Object.keys(params).sort()
    let toSign = ""
    for (const key of sortedKeys) {
      toSign += key + params[key]
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(FLOW_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(toSign)
    )
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const query = new URLSearchParams()
    query.append('apiKey', FLOW_API_KEY)
    query.append('token', token as string)
    query.append('s', signature)

    const statusResponse = await fetch(`${FLOW_URL}/payment/getStatus?${query.toString()}`)
    const statusData = await statusResponse.json()

    if (!statusResponse.ok) {
      throw new Error(`Flow Status Error: ${JSON.stringify(statusData)}`)
    }

    // 2. Update Database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Flow status: 1 = pending, 2 = paid, 3 = rejected, 4 = cancelled
    let dbStatus = 'pending'
    if (statusData.status === 2) dbStatus = 'paid'
    if (statusData.status === 3 || statusData.status === 4) dbStatus = 'rejected'

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ status: dbStatus })
      .eq('id', statusData.commerceOrder)

    if (updateError) throw updateError

    // 3. Respond to Flow
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Webhook Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
