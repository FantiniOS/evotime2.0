import { TwoColumnPageSkeleton } from "@/components/skeletons/PageSkeletons";

/**
 * Loading UI instantâneo de /turmas (Suspense automático do App Router).
 * Exibido enquanto o Server Component busca turmas + disciplinas em paralelo.
 */
export default function Loading() {
  return (
    <TwoColumnPageSkeleton
      label="turmas"
      leftSpan={5}
      listItems={5}
      withChips
      formFields={2}
    />
  );
}
