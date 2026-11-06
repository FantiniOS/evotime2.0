-- =============================================================================
-- EVOTIME 2.0 • ARQUITETURA MULTI-TENANT & ROW LEVEL SECURITY (PostgreSQL)
-- Regra de Ouro: Isolamento estrito na raiz do banco por school_id
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Função de contexto seguro para obter o school_id injetado pela transação do servidor
-- Lê a variável de sessão configurada pelo backend (SET LOCAL app.current_school_id)
-- ou o claim do JWT (compatível com PostgREST / Supabase).
CREATE OR REPLACE FUNCTION public.current_tenant_school_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_school_id', true), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'school_id'), '')
  );
$$;

-- 2. Tabelas Principais com chave obrigatória school_id
CREATE TABLE IF NOT EXISTS public.disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(10) NOT NULL,
  color_id VARCHAR(32) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  name VARCHAR(120) NOT NULL,
  shift VARCHAR(32) NOT NULL CHECK (shift IN ('Matutino', 'Vespertino', 'Noturno', 'Integral')),
  curriculum JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.professores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  name VARCHAR(160) NOT NULL,
  assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  unavailable_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules JSONB NOT NULL DEFAULT '{"avoidGaps": true, "avoidMoreThanTwoConsecutive": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_conflicts BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices compostos para performance em queries filtradas por school_id
CREATE INDEX IF NOT EXISTS idx_disciplinas_school_id ON public.disciplinas (school_id);
CREATE INDEX IF NOT EXISTS idx_turmas_school_id ON public.turmas (school_id);
CREATE INDEX IF NOT EXISTS idx_professores_school_id ON public.professores (school_id);
CREATE INDEX IF NOT EXISTS idx_grade_school_id ON public.grade (school_id);

-- =============================================================================
-- 3. ATIVAÇÃO DO ROW LEVEL SECURITY (RLS) NAS 4 TABELAS PRINCIPAIS
-- =============================================================================
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores FORCE ROW LEVEL SECURITY;

ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. POLÍTICAS DE ISOLAMENTO ESTRITO (SELECT, INSERT, UPDATE, DELETE)
-- Nenhuma linha pode ser lida, criada, alterada ou removida se school_id
-- divergir do school_id autenticado no token JWT da sessão do servidor.
-- =============================================================================

-- Políticas para DISCIPLINAS
DROP POLICY IF EXISTS disciplinas_tenant_isolation ON public.disciplinas;
CREATE POLICY disciplinas_tenant_isolation ON public.disciplinas
  AS RESTRICTIVE
  FOR ALL
  USING (school_id = public.current_tenant_school_id())
  WITH CHECK (school_id = public.current_tenant_school_id());

-- Políticas para TURMAS
DROP POLICY IF EXISTS turmas_tenant_isolation ON public.turmas;
CREATE POLICY turmas_tenant_isolation ON public.turmas
  AS RESTRICTIVE
  FOR ALL
  USING (school_id = public.current_tenant_school_id())
  WITH CHECK (school_id = public.current_tenant_school_id());

-- Políticas para PROFESSORES
DROP POLICY IF EXISTS professores_tenant_isolation ON public.professores;
CREATE POLICY professores_tenant_isolation ON public.professores
  AS RESTRICTIVE
  FOR ALL
  USING (school_id = public.current_tenant_school_id())
  WITH CHECK (school_id = public.current_tenant_school_id());

-- Políticas para GRADE
DROP POLICY IF EXISTS grade_tenant_isolation ON public.grade;
CREATE POLICY grade_tenant_isolation ON public.grade
  AS RESTRICTIVE
  FOR ALL
  USING (school_id = public.current_tenant_school_id())
  WITH CHECK (school_id = public.current_tenant_school_id());
