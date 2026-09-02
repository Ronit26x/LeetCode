import type { Metadata } from "next";
import Link from "next/link";
import { Stack } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Problems" };

export default function ProblemsPage() {
  return (
    <>
      <PageHeader
        title="Problems"
        description="Everything you have added, with its memory state."
        actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
      />
      <EmptyState
        icon={<Stack size={28} />}
        title="No problems yet"
        body="Your library fills as you add solved problems. Search, filter by tag and memory state, and edit anything inline."
        actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
      />
    </>
  );
}
