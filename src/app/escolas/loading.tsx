import { TwoColumnPageSkeleton } from "@/components/skeletons/PageSkeletons";

/**
 * Loading UI instantâneo de /escolas (Suspense automático do App Router).
 */
export default function Loading() {
  return (
    <TwoColumnPageSkeleton
      label="escolas"
      leftSpan={5}
      listItems={4}
      withChips={false}
      formFields={4}
    />
  );
}
