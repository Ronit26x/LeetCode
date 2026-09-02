import { HeaderSkeleton, RowsSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton actions />
      <RowsSkeleton />
    </>
  );
}
