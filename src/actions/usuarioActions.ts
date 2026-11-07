"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  usernameToEmail,
  emailToUsername,
  sanitizeUsername,
} from "@/lib/auth/emailMapping";
import type { Database } from "@/types/supabase";

import { criarUsuarioSchema } from "@/lib/validations/usuarioSchema";
import type {
  CriarUsuarioInput,
  CriarUsuarioResult,
  UsuarioItem,
} from "@/types/actions";

/**
 * Server Action: criarUsuario
 * Utiliza OBRIGATORIAMENTE a SUPABASE_SERVICE_ROLE_KEY no servidor (admin client)
 * para criar o usuário no Supabase Auth via auth.admin.createUser
 * e gravar o registro na tabela pública `usuarios`.
 * Não desloga o usuário ativo e trata erros com mensagens claras para o Toast.
 */
export async function criarUsuario(
  input: CriarUsuarioInput
): Promise<CriarUsuarioResult> {
  try {
    let rawData: any;
    if (
      typeof input === "object" &&
      input !== null &&
      "get" in input &&
      typeof (input as any).get === "function"
    ) {
      const fd = input as FormData;
      rawData = {
        nome: fd.get("nome")?.toString()?.trim() || "",
        username: fd.get("username")?.toString()?.trim() || "",
        senha: fd.get("senha")?.toString()?.trim() || "",
        role: (fd.get("role")?.toString()?.trim() || "coordenador") as any,
        escolaId: fd.get("escolaId")?.toString()?.trim() || null,
      };
    } else {
      rawData = input;
    }

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

    const { nome, username, senha, role, escolaId } = parsed.data;
    const cleanUsername = sanitizeUsername(username);
    const generatedEmail = usernameToEmail(cleanUsername);

    // 1. Instanciação obrigatória da API Admin com SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      const msg =
        "SUPABASE_SERVICE_ROLE_KEY ausente ou não configurada nas variáveis de ambiente. Configure-a no .env.local ou na Vercel.";
      console.error("[criarUsuario]", msg);
      return {
        success: false,
        error: msg,
      };
    }

    const adminClient = createSupabaseClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 2. Passo 1: Registra no Supabase Auth via auth.admin.createUser
    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email: generatedEmail,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome,
          username: cleanUsername,
          role,
        },
      });

    if (authError) {
      console.error("[criarUsuario] Erro no Supabase Auth:", authError.message);
      return {
        success: false,
        error:
          authError.message === "Email address already registered"
            ? `O nome de usuário "${cleanUsername}" já está em uso.`
            : authError.message,
      };
    }

    if (!authUser?.user?.id) {
      return {
        success: false,
        error: "Não foi possível obter o ID gerado pelo Supabase Auth.",
      };
    }

    const newUserId = authUser.user.id;

    // 3. Passo 2: Insere os dados na tabela pública usuarios
    let insertPayload: any = {
      id: newUserId,
      nome,
      username: cleanUsername,
      email: generatedEmail,
      role,
      escola_id: escolaId && escolaId.length > 5 ? escolaId : null,
    };

    let { data: dbData, error: dbError } = await adminClient
      .from("usuarios")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback defensivo caso a coluna 'username' ainda não exista no banco
    if (
      dbError &&
      (dbError.message.includes("username") ||
        dbError.message.includes("column") ||
        dbError.code === "PGRST204")
    ) {
      delete insertPayload.username;
      const retryResult = await adminClient
        .from("usuarios")
        .insert(insertPayload)
        .select()
        .single();
      dbData = retryResult.data;
      dbError = retryResult.error;
    }

    if (dbError) {
      console.error("[criarUsuario] Erro na tabela usuarios:", dbError.message);
      // Se a tabela ainda não tiver sido criada pelo script SQL:
      if (
        dbError.code === "PGRST205" ||
        dbError.message.includes("does not exist")
      ) {
        return {
          success: true,
          message: `Usuário @${cleanUsername} criado com sucesso no Auth! (Execute database/schema_completo_evotime.sql no Supabase)`,
          data: {
            id: newUserId,
            nome,
            username: cleanUsername,
            email: generatedEmail,
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
      message: `Usuário @${cleanUsername} convidado com sucesso`,
      data: dbData,
    };
  } catch (err) {
    console.error("Erro Action criarUsuario:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao criar usuário.",
    };
  }
}

/**
 * Server Action: listarUsuarios
 * Retorna todos os usuários cadastrados com suporte a username e fallback.
 */
export async function listarUsuarios(): Promise<{
  success: boolean;
  data: UsuarioItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Tenta buscar na tabela public.usuarios incluindo a coluna username
    let { data, error } = await supabase
      .from("usuarios")
      .select(`
        id,
        nome,
        username,
        email,
        role,
        escola_id,
        created_at,
        escolas:escola_id (
          nome
        )
      `)
      .order("created_at", { ascending: false });

    // Fallback se a coluna username ainda não tiver sido criada
    if (error && error.message.includes("username")) {
      const fallbackQuery = await supabase
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
      data = fallbackQuery.data as any;
      error = fallbackQuery.error;
    }

    if (error) {
      console.error("Erro Action listarUsuarios (Supabase):", error);

      // Tenta fallback com adminClient se a chave estiver configurada
      try {
        const admin = createAdminClient();
        const { data: authList, error: authListError } =
          await admin.auth.admin.listUsers();
        if (!authListError && authList?.users) {
          const mapped: UsuarioItem[] = (authList.users || []).map((u) => {
            const cleanUser =
              (u.user_metadata?.username as string) ||
              emailToUsername(u.email || "");
            return {
              id: u.id,
              nome:
                (u.user_metadata?.nome as string) ||
                cleanUser ||
                "Membro da Equipe",
              username: cleanUser,
              email: u.email || "",
              role: (u.user_metadata?.role as any) || "coordenador",
              escola_id: null,
              escola_nome: "Acesso Global",
              created_at: u.created_at,
            };
          });
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
      username: row.username || emailToUsername(row.email),
      email: row.email,
      role: row.role,
      escola_id: row.escola_id,
      escola_nome:
        row.escolas?.nome ||
        (row.escola_id ? "Escola Vinculada" : "Acesso Global"),
      created_at: row.created_at,
    }));

    return { success: true, data: mapped };
  } catch (err) {
    console.error("Erro Action listarUsuarios:", err);
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
    console.error("Erro Action excluirUsuario:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao excluir o usuário.",
    };
  }
}
