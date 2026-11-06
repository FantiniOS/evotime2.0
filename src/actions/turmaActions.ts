"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface TurmaItem {
  id: string;
  escola_id?: string;
  nome: string;
  turno: "Matutino" | "Vespertino" | "Noturno" | "Integral";
  matriz_curricular?: any[];
  created_at?: string;
}

/**
 * Server Action: listarTurmas
 * Busca as turmas cadastradas com blindagem de fallbacks e log de erros detalhado.
 */
export async function listarTurmas(): Promise<{
  success: boolean;
  data: TurmaItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("turmas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro no Supabase ao listar turmas:", error);
      return { success: false, data: [] };
    }

    // Fallback seguro: garante array vazio caso data venha nulo/indefinido
    const listaTurmas: TurmaItem[] = (data || []).map((row: any) => ({
      id: row.id,
      escola_id: row.escola_id,
      nome: row.nome || "Turma sem nome",
      turno: row.turno || "Matutino",
      matriz_curricular: Array.isArray(row.matriz_curricular)
        ? row.matriz_curricular
        : [],
      created_at: row.created_at,
    }));

    return {
      success: true,
      data: listaTurmas,
    };
  } catch (err) {
    console.error("Exceção na Server Action listarTurmas:", err);
    return {
      success: false,
      data: [],
      error:
        err instanceof Error ? err.message : "Erro inesperado ao buscar turmas.",
    };
  }
}

/**
 * Server Action: salvarTurma
 */
export async function salvarTurma(payload: {
  id?: string;
  nome: string;
  turno: "Matutino" | "Vespertino" | "Noturno" | "Integral";
  matriz_curricular: any[];
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
      turno: payload.turno,
      matriz_curricular: payload.matriz_curricular || [],
      escola_id: escolaIdFinal,
    };

    let result;
    if (payload.id && !payload.id.startsWith("cls-")) {
      result = await supabase
        .from("turmas")
        .update(dbPayload)
        .eq("id", payload.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("turmas")
        .insert(dbPayload)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Erro no Supabase ao salvar turma:", result.error);
      return { success: false, error: result.error.message };
    }

    revalidatePath("/turmas");
    revalidatePath("/grade");
    revalidatePath("/dashboard");

    return { success: true, data: result.data };
  } catch (err) {
    console.error("Exceção na Server Action salvarTurma:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao salvar turma.",
    };
  }
}

/**
 * Server Action: excluirTurma
 */
export async function excluirTurma(
  turmaId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("turmas").delete().eq("id", turmaId);

    if (error) {
      console.error("Erro no Supabase ao excluir turma:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/turmas");
    revalidatePath("/grade");
    return { success: true };
  } catch (err) {
    console.error("Exceção na Server Action excluirTurma:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir turma.",
    };
  }
}
