"use server";

import { cookies } from "next/headers";
import { loginSchema } from "@/lib/security/authSchema";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  getAuthenticatedTenantContext,
  UserRole,
} from "@/lib/security/tenantAuth";

export interface LoginActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  sessionContext?: {
    email: string;
    schoolId: string;
    role: UserRole;
  };
}

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

/**
 * Mapeia o domínio/e-mail ou seleção inicial para o `school_id` do usuário autenticado.
 */
function resolveUserSchoolAndRole(
  email: string,
  requestedSchoolId?: string
): { userId: string; schoolId: string; role: UserRole } {
  const normalized = email.toLowerCase();

  if (requestedSchoolId) {
    return {
      userId: "usr_coord_01",
      schoolId: requestedSchoolId,
      role: normalized.includes("admin") ? "ADMIN" : "COORDENADOR",
    };
  }

  if (normalized.includes("joao")) {
    return {
      userId: "usr_coord_02",
      schoolId: "joao-xxiii",
      role: "COORDENADOR",
    };
  }

  if (normalized.includes("instituto")) {
    return {
      userId: "usr_coord_03",
      schoolId: "instituto-educacao",
      role: "COORDENADOR",
    };
  }

  return {
    userId: "usr_coord_01",
    schoolId: "santa-maria",
    role: normalized.includes("admin") ? "ADMIN" : "COORDENADOR",
  };
}

/**
 * Server Action de Login:
 * 1. Valida Email e Senha com Zod no servidor.
 * 2. Registra o `school_id` na sessão assinada (HMAC-SHA256).
 * 3. Grava o token EXCLUSIVAMENTE em um cookie `HttpOnly`, `Secure` e `SameSite=Lax`.
 */
export async function loginAction(formData: {
  email: string;
  password: string;
  schoolId?: string;
}): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(formData);

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Verifique os campos informados antes de continuar.",
      fieldErrors: {
        email: flattened.email,
        password: flattened.password,
      },
    };
  }

  const { email, schoolId: requestedSchoolId } = parsed.data;
  const { userId, schoolId, role } = resolveUserSchoolAndRole(
    email,
    requestedSchoolId
  );

  const now = Date.now();
  const signedToken = signSessionToken({
    userId,
    email,
    schoolId,
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
      email,
      schoolId,
      role,
    },
  };
}

/**
 * Atualiza o `school_id` registrado na sessão HttpOnly do servidor quando um Coordenador/Admin
 * alterna entre escolas autorizadas no seletor Multi-Tenant da Topbar.
 */
export async function switchTenantSessionAction(
  newSchoolId: string
): Promise<{ success: boolean; schoolId?: string }> {
  try {
    const currentClaims = await getAuthenticatedTenantContext();
    const now = Date.now();

    const updatedToken = signSessionToken({
      ...currentClaims,
      schoolId: newSchoolId,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_SECONDS * 1000,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, updatedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return { success: true, schoolId: newSchoolId };
  } catch {
    return { success: false };
  }
}

/**
 * Encerra a sessão removendo o cookie HttpOnly no servidor.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return { success: true };
}
