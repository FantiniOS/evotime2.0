-- =============================================================================
-- EVOTIME 2.0 • TABELA usuarios E GESTÃO DE EQUIPE / PERMISSÕES (SUPABASE)
-- Execute este script no SQL Editor do Supabase (Project: shvqthjdjwtsvezveusi)
-- =============================================================================

-- 1. TABELA public.usuarios (com username único e e-mail mapeado)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'coordenador' CHECK (role IN ('admin', 'coordenador', 'diretor', 'professor')),
    escola_id UUID REFERENCES public.escolas(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.usuarios IS 'Membros da equipe com perfil, username de login, permissões e vínculo institucional no EvoTime 2.0';

-- 1.1 Se a tabela já existia sem a coluna username, aplica migração idempotente:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE public.usuarios ADD COLUMN username VARCHAR(100) UNIQUE;
    END IF;
END $$;

-- 2. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON public.usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_escola_id ON public.usuarios(escola_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON public.usuarios(role);

-- 3. TRIGGER PARA updated_at
CREATE OR REPLACE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. HABILITA ROW LEVEL SECURITY (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (RLS)
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
CREATE POLICY "usuarios_select_policy" ON public.usuarios
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
CREATE POLICY "usuarios_insert_policy" ON public.usuarios
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
CREATE POLICY "usuarios_update_policy" ON public.usuarios
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;
CREATE POLICY "usuarios_delete_policy" ON public.usuarios
    FOR DELETE
    TO anon, authenticated
    USING (true);
