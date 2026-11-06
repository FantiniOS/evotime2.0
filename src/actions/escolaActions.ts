"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export interface CriarEscolaResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ListarEscolasResponse {
  success: boolean;
  data: any[];
  error?: string;
}

/**
 * Server Action: criarEscola
 * Insere uma nova instituição de ensino na tabela `escolas` do Supabase
 * e revalida o cache da rota `/escolas`.
 */
export async function criarEscola(
  formData: FormData
): Promise<CriarEscolaResponse> {
  try {
    const nome = formData.get("nome")?.toString()?.trim();
    const cnpj =
      formData.get("cnpj")?.toString()?.trim() ||
      formData.get("cnpj_ou_inep")?.toString()?.trim() ||
      "";
    const modeloEnsino =
      formData.get("modelo_ensino")?.toString()?.trim() ||
      "Ensino Fundamental e Médio";
    const logoDataUrl =
      formData.get("logo_data_url")?.toString()?.trim() || null;

    if (!nome) {
      return {
        success: false,
        error: "O nome da instituição é obrigatório.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("escolas")
      .insert({
        nome,
        cnpj_ou_inep: cnpj,
        subtitulo: modeloEnsino,
        modelo_ensino: modeloEnsino,
        logo_data_url: logoDataUrl,
      })
      .select()
      .single();

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
    console.error("Exceção na Server Action criarEscola:", err);
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
      console.warn("[listarEscolas] Aviso Supabase:", error.message);
      return { success: false, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.warn("[listarEscolas] Exceção:", err);
    return { success: false, data: [] };
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
