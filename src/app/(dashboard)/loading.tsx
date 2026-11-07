import { TablePageSkeleton } from "@/components/skeletons/PageSkeletons";

/**
 * Loading UI padrão do route group (dashboard).
 * Atua no Suspense boundary imediatamente abaixo do Topbar, mantendo a navegação congelada.
 */
export default function DashboardLoading() {
  return <TablePageSkeleton label="painel" rows={6} columns={4} />;
}
