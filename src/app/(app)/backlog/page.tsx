import type { Metadata } from "next";
import Link from "next/link";
import { Tray } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Backlog" };

export default function BacklogPage() {
  return (
    <>
      <PageHeader
        title="Backlog"
        description="Problems you intend to solve. Nothing here is scheduled yet."
        actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
      />
      <EmptyState
        icon={<Tray size={28} />}
        title="The backlog is empty"
        body="Paste a LeetCode URL to queue a problem. Solve it, mark it solved, and it moves into the review schedule."
        actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
      />
    </>
  );
}
