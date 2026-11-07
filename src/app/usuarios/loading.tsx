import { TablePageSkeleton } from "@/components/skeletons/PageSkeletons";

/**
 * Loading UI instantâneo de /usuarios (Suspense automático do App Router).
 * Exibido enquanto o Server Component busca usuários e escolas em paralelo.
 */
export default function Loading() {
  return <TablePageSkeleton label="usuários" rows={8} columns={5} />;
}
