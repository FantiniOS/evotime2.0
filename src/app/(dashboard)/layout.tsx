import React from "react";
import Topbar from "@/components/Topbar";

/**
 * Layout Persistente do Dashboard (Route Group).
 *
 * Regra Arquitetural Next.js:
 * Este layout envolve todas as rotas autenticadas do sistema (/, /dashboard,
 * /disciplinas, /turmas, /professores, /grade, /usuarios, /escolas, /configuracoes, /exportar).
 *
 * Ao navegar entre essas rotas:
 * - O <Topbar /> NUNCA é desmontado (estado preservado, sem flashes ou re-fetches).
 * - O Suspense boundary dos loading.tsx substitui estritamente o {children}.
 * - A experiência é de uma verdadeira Single Page Application (SPA).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Topbar />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
