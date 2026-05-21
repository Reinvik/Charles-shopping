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
    const { items, email, total, userId, tenantId, shippingDetails } = await req.json()

    if (!tenantId) {
      throw new Error('No se proporcionó tenantId en la solicitud.')
    }

    if (!items || items.length === 0) {
      throw new Error('El carrito no puede estar vacío.')
    }

    if (!email) {
      throw new Error('Se requiere el correo del comprador.')
    }

    if (!total || total <= 0) {
      throw new Error('El total debe ser mayor a 0.')
    }

    // 1. Create client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch Settings from Database for THIS SPECIFIC TENANT
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('site_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['flow_settings', 'theme'])

    if (settingsError) {
      throw new Error('Error al obtener configuraciones: ' + settingsError.message)
    }

    const flowSettings = settingsData?.find(s => s.key === 'flow_settings')?.value as any
    const themeSettings = settingsData?.find(s => s.key === 'theme')?.value as any
    const siteName = themeSettings?.siteName || "Tienda"
    const telegramToken = themeSettings?.telegramToken || ""
    const telegramChatId = themeSettings?.telegramChatId || ""

    if (!flowSettings || !flowSettings.apiKey || !flowSettings.secret) {
      throw new Error('No se ha configurado Flow correctamente en el panel de administración.')
    }

    const { apiKey, secret, isSandbox } = flowSettings
    const FLOW_URL = isSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api"

    // 3. Insert order WITH tenant_id
    // NOTE: flow_token se llenará después de obtener respuesta de Flow
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: userId || null,
        tenant_id: tenantId,
        total: Math.round(total),
        status: 'pending',
        items,
        customer_email: email,
        shipping_details: shippingDetails,
        delivery_status: 'Por preparar',
      })
      .select()
      .single()

    if (orderError) {
      throw new Error(`Error al crear el pedido: ${orderError.message}`)
    }

    console.log(`[flow-create-payment] Order created: ${order.id} for tenant: ${tenantId}`)

    // Determine return origin (site origin or subdomain)
    const requestOrigin = req.headers.get('origin') || ''
    const returnOrigin = requestOrigin || 'https://charles-shopping.vercel.app'

    // 4. Prepare Flow Request
    const params: any = {
      amount: Math.round(total),
      apiKey: apiKey,
      commerceOrder: order.id,
      currency: "CLP",
      email: email,
      subject: `Pedido #${order.id.toString().slice(0, 8)} - ${siteName}`,
      urlConfirmation: `${Deno.env.get('SUPABASE_URL')}/functions/v1/flow-webhook`,
      urlReturn: `${Deno.env.get('SUPABASE_URL')}/functions/v1/flow-return?origin=${encodeURIComponent(returnOrigin)}`,
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

    console.log(`[flow-create-payment] Calling Flow API (${isSandbox ? 'SANDBOX' : 'PRODUCTION'})`)
    const flowResponse = await fetch(`${FLOW_URL}/payment/create`, {
      method: "POST",
      body: formData,
    })

    const flowData = await flowResponse.json()

    if (!flowResponse.ok) {
      // Marcar pedido como fallido si Flow rechaza la creación
      await supabaseClient
        .from('orders')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', order.id)
      throw new Error(`Error de Flow: ${JSON.stringify(flowData)}`)
    }

    // 6. Update order with flow_token IMMEDIATELY (crucial: debe hacerse antes de retornar al cliente)
    const { error: tokenUpdateError } = await supabaseClient
      .from('orders')
      .update({ 
        flow_token: flowData.token,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (tokenUpdateError) {
      console.error(`[flow-create-payment] Failed to update flow_token:`, tokenUpdateError)
      // No lanzamos error aquí porque Flow ya creó el pago — el webhook puede recuperar por commerceOrder
    } else {
      console.log(`[flow-create-payment] flow_token saved: ${flowData.token}`)
    }

    // 7. Send Telegram notification (nuevo pedido iniciado)
    if (telegramToken && telegramChatId) {
      try {
        const productList = items.map((i: any) => `  • ${i.name} x${i.quantity} — $${(i.price * i.quantity).toLocaleString('es-CL')}`).join('\n')
        const fullName = shippingDetails?.fullName || 'Sin nombre'
        const address = shippingDetails?.address || 'Sin dirección'
        const comuna = shippingDetails?.comuna || ''
        const phone = shippingDetails?.phone || 'Sin teléfono'
        const shippingCost = shippingDetails?.shippingCost || 0

        const telegramMsg = `🛒 *NUEVO PEDIDO INICIADO — ${siteName}*\n\n` +
          `👤 Cliente: ${fullName}\n` +
          `📧 Correo: ${email}\n` +
          `📞 Teléfono: ${phone}\n` +
          `📍 Dirección: ${address}, ${comuna}\n\n` +
          `🛍️ *Productos:*\n${productList}\n\n` +
          `🚚 Despacho: $${shippingCost.toLocaleString('es-CL')}\n` +
          `💰 *TOTAL: $${Math.round(total).toLocaleString('es-CL')} CLP*\n\n` +
          `⏳ Estado: Esperando confirmación de pago...\n` +
          `🔗 ID Pedido: \`${order.id}\``

        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramMsg,
            parse_mode: 'Markdown'
          })
        })
      } catch (telegramErr) {
        console.error('Error enviando Telegram (no crítico):', telegramErr)
      }
    }

    return new Response(
      JSON.stringify({ url: `${flowData.url}?token=${flowData.token}`, orderId: order.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error en flow-create-payment:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
