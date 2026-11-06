"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface ProfessorItem {
  id: string;
  escola_id?: string;
  nome: string;
  vinculos?: any[];
  indisponibilidades?: any[];
  regras?: Record<string, any>;
  created_at?: string;
}

/**
 * Server Action: listarProfessores
 * Retorna os docentes cadastrados no Supabase com fallbacks seguros e log de erro.
 */
export async function listarProfessores(): Promise<{
  success: boolean;
  data: ProfessorItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("professores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro no Supabase ao listar professores:", error);
      return { success: false, data: [] };
    }

    const listaProfessores: ProfessorItem[] = (data || []).map((row: any) => ({
      id: row.id,
      escola_id: row.escola_id,
      nome: row.nome || "Professor",
      vinculos: Array.isArray(row.vinculos) ? row.vinculos : [],
      indisponibilidades: Array.isArray(row.indisponibilidades)
        ? row.indisponibilidades
        : [],
      regras: row.regras || {},
      created_at: row.created_at,
    }));

    return {
      success: true,
      data: listaProfessores,
    };
  } catch (err) {
    console.error("Exceção na Server Action listarProfessores:", err);
    return {
      success: false,
      data: [],
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao buscar professores.",
    };
  }
}

/**
 * Server Action: salvarProfessor
 */
export async function salvarProfessor(payload: {
  id?: string;
  nome: string;
  vinculos: any[];
  indisponibilidades: any[];
  regras?: Record<string, any>;
  escola_id?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();

    let escolaIdFinal = payload.escola_id;
    if (!escolaIdFinal) {
      const { data: escolaPadrao } = await supabase
        .from("escolas")
        .select("id")
        .limit(1)
        .single();
      escolaIdFinal =
        escolaPadrao?.id || "a0000000-0000-0000-0000-000000000001";
    }

    const dbPayload = {
      nome: payload.nome.trim(),
      vinculos: payload.vinculos || [],
      indisponibilidades: payload.indisponibilidades || [],
      regras: payload.regras || {},
      escola_id: escolaIdFinal,
    };

    let result;
    if (payload.id && !payload.id.startsWith("prof-")) {
      result = await supabase
        .from("professores")
        .update(dbPayload)
        .eq("id", payload.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("professores")
        .insert(dbPayload)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Erro no Supabase ao salvar professor:", result.error);
      return { success: false, error: result.error.message };
    }

    revalidatePath("/professores");
    revalidatePath("/grade");
    revalidatePath("/dashboard");

    return { success: true, data: result.data };
  } catch (err) {
    console.error("Exceção na Server Action salvarProfessor:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao salvar professor.",
    };
  }
}

/**
 * Server Action: excluirProfessor
 */
export async function excluirProfessor(
  professorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("professores")
      .delete()
      .eq("id", professorId);

    if (error) {
      console.error("Erro no Supabase ao excluir professor:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/professores");
    revalidatePath("/grade");
    return { success: true };
  } catch (err) {
    console.error("Exceção na Server Action excluirProfessor:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir professor.",
    };
  }
}
