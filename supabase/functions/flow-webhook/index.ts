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
    const formData = await req.formData()
    const token = formData.get('token')

    if (!token) throw new Error("No se proporcionó token")

    // 1. Create client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch full Order from Database by token (to have tenant_id and items)
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('flow_token', token)
      .single()

    if (orderError || !orderData) {
      throw new Error('Pedido no encontrado para el token proporcionado.')
    }

    // 3. Fetch Flow Settings + Theme Settings from Database using tenant_id
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('site_settings')
      .select('key, value')
      .eq('tenant_id', orderData.tenant_id)
      .in('key', ['flow_settings', 'theme'])

    if (settingsError || !settingsData) {
      throw new Error('Configuración no encontrada para la tienda.')
    }

    const flowSettings = settingsData.find((s: any) => s.key === 'flow_settings')?.value as any
    const themeSettings = settingsData.find((s: any) => s.key === 'theme')?.value as any

    if (!flowSettings) {
      throw new Error('Configuración de Flow no encontrada para la tienda.')
    }

    const { apiKey, secret, isSandbox } = flowSettings
    const FLOW_URL = isSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api"

    // 4. Verify payment status with Flow
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

    // 5. Update Database
    // Flow status: 1 = pending, 2 = paid, 3 = rejected, 4 = cancelled
    let dbStatus = 'pending'
    if (statusData.status === 2) dbStatus = 'paid'
    if (statusData.status === 3 || statusData.status === 4) dbStatus = 'rejected'

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        status: dbStatus,
        payment_details: statusData,
        updated_at: new Date().toISOString()
      })
      .eq('flow_token', token)

    if (updateError) throw updateError

    // 6. Send Telegram notification ONLY when payment transitions to PAID
    if (dbStatus === 'paid' && orderData.status !== 'paid') {
      try {
        const telegramBotToken = themeSettings?.telegramToken || ""
        const telegramChatId = themeSettings?.telegramChatId || ""
        const siteName = themeSettings?.siteName || "Tienda"

        if (telegramBotToken && telegramChatId) {
          const items = orderData.items || []
          const productList = items.map((i: any) => 
            `  ✅ ${i.name} x${i.quantity} — $${((i.price || 0) * (i.quantity || 1)).toLocaleString('es-CL')}`
          ).join('\n')

          const shipping = orderData.shipping_details || {}
          const fullName = shipping.fullName || 'Sin nombre'
          const phone = shipping.phone || 'Sin teléfono'
          const address = shipping.address || 'Sin dirección'
          const comuna = shipping.comuna || ''
          const shippingCost = shipping.shippingCost || 0
          const email = orderData.customer_email || ''
          const payMedia = statusData?.paymentData?.media || 'Flow'

          const telegramMsg = `💸 *¡PAGO CONFIRMADO! — ${siteName}*\n\n` +
            `👤 Cliente: ${fullName}\n` +
            `📧 Correo: ${email}\n` +
            `📞 Teléfono: ${phone}\n` +
            `📍 Dirección: ${address}, ${comuna}\n\n` +
            `🛍️ *Productos:*\n${productList}\n\n` +
            `🚚 Despacho: $${shippingCost.toLocaleString('es-CL')}\n` +
            `💰 *TOTAL PAGADO: $${orderData.total.toLocaleString('es-CL')} CLP*\n` +
            `💳 Medio de pago: ${payMedia}\n\n` +
            `🆔 ID Pedido: \`${orderData.id}\``

          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: telegramMsg,
              parse_mode: 'Markdown'
            })
          })
        }
      } catch (telegramErr) {
        console.error('Error enviando Telegram (no crítico):', telegramErr)
      }
    }

    // 7. Respond to Flow (must return 200 OK)
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
