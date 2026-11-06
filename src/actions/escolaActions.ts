"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface CriarEscolaResponse {
  success: boolean;
  data?: any;
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

    // Revalidação de Cache no servidor Next.js
    revalidatePath("/escolas");

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
