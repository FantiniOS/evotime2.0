import { listarTurmas } from "@/actions/turmaActions";
import { listarDisciplinas } from "@/actions/disciplinaActions";
import TurmasClient from "./TurmasClient";

export const dynamic = "force-dynamic";

/**
 * Server Component: /turmas
 * - Busca turmas e disciplinas EM PARALELO (Promise.all) — sem waterfall.
 * - Enquanto aguarda o Supabase, o App Router exibe `loading.tsx` (Skeleton).
 * - Entrega dados serializáveis prontos ao Client Component, eliminando as
 *   2 Server Actions sequenciais que rodavam após a hidratação.
 */
export default async function TurmasPage() {
  const [turmas, disciplinas] = await Promise.all([
    listarTurmas(),
    listarDisciplinas(),
  ]);

  return <TurmasClient initialTurmas={turmas} initialDisciplinas={disciplinas} />;
}
