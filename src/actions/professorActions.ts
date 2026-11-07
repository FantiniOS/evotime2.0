"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ProfessorItem } from "@/types/actions";

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
      console.error("Erro Action listarProfessores (Supabase):", error);
      return { success: false, data: [] };
    }

    const listaProfessores: ProfessorItem[] = (data || []).map((row: any) => ({
      id: String(row.id),
      escola_id: row.escola_id ? String(row.escola_id) : undefined,
      nome: String(row.nome || "Professor"),
      vinculos: Array.isArray(row.vinculos) ? row.vinculos : [],
      indisponibilidades: Array.isArray(row.indisponibilidades)
        ? row.indisponibilidades
        : [],
      regras: row.regras || {},
      created_at: row.created_at ? String(row.created_at) : undefined,
    }));

    return {
      success: true,
      data: listaProfessores,
    };
  } catch (err) {
    console.error("Erro Action listarProfessores:", err);
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
 * Recebe objeto limpo serializável (Client-to-Server) e grava no Supabase com blindagem try/catch.
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
    if (!payload || !payload.nome?.trim()) {
      return { success: false, error: "Nome do professor é obrigatório." };
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
      vinculos: Array.isArray(payload.vinculos) ? payload.vinculos : [],
      indisponibilidades: Array.isArray(payload.indisponibilidades)
        ? payload.indisponibilidades
        : [],
      regras: payload.regras || {},
    };
    if (escolaIdFinal) {
      dbPayload.escola_id = escolaIdFinal;
    }

    let result;
    if (payload.id && !payload.id.startsWith("prof-")) {
      result = await supabase
        .from("professores")
        .update(dbPayload)
        .eq("id", payload.id)
        .select()
        .maybeSingle();
    } else {
      result = await supabase
        .from("professores")
        .insert(dbPayload)
        .select()
        .maybeSingle();
    }

    // Se falhar devido à FK ou coluna escola_id, tenta novamente sem ela
    if (result.error && dbPayload.escola_id) {
      console.warn("Aviso ao salvar professor com escola_id, tentando fallback sem escola_id:", result.error.message);
      delete dbPayload.escola_id;
      if (payload.id && !payload.id.startsWith("prof-")) {
        result = await supabase
          .from("professores")
          .update(dbPayload)
          .eq("id", payload.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase
          .from("professores")
          .insert(dbPayload)
          .select()
          .maybeSingle();
      }
    }

    if (result.error) {
      console.error("Erro Action salvarProfessor (Supabase):", result.error);
      return { success: false, error: result.error.message };
    }

    revalidatePath("/professores");
    revalidatePath("/grade");
    revalidatePath("/dashboard");

    return { success: true, data: result.data };
  } catch (err) {
    console.error("Erro Action salvarProfessor:", err);
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
    if (!professorId) {
      return { success: false, error: "ID do professor não informado." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("professores")
      .delete()
      .eq("id", professorId);

    if (error) {
      console.error("Erro Action excluirProfessor (Supabase):", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/professores");
    revalidatePath("/grade");
    return { success: true };
  } catch (err) {
    console.error("Erro Action excluirProfessor:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir professor.",
    };
  }
}
