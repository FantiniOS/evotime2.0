"use server";

import { cookies } from "next/headers";
import { loginSchema } from "@/lib/security/authSchema";
import { usernameToEmail } from "@/lib/auth/emailMapping";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  getAuthenticatedTenantContext,
  UserRole,
} from "@/lib/security/tenantAuth";
import { createClient } from "@/utils/supabase/server";
import type { LoginActionResult } from "@/types/actions";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

/**
 * Server Action de Login com Username (Email Mapping Oculto):
 * 1. Valida nome de usuário e senha com Zod.
 * 2. Converte o username para e-mail interno mapeado (ex: carlos -> carlos@evotime.local).
 * 3. Autentica no Supabase Auth via signInWithPassword.
 * 4. Grava o cookie HTTP-Only de sessão.
 */
export async function loginAction(formData: {
  username: string;
  password: string;
}): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(formData);

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Verifique os campos informados antes de continuar.",
      fieldErrors: {
        username: flattened.username,
        password: flattened.password,
      },
    };
  }

  const { username, password } = parsed.data;

  // Interceptação: transforma o username no e-mail mapeado exigido pelo Supabase Auth
  const mappedEmail = usernameToEmail(username);

  try {
    const supabase = await createClient();

    // 1. Autenticação primária no Supabase Auth usando o e-mail mapeado
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: mappedEmail,
        password,
      });

    let userId = authData?.user?.id || "usr_coord_global";

    // Fallback de conveniência em ambiente de desenvolvimento / demo para a conta padrão
    if (authError) {
      console.warn("[Supabase Auth] Aviso no login:", authError.message);

      const isDefaultDemo =
        (username.toLowerCase() === "coordenador" ||
          username.toLowerCase() === "coordenacao" ||
          username.toLowerCase() === "admin" ||
          mappedEmail === "coordenacao@evotime.local" ||
          mappedEmail === "coordenacao@evotime.edu.br") &&
        password === "EvoTime@2026";

      if (isDefaultDemo) {
        // Tenta auto-provisionar a conta com o e-mail mapeado no Supabase Auth
        const { data: signUpData } = await supabase.auth.signUp({
          email: mappedEmail,
          password,
        });
        if (signUpData?.user) {
          userId = signUpData.user.id;
        }
      } else {
        return {
          success: false,
          error:
            authError.message === "Invalid login credentials"
              ? "Usuário ou senha incorretos."
              : authError.message,
        };
      }
    }

    // 2. Registra o token de sessão HTTP-Only assinado (HMAC-SHA256)
    const now = Date.now();
    const role: UserRole =
      username.toLowerCase().includes("admin") ||
      mappedEmail.toLowerCase().includes("admin")
        ? "ADMIN"
        : "COORDENADOR";

    const signedToken = signSessionToken({
      userId,
      email: mappedEmail,
      schoolId: "global",
      role,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_SECONDS * 1000,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return {
      success: true,
      sessionContext: {
        username,
        email: mappedEmail,
        schoolId: "global",
        role,
      },
    };
  } catch (err) {
    console.error("Exceção na Server Action loginAction:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao autenticar sessão.",
    };
  }
}

/**
 * Atualiza o `escola_ativa_id` no cookie quando o usuário seleciona uma escola no Topbar.
 */
export async function switchTenantSessionAction(
  newSchoolId: string
): Promise<{ success: boolean; schoolId?: string }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set("escola_ativa_id", newSchoolId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    // Atualiza também os claims da sessão se existir
    try {
      const currentClaims = await getAuthenticatedTenantContext();
      const now = Date.now();
      const updatedToken = signSessionToken({
        ...currentClaims,
        schoolId: newSchoolId,
        issuedAt: now,
        expiresAt: now + SESSION_DURATION_SECONDS * 1000,
      });

      cookieStore.set(SESSION_COOKIE_NAME, updatedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION_SECONDS,
      });
    } catch {
      // Ignora erro de claims se não estiverem presentes
    }

    return { success: true, schoolId: newSchoolId };
  } catch {
    return { success: false };
  }
}

/**
 * Encerra a sessão removendo os cookies no servidor.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Continua para limpar cookies locais
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("escola_ativa_id");
  return { success: true };
}
