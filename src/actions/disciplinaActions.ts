"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface DisciplinaItem {
  id: string;
  escola_id?: string;
  nome: string;
  codigo: string;
  cor_id: string;
  created_at?: string;
}

/**
 * Server Action: listarDisciplinas
 * Retorna as disciplinas cadastradas com proteção de optional chaining e fallbacks.
 */
export async function listarDisciplinas(): Promise<{
  success: boolean;
  data: DisciplinaItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("disciplinas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro no Supabase ao listar disciplinas:", error);
      return { success: false, data: [] };
    }

    const listaDisciplinas: DisciplinaItem[] = (data || []).map((row: any) => ({
      id: row.id,
      escola_id: row.escola_id,
      nome: row.nome || "Disciplina sem nome",
      codigo: row.codigo || "",
      cor_id: row.cor_id || "blue",
      created_at: row.created_at,
    }));

    return {
      success: true,
      data: listaDisciplinas,
    };
  } catch (err) {
    console.error("Exceção na Server Action listarDisciplinas:", err);
    return {
      success: false,
      data: [],
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao buscar disciplinas.",
    };
  }
}

/**
 * Server Action: salvarDisciplina
 */
export async function salvarDisciplina(payload: {
  id?: string;
  nome: string;
  codigo: string;
  cor_id: string;
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
      codigo: payload.codigo.trim().toUpperCase(),
      cor_id: payload.cor_id || "blue",
      escola_id: escolaIdFinal,
    };

    let result;
    if (payload.id && !payload.id.startsWith("sub-")) {
      result = await supabase
        .from("disciplinas")
        .update(dbPayload)
        .eq("id", payload.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("disciplinas")
        .insert(dbPayload)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Erro no Supabase ao salvar disciplina:", result.error);
      return { success: false, error: result.error.message };
    }

    revalidatePath("/disciplinas");
    revalidatePath("/turmas");
    revalidatePath("/grade");

    return { success: true, data: result.data };
  } catch (err) {
    console.error("Exceção na Server Action salvarDisciplina:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao salvar disciplina.",
    };
  }
}

/**
 * Server Action: excluirDisciplina
 */
export async function excluirDisciplina(
  disciplinaId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("disciplinas")
      .delete()
      .eq("id", disciplinaId);

    if (error) {
      console.error("Erro no Supabase ao excluir disciplina:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/disciplinas");
    revalidatePath("/turmas");
    revalidatePath("/grade");
    return { success: true };
  } catch (err) {
    console.error("Exceção na Server Action excluirDisciplina:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir disciplina.",
    };
  }
}
