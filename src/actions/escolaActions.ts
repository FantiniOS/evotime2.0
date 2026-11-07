"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  criarEscolaSchema,
  salvarConfiguracoesEscolaSchema,
} from "@/lib/validations/escolaSchema";
import type {
  CriarEscolaResponse,
  ListarEscolasResponse,
} from "@/types/actions";

/**
 * Server Action: criarEscola
 * Insere uma nova instituição de ensino na tabela `escolas` do Supabase.
 * O CNPJ é estritamente opcional: se vier vazio ("") ou nulo, é gravado como `null`.
 */
export async function criarEscola(
  formData: FormData
): Promise<CriarEscolaResponse> {
  try {
    const rawData = {
      nome: formData.get("nome")?.toString()?.trim() || "",
      cnpj:
        formData.get("cnpj")?.toString()?.trim() ||
        formData.get("cnpj_ou_inep")?.toString()?.trim() ||
        null,
      modelo_ensino:
        formData.get("modelo_ensino")?.toString()?.trim() ||
        "Ensino Fundamental e Médio",
      logo_data_url:
        formData.get("logo_data_url")?.toString()?.trim() || null,
    };

    const parsed = criarEscolaSchema.safeParse(rawData);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(flattened)[0]?.[0];
      return {
        success: false,
        error: firstError || "Verifique os dados informados.",
        fieldErrors: flattened,
      };
    }

    const { nome, cnpj, modelo_ensino, logo_data_url } = parsed.data;

    // Converte string vazia para null explicitamente
    const cnpjFinal = cnpj && cnpj.trim().length > 0 ? cnpj.trim() : null;

    const supabase = await createClient();

    let insertPayload: any = {
      nome,
      cnpj_ou_inep: cnpjFinal,
      subtitulo: modelo_ensino || "Ensino Fundamental e Médio",
      modelo_ensino: modelo_ensino || "Ensino Fundamental e Médio",
      logo_data_url: logo_data_url || null,
      bloquear_aulas_geminadas:
        parsed.data.bloquear_aulas_geminadas !== undefined
          ? parsed.data.bloquear_aulas_geminadas
          : true,
    };

    let { data, error } = await supabase
      .from("escolas")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback defensivo caso a coluna tenha o nome 'cnpj' em vez de 'cnpj_ou_inep'
    if (error && error.message.includes("cnpj_ou_inep")) {
      delete insertPayload.cnpj_ou_inep;
      insertPayload.cnpj = cnpjFinal;
      const retryResult = await supabase
        .from("escolas")
        .insert(insertPayload)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("Erro ao inserir escola no Supabase:", error);
      return {
        success: false,
        error: error.message || "Falha ao gravar no Supabase.",
      };
    }

    // Define a recém-criada como escola ativa
    if (data?.id) {
      const cookieStore = await cookies();
      cookieStore.set("escola_ativa_id", data.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }

    // Revalidação de Cache no servidor Next.js
    revalidatePath("/escolas");
    revalidatePath("/dashboard");

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error("Erro Action criarEscola:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao cadastrar a instituição.",
    };
  }
}

/**
 * Server Action: listarEscolas
 * Busca todas as instituições de ensino cadastradas no Supabase.
 */
export async function listarEscolas(): Promise<ListarEscolasResponse> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("escolas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro no Supabase ao listar escolas:", error);
      return { success: false, data: [] };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error("Erro Action listarEscolas:", err);
    return {
      success: false,
      data: [],
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao consultar escolas.",
    };
  }
}

/**
 * Server Action: selecionarEscolaAtiva
 * Grava o ID da instituição ativa no cookie `escola_ativa_id`.
 */
export async function selecionarEscolaAtiva(
  escolaId: string
): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set("escola_ativa_id", escolaId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/turmas");
    revalidatePath("/disciplinas");
    revalidatePath("/professores");
    revalidatePath("/grade");

    return { success: true };
  } catch (err) {
    console.error("Erro ao selecionar escola ativa:", err);
    return { success: false };
  }
}

/**
 * Server Action: obterEscolaAtivaId
 * Recupera o ID da escola ativa armazenado no Cookie do servidor.
 */
export async function obterEscolaAtivaId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("escola_ativa_id")?.value || null;
  } catch {
    return null;
  }
}

/**
 * Server Action: salvarConfiguracoesEscola
 * Atualiza os parâmetros institucionais e a Hard Constraint de bloqueio de aulas geminadas no Supabase.
 */
export async function salvarConfiguracoesEscola(payload: {
  escolaId: string;
  nome?: string;
  cnpj?: string | null;
  bloquear_aulas_geminadas?: boolean;
  configuracoes_ia?: Record<string, any>;
  turnos?: Record<string, any>;
}): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const parsed = salvarConfiguracoesEscolaSchema.safeParse(payload);
    if (!parsed.success) {
      const firstError = Object.values(
        parsed.error.flatten().fieldErrors
      )[0]?.[0];
      return {
        success: false,
        error: firstError || "Configurações inválidas.",
      };
    }

    const { escolaId, nome, cnpj, bloquear_aulas_geminadas } = parsed.data;

    const supabase = await createClient();

    let updatePayload: any = {
      bloquear_aulas_geminadas:
        bloquear_aulas_geminadas !== undefined
          ? bloquear_aulas_geminadas
          : true,
    };

    if (nome && nome.trim().length > 0) {
      updatePayload.nome = nome.trim();
    }
    if (cnpj !== undefined) {
      updatePayload.cnpj_ou_inep =
        cnpj && cnpj.trim().length > 0 ? cnpj.trim() : null;
    }

    let { data, error } = await supabase
      .from("escolas")
      .update(updatePayload)
      .eq("id", escolaId)
      .select()
      .single();

    // Fallback defensivo caso a coluna bloquear_aulas_geminadas ainda não tenha sido criada no banco
    if (error && error.message.includes("bloquear_aulas_geminadas")) {
      delete updatePayload.bloquear_aulas_geminadas;
      const retry = await supabase
        .from("escolas")
        .update(updatePayload)
        .eq("id", escolaId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[salvarConfiguracoesEscola] Erro Supabase:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/configuracoes");
    revalidatePath("/escolas");
    revalidatePath("/dashboard");
    revalidatePath("/grade");

    return { success: true, data };
  } catch (err) {
    console.error("Erro Action salvarConfiguracoesEscola:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao salvar configurações.",
    };
  }
}
