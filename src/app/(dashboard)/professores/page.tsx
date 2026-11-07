import { listarProfessores } from "@/actions/professorActions";
import ProfessoresClient from "./ProfessoresClient";

export const dynamic = "force-dynamic";

/**
 * Server Component: /professores
 * - Busca os docentes no servidor (1 única query; vínculos/indisponibilidades
 *   já vêm em colunas JSONB, sem N+1).
 * - Enquanto aguarda o Supabase, o App Router exibe `loading.tsx` (Skeleton).
 */
export default async function ProfessoresPage() {
  const professores = await listarProfessores();
  return <ProfessoresClient initialProfessores={professores} />;
}
