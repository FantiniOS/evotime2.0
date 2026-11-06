import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Armazenamento em memória para Rate Limiting (Sliding Window / Fixed Window por IP).
 * Protege as APIs de geração de horário (/api/grade, /api/otimizar) e autenticação contra força bruta.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const API_WINDOW_MS = 60 * 1000; // Janela de 1 minuto
const MAX_API_REQUESTS_PER_WINDOW = 15; // Limite estrito para APIs de geração de horário IA
const MAX_GENERAL_REQUESTS_PER_WINDOW = 120; // Limite geral por minuto

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/turmas",
  "/disciplinas",
  "/professores",
  "/configuracoes",
  "/grade",
  "/escolas",
];

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

function checkRateLimit(
  ip: string,
  bucket: "api" | "general",
  maxRequests: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    const resetAt = now + API_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - current.count),
    resetAt: current.resetAt,
  };
}

/**
 * Valida se o token de sessão é estruturalmente válido.
 */
function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  return token.length >= 16 && token.startsWith("evotime_");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);

  // 1. Rate Limiting (Mais rigoroso para rotas de API / Geração de Horário com IA)
  const isScheduleApi =
    pathname.startsWith("/api/grade") ||
    pathname.startsWith("/api/otimizar") ||
    pathname.startsWith("/api/");

  const bucket = isScheduleApi ? "api" : "general";
  const limit = isScheduleApi
    ? MAX_API_REQUESTS_PER_WINDOW
    : MAX_GENERAL_REQUESTS_PER_WINDOW;

  const rateStatus = checkRateLimit(clientIp, bucket, limit);

  if (!rateStatus.allowed) {
    const retryAfterSeconds = Math.ceil(
      (rateStatus.resetAt - Date.now()) / 1000
    );
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message:
          "Limite de requisições excedido. Aguarde antes de solicitar uma nova geração de horário.",
        retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 2. Verificação de Autenticação em Rotas Protegidas
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtectedRoute) {
    const sessionToken =
      request.cookies.get("evotime_session")?.value ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!isValidSessionToken(sessionToken)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Prosseguir adicionando cabeçalhos de monitoramento de Rate Limit
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(rateStatus.remaining));
  return response;
}

// Compatibilidade com a convenção proxy do Next.js 16+
export const proxy = middleware;
export default middleware;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/turmas/:path*",
    "/disciplinas/:path*",
    "/professores/:path*",
    "/configuracoes/:path*",
    "/grade/:path*",
    "/escolas/:path*",
    "/api/:path*",
  ],
};
