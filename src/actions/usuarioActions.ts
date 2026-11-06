"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "O nome deve ter no mínimo 2 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "O e-mail é obrigatório.")
    .email("Informe um e-mail válido."),
  senha: z
    .string()
    .min(6, "A senha provisória deve ter no mínimo 6 caracteres.")
    .max(128, "Senha muito longa."),
  role: z.enum(["admin", "coordenador", "diretor", "professor"] as const),
  escolaId: z.string().optional().nullable(),
});

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
  email: string;
  role: "admin" | "coordenador" | "diretor" | "professor";
  escola_id: string | null;
  escola_nome?: string | null;
  created_at: string;
}

/**
 * Server Action: criarUsuario
 * Utiliza a SUPABASE_SERVICE_ROLE_KEY para criar a conta no Supabase Auth (auth.admin.createUser)
 * sem interferir na sessão do usuário atual, e cadastra o registro na tabela `usuarios`.
 */
export async function criarUsuario(
  formData: FormData
): Promise<CriarUsuarioResult> {
  try {
    const rawData = {
      nome: formData.get("nome")?.toString()?.trim() || "",
      email: formData.get("email")?.toString()?.trim() || "",
      senha: formData.get("senha")?.toString()?.trim() || "",
      role: (formData.get("role")?.toString()?.trim() || "coordenador") as any,
      escolaId: formData.get("escolaId")?.toString()?.trim() || null,
    };

    const parsed = criarUsuarioSchema.safeParse(rawData);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(flattened)[0]?.[0];
      return {
        success: false,
        error: firstError || "Preencha todos os campos corretamente.",
        fieldErrors: flattened,
      };
    }

    const { nome, email, senha, role, escolaId } = parsed.data;

    // 1. Instancia o cliente administrativo (Admin Client)
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (clientErr) {
      return {
        success: false,
        error:
          clientErr instanceof Error
            ? clientErr.message
            : "Chave SUPABASE_SERVICE_ROLE_KEY ausente.",
      };
    }

    // 2. Cria o usuário no Supabase Auth via auth.admin.createUser
    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome,
          role,
        },
      });

    if (authError) {
      console.error("[criarUsuario] Erro ao criar no Supabase Auth:", authError);
      return {
        success: false,
        error:
          authError.message === "Email address already registered"
            ? "Este endereço de e-mail já está cadastrado no sistema."
            : authError.message,
      };
    }

    if (!authUser?.user?.id) {
      return {
        success: false,
        error: "Não foi possível obter o identificador do novo usuário.",
      };
    }

    // 3. Insere os dados na tabela public.usuarios
    const { data: dbData, error: dbError } = await adminClient
      .from("usuarios")
      .insert({
        id: authUser.user.id,
        nome,
        email,
        role,
        escola_id: escolaId && escolaId.length > 5 ? escolaId : null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[criarUsuario] Erro ao gravar na tabela usuarios:", dbError);
      // Se a tabela ainda não tiver sido criada pelo script SQL:
      if (dbError.code === "PGRST205" || dbError.message.includes("does not exist")) {
        return {
          success: true,
          message:
            "Usuário convidado com sucesso no Supabase Auth! (Lembre-se de rodar o script database/usuarios_schema.sql no painel)",
          data: {
            id: authUser.user.id,
            nome,
            email,
            role,
          },
        };
      }
      return {
        success: false,
        error: `Usuário criado no Auth, mas falhou ao gravar na tabela: ${dbError.message}`,
      };
    }

    revalidatePath("/usuarios");

    return {
      success: true,
      message: "Usuário convidado com sucesso",
      data: dbData,
    };
  } catch (err) {
    console.error("[criarUsuario] Exceção:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro inesperado ao criar usuário.",
    };
  }
}

/**
 * Server Action: listarUsuarios
 * Retorna todos os usuários cadastrados na tabela `usuarios`.
 */
export async function listarUsuarios(): Promise<{
  success: boolean;
  data: UsuarioItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Tenta buscar na tabela public.usuarios com join na tabela escolas
    const { data, error } = await supabase
      .from("usuarios")
      .select(`
        id,
        nome,
        email,
        role,
        escola_id,
        created_at,
        escolas:escola_id (
          nome
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[listarUsuarios] Aviso ao consultar usuarios:", error.message);

      // Tenta fallback com adminClient se a chave estiver configurada
      try {
        const admin = createAdminClient();
        const { data: authList, error: authListError } =
          await admin.auth.admin.listUsers();
        if (!authListError && authList?.users) {
          const mapped: UsuarioItem[] = authList.users.map((u) => ({
            id: u.id,
            nome: (u.user_metadata?.nome as string) || u.email?.split("@")[0] || "Membro da Equipe",
            email: u.email || "",
            role: (u.user_metadata?.role as any) || "coordenador",
            escola_id: null,
            escola_nome: "Acesso Global",
            created_at: u.created_at,
          }));
          return { success: true, data: mapped };
        }
      } catch {
        // Ignora e retorna lista vazia
      }

      return { success: false, data: [] };
    }

    const mapped: UsuarioItem[] = (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      role: row.role,
      escola_id: row.escola_id,
      escola_nome: row.escolas?.nome || (row.escola_id ? "Escola Vinculada" : "Acesso Global"),
      created_at: row.created_at,
    }));

    return { success: true, data: mapped };
  } catch (err) {
    console.error("[listarUsuarios] Exceção:", err);
    return { success: false, data: [] };
  }
}

/**
 * Server Action: excluirUsuario
 * Remove o usuário da tabela `usuarios` e do Supabase Auth.
 */
export async function excluirUsuario(usuarioId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // 1. Deleta do Supabase Auth (a cascade deleta da tabela se a FK estiver ativa)
    const { error: authErr } = await admin.auth.admin.deleteUser(usuarioId);
    if (authErr) {
      console.warn("[excluirUsuario] Aviso Auth:", authErr.message);
    }

    // 2. Garante exclusão da tabela
    await admin.from("usuarios").delete().eq("id", usuarioId);

    revalidatePath("/usuarios");
    return { success: true, message: "Usuário removido com sucesso." };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao excluir o usuário.",
    };
  }
}
