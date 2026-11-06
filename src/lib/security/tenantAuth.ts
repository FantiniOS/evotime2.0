import crypto from "crypto";
import { cookies, headers } from "next/headers";

export type UserRole = "ADMIN" | "COORDENADOR" | "PROFESSOR" | "LEITOR";

export interface AuthenticatedTenantClaims {
  userId: string;
  email: string;
  schoolId: string;
  role: UserRole;
  issuedAt: number;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = "evotime_session";

const SESSION_SECRET =
  process.env.EVOTIME_SESSION_SECRET ||
  "evotime-2-enterprise-hmac-secret-key-2026-multi-tenant";

/**
 * Assina os claims de sessão no servidor gerando um token estruturado:
 * `evotime_jwt.<payloadBase64Url>.<hmacSha256Base64Url>`
 */
export function signSessionToken(claims: AuthenticatedTenantClaims): string {
  const payloadBase64 = Buffer.from(JSON.stringify(claims), "utf-8").toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  return `evotime_jwt.${payloadBase64}.${signature}`;
}

/**
 * Verifica a assinatura HMAC-SHA256 e a expiração do token de sessão no servidor.
 */
export function verifySessionToken(
  token: string
): AuthenticatedTenantClaims | null {
  if (!token || !token.startsWith("evotime_jwt.")) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [, payloadBase64, providedSignature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  const sigBufferA = Buffer.from(providedSignature);
  const sigBufferB = Buffer.from(expectedSignature);
  if (
    sigBufferA.length !== sigBufferB.length ||
    !crypto.timingSafeEqual(sigBufferA, sigBufferB)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8")
    ) as AuthenticatedTenantClaims;

    if (!claims.schoolId || !claims.userId || !claims.role) {
      return null;
    }

    if (Date.now() > claims.expiresAt) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

export class TenantAuthenticationError extends Error {
  public readonly statusCode = 401;
  constructor(
    message = "Sessão inválida ou ausente. Autentique-se novamente."
  ) {
    super(message);
    this.name = "TenantAuthenticationError";
  }
}

export class InsufficientRoleError extends Error {
  public readonly statusCode = 403;
  constructor(
    requiredRoles: UserRole[],
    currentRole: UserRole,
    operation: string
  ) {
    super(
      `Acesso negado para a operação "${operation}". Nível exigido: [${requiredRoles.join(
        ", "
      )}]. Nível atual: ${currentRole}.`
    );
    this.name = "InsufficientRoleError";
  }
}

/**
 * Extrai e valida no SERVIDOR o token do cookie HttpOnly `evotime_session`.
 * REGRA DE OURO MULTI-TENANT:
 * O `schoolId` e a `role` são extraídos exclusivamente do token assinado no servidor.
 */
export async function getAuthenticatedTenantContext(): Promise<AuthenticatedTenantClaims> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const rawToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    headerStore.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!rawToken) {
    throw new TenantAuthenticationError();
  }

  const verified = verifySessionToken(rawToken);
  if (verified) {
    return verified;
  }

  throw new TenantAuthenticationError(
    "Token de sessão inválido ou expirado."
  );
}

export function assertAuthorizedRole(
  claims: AuthenticatedTenantClaims,
  allowedRoles: UserRole[],
  operationName: string
): void {
  if (!allowedRoles.includes(claims.role)) {
    throw new InsufficientRoleError(allowedRoles, claims.role, operationName);
  }
}

export function enforceServerTenantId<T extends Record<string, unknown>>(
  clientPayload: T,
  claims: AuthenticatedTenantClaims
): Omit<T, "school_id" | "schoolId"> & { school_id: string } {
  const cloned = { ...clientPayload };
  delete cloned.school_id;
  delete cloned.schoolId;

  return {
    ...cloned,
    school_id: claims.schoolId,
  };
}

export interface ScopedQueryDescriptor {
  rlsSessionCommand: string;
  sql: string;
  params: unknown[];
  tenantSchoolId: string;
}

export function buildTenantScopedQuery(
  claims: AuthenticatedTenantClaims,
  sql: string,
  additionalParams: unknown[] = []
): ScopedQueryDescriptor {
  return {
    rlsSessionCommand: `SELECT set_config('app.current_school_id', $1, true);`,
    sql,
    params: [claims.schoolId, ...additionalParams],
    tenantSchoolId: claims.schoolId,
  };
}
