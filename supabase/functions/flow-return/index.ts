import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const formData = await req.formData()
    const token = formData.get('token')
    const url = new URL(req.url)
    const origin = url.searchParams.get('origin') || 'https://charles-shopping.vercel.app'

    if (!token) {
      return Response.redirect(`${origin}/checkout/failure`, 303)
    }

    // Redirigir a la página de éxito con el token como parámetro GET
    return Response.redirect(`${origin}/checkout/success?token=${token}`, 303)
  } catch (err) {
    console.error('Error in flow-return:', err)
    return Response.redirect('https://charles-shopping.vercel.app/checkout/failure', 303)
  }
})
