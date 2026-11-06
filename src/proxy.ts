import { middleware } from "../middleware";

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
