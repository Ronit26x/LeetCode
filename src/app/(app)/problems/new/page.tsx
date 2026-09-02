import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Add problem" };

export default function NewProblemPage() {
  return (
    <>
      <PageHeader title="Add problem" description="Paste a LeetCode URL or slug to prefill the basics." />
      <p className="text-sm text-fg-muted">The add form arrives with the problems phase.</p>
    </>
  );
}
