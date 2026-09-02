import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ProblemForm } from "@/components/problems/problem-form";
import { listTags } from "@/lib/problems/queries";

export const metadata: Metadata = { title: "Add problem" };

export default async function NewProblemPage() {
  const tags = await listTags();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add problem"
        description="Paste the LeetCode link, write the card, pick an outcome."
      />
      <ProblemForm mode="create" tags={tags} />
    </div>
  );
}
