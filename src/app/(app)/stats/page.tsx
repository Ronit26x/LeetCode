import type { Metadata } from "next";
import { ChartBar } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Stats" };

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Stats" description="Reviews, retention, and readiness for the interview date." />
      <EmptyState
        icon={<ChartBar size={28} />}
        title="No reviews yet"
        body="Charts appear after your first graded review."
      />
    </>
  );
}
