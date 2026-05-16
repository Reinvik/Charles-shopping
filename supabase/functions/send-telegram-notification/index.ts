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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()
    
    // Obtener configuración de la tienda
    const { data: settings } = await supabaseClient
      .from('garage_settings')
      .select('telegramToken, telegramChatId, siteName')
      .eq('tenant_id', record.tenant_id)
      .single()

    if (!settings?.telegramToken || !settings?.telegramChatId) {
      return new Response(JSON.stringify({ message: 'Telegram not configured' }), { status: 200 })
    }

    const siteName = settings.siteName || 'Tu Tienda'

    // Formatear mensaje para Telegram (soporta Markdown)
    const message = `*¡Nueva Venta en ${siteName}!* 🛒\n\n` +
                    `*Orden:* #${record.id.slice(0,8)}\n` +
                    `*Cliente:* ${record.customer_name}\n` +
                    `*Total:* $${record.total_amount.toLocaleString('es-CL')}\n` +
                    `*Método:* ${record.payment_method}\n\n` +
                    `[Ver detalles en el Admin](https://charles-shopping.vercel.app/admin/orders)`

    // Enviar a Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${settings.telegramToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    )

    const result = await response.json()

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
