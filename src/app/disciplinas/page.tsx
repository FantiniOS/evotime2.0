import { listarDisciplinas } from "@/actions/disciplinaActions";
import DisciplinasClient from "./DisciplinasClient";

export const dynamic = "force-dynamic";

/**
 * Server Component: /disciplinas
 * - Busca as disciplinas no servidor (1 única query, sem N+1).
 * - Enquanto aguarda o Supabase, o App Router exibe `loading.tsx` (Skeleton).
 */
export default async function DisciplinasPage() {
  const disciplinas = await listarDisciplinas();
  return <DisciplinasClient initialDisciplinas={disciplinas} />;
}
