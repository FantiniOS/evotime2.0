-- =============================================================================
-- EVOTIME 2.0 • SCRIPT COMPLETO DE BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Execute este script no SQL Editor do Supabase (Project: shvqthjdjwtsvezveusi)
-- Ele cria todas as tabelas em ordem correta de dependências, triggers e RLS.
-- =============================================================================

-- 0. Habilita extensões para UUID e Criptografia
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 0.1 Função para atualizar updated_at automaticamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. TABELA: escolas (Instituições de Ensino / Tenants Raiz)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.escolas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    subtitulo VARCHAR(255),
    cnpj_ou_inep VARCHAR(64),
    modelo_ensino VARCHAR(100) DEFAULT 'Ensino Fundamental e Médio',
    cidade VARCHAR(120),
    plano_badge VARCHAR(64) DEFAULT 'Plano Inicial',
    logo_data_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.escolas IS 'Instituições de ensino cadastradas no ecossistema multi-tenant EvoTime 2.0';

CREATE OR REPLACE TRIGGER trg_escolas_updated_at
BEFORE UPDATE ON public.escolas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 2. TABELA: usuarios (Membros da Equipe, Login por Username e Permissões)
-- =============================================================================
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

COMMENT ON TABLE public.usuarios IS 'Membros da equipe com login direto por username e permissões';

-- Migração idempotente se a tabela usuarios já existir sem a coluna username:
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

CREATE OR REPLACE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. TABELA: disciplinas (Matérias curriculares por Escola)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.disciplinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    cor_id VARCHAR(32) NOT NULL DEFAULT 'blue',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.disciplinas IS 'Disciplinas curriculares vinculadas a uma escola';

CREATE OR REPLACE TRIGGER trg_disciplinas_updated_at
BEFORE UPDATE ON public.disciplinas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. TABELA: turmas (Classes escolares com matriz curricular)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    turno VARCHAR(32) NOT NULL CHECK (turno IN ('Matutino', 'Vespertino', 'Noturno', 'Integral')),
    matriz_curricular JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.turmas IS 'Turmas de alunos com turno e matriz curricular';

CREATE OR REPLACE TRIGGER trg_turmas_updated_at
BEFORE UPDATE ON public.turmas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. TABELA: professores (Corpo docente, vínculos e indisponibilidades)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.professores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(160) NOT NULL,
    vinculos JSONB NOT NULL DEFAULT '[]'::jsonb,
    indisponibilidades JSONB NOT NULL DEFAULT '[]'::jsonb,
    regras JSONB NOT NULL DEFAULT '{"avoidGaps": true, "avoidMoreThanTwoConsecutive": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.professores IS 'Professores com vínculos e grade de restrições';

CREATE OR REPLACE TRIGGER trg_professores_updated_at
BEFORE UPDATE ON public.professores
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 6. ÍNDICES DE PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON public.usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_escola_id ON public.usuarios(escola_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON public.usuarios(role);

CREATE INDEX IF NOT EXISTS idx_disciplinas_escola_id ON public.disciplinas(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_escola_id ON public.turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_professores_escola_id ON public.professores(escola_id);

-- =============================================================================
-- 7. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 8. POLÍTICAS DE RLS (POLICIES) PARA ACESSO (ANON E AUTHENTICATED)
-- -----------------------------------------------------------------------------

-- Políticas para ESCOLAS
DROP POLICY IF EXISTS "escolas_select_all" ON public.escolas;
CREATE POLICY "escolas_select_all" ON public.escolas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "escolas_insert_all" ON public.escolas;
CREATE POLICY "escolas_insert_all" ON public.escolas FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "escolas_update_all" ON public.escolas;
CREATE POLICY "escolas_update_all" ON public.escolas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "escolas_delete_all" ON public.escolas;
CREATE POLICY "escolas_delete_all" ON public.escolas FOR DELETE TO anon, authenticated USING (true);

-- Políticas para USUARIOS
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
CREATE POLICY "usuarios_select_policy" ON public.usuarios FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
CREATE POLICY "usuarios_insert_policy" ON public.usuarios FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
CREATE POLICY "usuarios_update_policy" ON public.usuarios FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;
CREATE POLICY "usuarios_delete_policy" ON public.usuarios FOR DELETE TO anon, authenticated USING (true);

-- Políticas para DISCIPLINAS
DROP POLICY IF EXISTS "disciplinas_select_all" ON public.disciplinas;
CREATE POLICY "disciplinas_select_all" ON public.disciplinas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "disciplinas_insert_all" ON public.disciplinas;
CREATE POLICY "disciplinas_insert_all" ON public.disciplinas FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "disciplinas_update_all" ON public.disciplinas;
CREATE POLICY "disciplinas_update_all" ON public.disciplinas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "disciplinas_delete_all" ON public.disciplinas;
CREATE POLICY "disciplinas_delete_all" ON public.disciplinas FOR DELETE TO anon, authenticated USING (true);

-- Políticas para TURMAS
DROP POLICY IF EXISTS "turmas_select_all" ON public.turmas;
CREATE POLICY "turmas_select_all" ON public.turmas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "turmas_insert_all" ON public.turmas;
CREATE POLICY "turmas_insert_all" ON public.turmas FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "turmas_update_all" ON public.turmas;
CREATE POLICY "turmas_update_all" ON public.turmas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "turmas_delete_all" ON public.turmas;
CREATE POLICY "turmas_delete_all" ON public.turmas FOR DELETE TO anon, authenticated USING (true);

-- Políticas para PROFESSORES
DROP POLICY IF EXISTS "professores_select_all" ON public.professores;
CREATE POLICY "professores_select_all" ON public.professores FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "professores_insert_all" ON public.professores;
CREATE POLICY "professores_insert_all" ON public.professores FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "professores_update_all" ON public.professores;
CREATE POLICY "professores_update_all" ON public.professores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "professores_delete_all" ON public.professores;
CREATE POLICY "professores_delete_all" ON public.professores FOR DELETE TO anon, authenticated USING (true);

-- =============================================================================
-- 9. SEED INICIAL: Cadastra uma Escola Padrão caso não exista nenhuma
-- =============================================================================
INSERT INTO public.escolas (id, nome, subtitulo, cnpj_ou_inep, modelo_ensino, plano_badge)
SELECT 
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Colégio Modelo EvoTime',
    'Ensino Fundamental e Médio',
    '12.345.678/0001-90',
    'Ensino Fundamental e Médio',
    'Plano Enterprise'
WHERE NOT EXISTS (SELECT 1 FROM public.escolas LIMIT 1);
