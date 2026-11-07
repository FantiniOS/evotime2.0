import type { UserRole } from "@/lib/security/tenantAuth";

/**
 * Tipos compartilhados das Server Actions.
 * Sem diretiva "use server": arquivos "use server" devem exportar
 * EXCLUSIVAMENTE funções assíncronas.
 */

// ---------- Auth ----------
export interface LoginActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: {
    username?: string[];
    password?: string[];
  };
  sessionContext?: {
    username: string;
    email: string;
    schoolId?: string;
    role: UserRole;
  };
}

// ---------- Tenant ----------
export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  enforcedSchoolId?: string;
}

// ---------- Escolas ----------
export interface CriarEscolaResponse {
  success: boolean;
  data?: any;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface ListarEscolasResponse {
  success: boolean;
  data: any[];
  error?: string;
}

// ---------- Disciplinas ----------
export interface DisciplinaItem {
  id: string;
  escola_id?: string;
  nome: string;
  codigo: string;
  cor_id: string;
  created_at?: string;
}

// ---------- Professores ----------
export interface ProfessorItem {
  id: string;
  escola_id?: string;
  nome: string;
  vinculos?: any[];
  indisponibilidades?: any[];
  regras?: Record<string, any>;
  created_at?: string;
}

// ---------- Turmas ----------
export interface TurmaItem {
  id: string;
  escola_id?: string;
  nome: string;
  turno: "Matutino" | "Vespertino" | "Noturno" | "Integral";
  matriz_curricular?: any[];
  created_at?: string;
}

// ---------- Usuários ----------
export type CriarUsuarioInput =
  | FormData
  | {
      nome: string;
      username: string;
      senha: string;
      role: "admin" | "coordenador" | "diretor" | "professor";
      escolaId?: string | null;
    };

export interface CriarUsuarioResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: any;
}

export interface UsuarioItem {
  id: string;
  nome: string;
  username: string;
  email: string;
  role: "admin" | "coordenador" | "diretor" | "professor";
  escola_id: string | null;
  escola_nome?: string | null;
  created_at: string;
}
