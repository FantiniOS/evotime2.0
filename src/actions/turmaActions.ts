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
      console.error("Erro Action listarTurmas (Supabase):", error);
      return { success: false, data: [] };
    }

    const listaTurmas: TurmaItem[] = (data || []).map((row: any) => ({
      id: String(row.id),
      escola_id: row.escola_id ? String(row.escola_id) : undefined,
      nome: String(row.nome || "Turma sem nome"),
      turno: (row.turno || "Matutino") as any,
      matriz_curricular: Array.isArray(row.matriz_curricular)
        ? row.matriz_curricular
        : [],
      created_at: row.created_at ? String(row.created_at) : undefined,
    }));

    return {
      success: true,
      data: listaTurmas,
    };
  } catch (err) {
    console.error("Erro Action listarTurmas:", err);
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
 * Recebe objeto limpo serializável (Client-to-Server) e grava no Supabase com blindagem try/catch.
 */
export async function salvarTurma(payload: {
  id?: string;
  nome: string;
  turno: "Matutino" | "Vespertino" | "Noturno" | "Integral";
  matriz_curricular: any[];
  escola_id?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!payload || !payload.nome?.trim()) {
      return { success: false, error: "Nome da turma é obrigatório." };
    }

    const supabase = await createClient();

    let escolaIdFinal: string | null = payload.escola_id || null;
    if (!escolaIdFinal) {
      try {
        const { data: escolas } = await supabase
          .from("escolas")
          .select("id")
          .limit(1);
        if (escolas && escolas.length > 0) {
          escolaIdFinal = String(escolas[0].id);
        }
      } catch {
        escolaIdFinal = null;
      }
    }

    const dbPayload: any = {
      nome: payload.nome.trim(),
      turno: payload.turno || "Matutino",
      matriz_curricular: Array.isArray(payload.matriz_curricular)
        ? payload.matriz_curricular
        : [],
    };
    if (escolaIdFinal) {
      dbPayload.escola_id = escolaIdFinal;
    }

    let result;
    if (payload.id && !payload.id.startsWith("cls-") && !payload.id.startsWith("turma-")) {
      result = await supabase
        .from("turmas")
        .update(dbPayload)
        .eq("id", payload.id)
        .select()
        .maybeSingle();
    } else {
      result = await supabase
        .from("turmas")
        .insert(dbPayload)
        .select()
        .maybeSingle();
    }

    // Se falhar devido à FK ou coluna escola_id, tenta novamente sem ela
    if (result.error && dbPayload.escola_id) {
      console.warn("Aviso ao salvar turma com escola_id, tentando fallback sem escola_id:", result.error.message);
      delete dbPayload.escola_id;
      if (payload.id && !payload.id.startsWith("cls-") && !payload.id.startsWith("turma-")) {
        result = await supabase
          .from("turmas")
          .update(dbPayload)
          .eq("id", payload.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase
          .from("turmas")
          .insert(dbPayload)
          .select()
          .maybeSingle();
      }
    }

    if (result.error) {
      console.error("Erro Action salvarTurma (Supabase):", result.error);
      return { success: false, error: result.error.message };
    }

    revalidatePath("/turmas");
    revalidatePath("/grade");
    revalidatePath("/dashboard");

    return { success: true, data: result.data };
  } catch (err) {
    console.error("Erro Action salvarTurma:", err);
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
    if (!turmaId) {
      return { success: false, error: "ID da turma não informado." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("turmas").delete().eq("id", turmaId);

    if (error) {
      console.error("Erro Action excluirTurma (Supabase):", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/turmas");
    revalidatePath("/grade");
    return { success: true };
  } catch (err) {
    console.error("Erro Action excluirTurma:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir turma.",
    };
  }
}
