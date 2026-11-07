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
      console.error("Erro Action listarDisciplinas (Supabase):", error);
      return { success: false, data: [] };
    }

    const listaDisciplinas: DisciplinaItem[] = (data || []).map((row: any) => ({
      id: String(row.id),
      escola_id: row.escola_id ? String(row.escola_id) : undefined,
      nome: String(row.nome || "Disciplina sem nome"),
      codigo: String(row.codigo || ""),
      cor_id: String(row.cor_id || "blue"),
      created_at: row.created_at ? String(row.created_at) : undefined,
    }));

    return {
      success: true,
      data: listaDisciplinas,
    };
  } catch (err) {
    console.error("Erro Action listarDisciplinas:", err);
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
 * Recebe objeto limpo serializável (Client-to-Server) e grava no Supabase com blindagem try/catch.
 */
export async function salvarDisciplina(payload: {
  id?: string;
  nome: string;
  codigo: string;
  cor_id: string;
  escola_id?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!payload || !payload.nome?.trim()) {
      return { success: false, error: "Nome da disciplina é obrigatório." };
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
      codigo: payload.codigo.trim().toUpperCase(),
      cor_id: payload.cor_id || "blue",
    };
    if (escolaIdFinal) {
      dbPayload.escola_id = escolaIdFinal;
    }

    let result;
    if (payload.id && !payload.id.startsWith("sub-")) {
      result = await supabase
        .from("disciplinas")
        .update(dbPayload)
        .eq("id", payload.id)
        .select()
        .maybeSingle();
    } else {
      result = await supabase
        .from("disciplinas")
        .insert(dbPayload)
        .select()
        .maybeSingle();
    }

    // Se falhar devido à FK ou coluna escola_id, tenta novamente sem ela
    if (result.error && dbPayload.escola_id) {
      console.warn("Aviso ao salvar com escola_id, tentando fallback sem escola_id:", result.error.message);
      delete dbPayload.escola_id;
      if (payload.id && !payload.id.startsWith("sub-")) {
        result = await supabase
          .from("disciplinas")
          .update(dbPayload)
          .eq("id", payload.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase
          .from("disciplinas")
          .insert(dbPayload)
          .select()
          .maybeSingle();
      }
    }

    if (result.error) {
      console.error("Erro Action salvarDisciplina (Supabase):", result.error);
      return { success: false, error: result.error.message };
    }

    revalidatePath("/disciplinas");
    revalidatePath("/turmas");
    revalidatePath("/grade");

    return { success: true, data: result.data };
  } catch (err) {
    console.error("Erro Action salvarDisciplina:", err);
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
    if (!disciplinaId) {
      return { success: false, error: "ID da disciplina não informado." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("disciplinas")
      .delete()
      .eq("id", disciplinaId);

    if (error) {
      console.error("Erro Action excluirDisciplina (Supabase):", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/disciplinas");
    revalidatePath("/turmas");
    revalidatePath("/grade");
    return { success: true };
  } catch (err) {
    console.error("Erro Action excluirDisciplina:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir disciplina.",
    };
  }
}
