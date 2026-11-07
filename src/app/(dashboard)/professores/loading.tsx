import { TwoColumnPageSkeleton } from "@/components/skeletons/PageSkeletons";

/**
 * Loading UI instantâneo de /professores (Suspense automático do App Router).
 * Exibido enquanto o Server Component busca os docentes no Supabase.
 */
export default function Loading() {
  return (
    <TwoColumnPageSkeleton
      label="professores"
      leftSpan={4}
      listItems={6}
      withChips
      formFields={2}
    />
  );
}
