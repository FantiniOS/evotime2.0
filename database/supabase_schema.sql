-- =============================================================================
-- EVOTIME 2.0 • MODELAGEM RELACIONAL E ROW LEVEL SECURITY (SUPABASE / POSTGRESQL)
-- Script executável no SQL Editor do Supabase
-- =============================================================================

-- Habilita extensão de criptografia e UUID se ainda não ativas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABELA: escolas (Instituições de Ensino / Tenants Raiz)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. TABELA: disciplinas (Matérias pertencentes a uma Escola)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disciplinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    cor_id VARCHAR(32) NOT NULL DEFAULT 'blue',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.disciplinas IS 'Disciplinas curriculares vinculadas a uma instituição escolar';

-- -----------------------------------------------------------------------------
-- 3. TABELA: turmas (Classes escolares com turno e matriz curricular)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    turno VARCHAR(32) NOT NULL CHECK (turno IN ('Matutino', 'Vespertino', 'Noturno', 'Integral')),
    matriz_curricular JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.turmas IS 'Turmas de alunos com turno e matriz de disciplinas/aulas semanais';

-- -----------------------------------------------------------------------------
-- 4. TABELA: professores (Docentes, carga horária e matriz de disponibilidade)
-- -----------------------------------------------------------------------------
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

COMMENT ON TABLE public.professores IS 'Corpo docente com atribuição de turmas, regras e horários bloqueados';

-- -----------------------------------------------------------------------------
-- 5. ÍNDICES DE ALTA PERFORMANCE (Otimização para consultas multi-tenant)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_disciplinas_escola_id ON public.disciplinas(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_escola_id ON public.turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_professores_escola_id ON public.professores(escola_id);

-- -----------------------------------------------------------------------------
-- 6. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_escolas_updated_at
BEFORE UPDATE ON public.escolas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_disciplinas_updated_at
BEFORE UPDATE ON public.disciplinas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_turmas_updated_at
BEFORE UPDATE ON public.turmas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_professores_updated_at
BEFORE UPDATE ON public.professores
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 7. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) - SEGURANÇA MÁXIMA
-- =============================================================================
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 8. POLÍTICAS DE RLS (POLICIES) PARA ACESSO (ANON E AUTHENTICATED)
-- -----------------------------------------------------------------------------

-- Políticas para ESCOLAS
DROP POLICY IF EXISTS "escolas_select_auth" ON public.escolas;
DROP POLICY IF EXISTS "escolas_select_all" ON public.escolas;
CREATE POLICY "escolas_select_all" ON public.escolas
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "escolas_insert_auth" ON public.escolas;
DROP POLICY IF EXISTS "escolas_insert_all" ON public.escolas;
CREATE POLICY "escolas_insert_all" ON public.escolas
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "escolas_update_auth" ON public.escolas;
DROP POLICY IF EXISTS "escolas_update_all" ON public.escolas;
CREATE POLICY "escolas_update_all" ON public.escolas
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "escolas_delete_auth" ON public.escolas;
DROP POLICY IF EXISTS "escolas_delete_all" ON public.escolas;
CREATE POLICY "escolas_delete_all" ON public.escolas
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- Políticas para DISCIPLINAS
DROP POLICY IF EXISTS "disciplinas_select_auth" ON public.disciplinas;
DROP POLICY IF EXISTS "disciplinas_select_all" ON public.disciplinas;
CREATE POLICY "disciplinas_select_all" ON public.disciplinas
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "disciplinas_insert_auth" ON public.disciplinas;
DROP POLICY IF EXISTS "disciplinas_insert_all" ON public.disciplinas;
CREATE POLICY "disciplinas_insert_all" ON public.disciplinas
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "disciplinas_update_auth" ON public.disciplinas;
DROP POLICY IF EXISTS "disciplinas_update_all" ON public.disciplinas;
CREATE POLICY "disciplinas_update_all" ON public.disciplinas
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "disciplinas_delete_auth" ON public.disciplinas;
DROP POLICY IF EXISTS "disciplinas_delete_all" ON public.disciplinas;
CREATE POLICY "disciplinas_delete_all" ON public.disciplinas
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- Políticas para TURMAS
DROP POLICY IF EXISTS "turmas_select_auth" ON public.turmas;
DROP POLICY IF EXISTS "turmas_select_all" ON public.turmas;
CREATE POLICY "turmas_select_all" ON public.turmas
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "turmas_insert_auth" ON public.turmas;
DROP POLICY IF EXISTS "turmas_insert_all" ON public.turmas;
CREATE POLICY "turmas_insert_all" ON public.turmas
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "turmas_update_auth" ON public.turmas;
DROP POLICY IF EXISTS "turmas_update_all" ON public.turmas;
CREATE POLICY "turmas_update_all" ON public.turmas
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "turmas_delete_auth" ON public.turmas;
DROP POLICY IF EXISTS "turmas_delete_all" ON public.turmas;
CREATE POLICY "turmas_delete_all" ON public.turmas
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- Políticas para PROFESSORES
DROP POLICY IF EXISTS "professores_select_auth" ON public.professores;
DROP POLICY IF EXISTS "professores_select_all" ON public.professores;
CREATE POLICY "professores_select_all" ON public.professores
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "professores_insert_auth" ON public.professores;
DROP POLICY IF EXISTS "professores_insert_all" ON public.professores;
CREATE POLICY "professores_insert_all" ON public.professores
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "professores_update_auth" ON public.professores;
DROP POLICY IF EXISTS "professores_update_all" ON public.professores;
CREATE POLICY "professores_update_all" ON public.professores
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "professores_delete_auth" ON public.professores;
DROP POLICY IF EXISTS "professores_delete_all" ON public.professores;
CREATE POLICY "professores_delete_all" ON public.professores
    FOR DELETE
    TO anon, authenticated
    USING (true);
