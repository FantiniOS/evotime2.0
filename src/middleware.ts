import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const rotasPublicas = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Atualiza cookies da sessão via @supabase/ssr (100% Edge Runtime)
  const { response, user } = await updateSession(request);

  // 2. Verifica se existe sessão ativa (Supabase Auth ou cookie evotime_session)
  const evotimeSession = request.cookies.get("evotime_session")?.value;
  const isAuthenticated = Boolean(
    user || (evotimeSession && evotimeSession.length >= 16)
  );

  const isPublicRoute =
    rotasPublicas.includes(pathname) || pathname.startsWith("/api/grade");

  // Regra de Ouro: Usuário sem sessão tentando acessar rota protegida -> redirect para /login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se o usuário já tiver sessão ativa e tentar acessar /login -> redirect para /dashboard
  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas da aplicação, exceto:
     * - _next/static (arquivos estáticos de build)
     * - _next/image (imagens otimizadas)
     * - favicon.ico (ícone do site)
     * - arquivos com extensão (ex: .png, .jpg, .svg, .css, .js, .ico)
     * - rotas de API públicas (/api/grade)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/grade|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
