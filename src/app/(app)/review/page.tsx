import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Session" };

export default function ReviewPage() {
  return (
    <>
      <PageHeader title="Session" />
      <p className="text-sm text-fg-muted">The review session arrives with the scheduling phase.</p>
    </>
  );
}
