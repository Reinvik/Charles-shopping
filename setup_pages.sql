-- Corre este script en el editor SQL de Supabase (SQL Editor)

CREATE TABLE IF NOT EXISTS public.store_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
-- Todo el mundo puede leer las páginas
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.store_pages FOR SELECT 
USING ( true );

-- Solo los administradores pueden crear/editar/eliminar páginas.
-- Por seguridad y simplicidad temporal (como solicitaste antes), permitiremos ALL
-- pero en producción deberías limitarlo al rol admin.
CREATE POLICY "Enable ALL for authenticated users on store_pages" 
ON public.store_pages FOR ALL 
USING ( true ) WITH CHECK ( true );
