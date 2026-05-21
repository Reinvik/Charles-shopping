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

  let token: string | null = null

  try {
    // --- Parse token from Flow ---
    // Flow envía el token como application/x-www-form-urlencoded
    // Usamos múltiples estrategias para mayor robustez
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData()
        token = formData.get('token') as string | null
      } catch {
        // Fallback: parsear manualmente desde text
        const text = await req.text()
        const params = new URLSearchParams(text)
        token = params.get('token')
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json()
      token = body.token
    } else {
      // Último recurso: intentar parsear como form data o como texto
      try {
        const text = await req.text()
        const params = new URLSearchParams(text)
        token = params.get('token')
      } catch {
        const body = await req.json()
        token = body.token
      }
    }

    console.log(`[flow-webhook] Received token: ${token ? token.substring(0, 10) + '...' : 'NULL'}`)

    if (!token) {
      throw new Error("No se proporcionó token en el body de la solicitud")
    }

    // 1. Create client with service role
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
      console.error(`[flow-webhook] Order not found for token: ${token}`, orderError)
      throw new Error(`Pedido no encontrado para el token: ${token}`)
    }

    console.log(`[flow-webhook] Order found: ${orderData.id} | tenant: ${orderData.tenant_id} | current status: ${orderData.status}`)

    // 3. Fetch Flow Settings + Theme Settings from Database using tenant_id
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('site_settings')
      .select('key, value')
      .eq('tenant_id', orderData.tenant_id)
      .in('key', ['flow_settings', 'theme'])

    if (settingsError || !settingsData || settingsData.length === 0) {
      console.error(`[flow-webhook] Settings not found for tenant: ${orderData.tenant_id}`, settingsError)
      throw new Error(`Configuración no encontrada para la tienda (tenant_id: ${orderData.tenant_id})`)
    }

    const flowSettings = settingsData.find((s: any) => s.key === 'flow_settings')?.value as any
    const themeSettings = settingsData.find((s: any) => s.key === 'theme')?.value as any

    if (!flowSettings || !flowSettings.apiKey || !flowSettings.secret) {
      console.error(`[flow-webhook] Flow settings invalid for tenant: ${orderData.tenant_id}`, flowSettings)
      throw new Error('Configuración de Flow incompleta para esta tienda (falta apiKey o secret)')
    }

    const { apiKey, secret, isSandbox } = flowSettings
    const FLOW_URL = isSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api"

    console.log(`[flow-webhook] Using ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} Flow API`)

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

    console.log(`[flow-webhook] Querying Flow status: ${FLOW_URL}/payment/getStatus`)
    const statusResponse = await fetch(`${FLOW_URL}/payment/getStatus?${query.toString()}`)
    const statusData = await statusResponse.json()

    if (!statusResponse.ok) {
      console.error(`[flow-webhook] Flow API error:`, statusData)
      throw new Error(`Error de estado de Flow: ${JSON.stringify(statusData)}`)
    }

    console.log(`[flow-webhook] Flow status response: status=${statusData.status}, commerceOrder=${statusData.commerceOrder}`)

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

    if (updateError) {
      console.error(`[flow-webhook] Error updating order:`, updateError)
      throw updateError
    }

    console.log(`[flow-webhook] Order ${orderData.id} updated to status: ${dbStatus}`)

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

          const telegramRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: telegramMsg,
              parse_mode: 'Markdown'
            })
          })
          if (!telegramRes.ok) {
            const telegramErr = await telegramRes.text()
            console.warn(`[flow-webhook] Telegram notification failed (non-critical):`, telegramErr)
          } else {
            console.log(`[flow-webhook] Telegram notification sent successfully`)
          }
        }
      } catch (telegramErr) {
        console.error('[flow-webhook] Error enviando Telegram (no crítico):', telegramErr)
      }
    }

    // 7. Respond to Flow (MUST return 200 OK with JSON)
    console.log(`[flow-webhook] Responding 200 OK to Flow`)
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[flow-webhook] FATAL ERROR:", errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
