-- Crear tabla de suscriptores
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede insertar correos (para el formulario)
CREATE POLICY "Enable insert for everyone" ON public.newsletter_subscribers
    FOR INSERT WITH CHECK (true);

-- Política: Solo administradores pueden ver la lista
CREATE POLICY "Enable read for authenticated users only" ON public.newsletter_subscribers
    FOR SELECT TO authenticated USING (true);
