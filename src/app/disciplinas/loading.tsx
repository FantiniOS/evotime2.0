import { TwoColumnPageSkeleton } from "@/components/skeletons/PageSkeletons";

/**
 * Loading UI instantâneo de /disciplinas (Suspense automático do App Router).
 * Exibido enquanto o Server Component busca as disciplinas no Supabase.
 */
export default function Loading() {
  return (
    <TwoColumnPageSkeleton
      label="disciplinas"
      leftSpan={5}
      listItems={6}
      withChips={false}
      formFields={2}
    />
  );
}
