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
    
    // Obtener configuración de la tienda (teléfono y token)
    const { data: settings } = await supabaseClient
      .from('garage_settings')
      .select('notificationPhone, whatsappToken, siteName')
      .eq('tenant_id', record.tenant_id)
      .single()

    if (!settings?.notificationPhone) {
      return new Response(JSON.stringify({ message: 'No phone configured' }), { status: 200 })
    }

    const phone = settings.notificationPhone.replace(/\D/g, '')
    const token = settings.whatsappToken // Si es nulo, podríamos usar un token de sistema
    const siteName = settings.siteName || 'Tu Tienda'

    // Formatear mensaje
    const message = `*¡Nueva Venta en ${siteName}!* 🛒\n\n` +
                    `*Orden:* #${record.id.slice(0,8)}\n` +
                    `*Cliente:* ${record.customer_name}\n` +
                    `*Total:* $${record.total_amount.toLocaleString('es-CL')}\n` +
                    `*Método:* ${record.payment_method}\n\n` +
                    `Revisa los detalles en tu panel de administración.`

    // Enviar a WhatsApp (Meta Cloud API)
    // Nota: Aquí se usa el ID del teléfono de envío de Meta
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') 
    const FINAL_TOKEN = token || Deno.env.get('WHATSAPP_SYSTEM_TOKEN')

    const response = await fetch(
      `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FINAL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
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
