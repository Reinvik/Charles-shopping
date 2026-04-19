import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FLOW_API_KEY = "1F08E0EB-247B-4FC2-8EB0-2ALE5B9AFE26"
const FLOW_SECRET = "41b5cb9e47e03875b6d8b043c3b234afad3f9a6c"
const FLOW_URL = "https://sandbox.flow.cl/api"

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

    // 2. Insert order
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

    // 3. Prepare Flow Request
    // Based on Flow API: parameters must be in alphabetical order for signature
    const params: any = {
      amount: total,
      apiKey: FLOW_API_KEY,
      commerceOrder: order.id,
      currency: "CLP",
      email: email,
      subject: "Compra en Charles Shopping",
      urlConfirmation: "https://iuzpgljjfeobxlptmsma.supabase.co/functions/v1/flow-webhook",
      urlReturn: `${req.headers.get('origin')}/checkout/success`,
      urlError: `${req.headers.get('origin')}/checkout/failure`,
    }

    // Sort keys and concatenate for signature as per Flow documentation
    const sortedKeys = Object.keys(params).sort()
    let toSign = ""
    for (const key of sortedKeys) {
      toSign += key + params[key]
    }
    
    // Flow Signature: HMAC-SHA256 of concatenated keys and values
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

    params.s = signature

    // 4. Call Flow using URLSearchParams (application/x-www-form-urlencoded)
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
      throw new Error(`Flow Error: ${JSON.stringify(flowData)}`)
    }

    // 5. Update order with token
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
