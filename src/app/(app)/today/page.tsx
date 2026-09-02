import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today" description="Cards due before tomorrow's 9 AM boundary." />
      <EmptyState
        icon={<CalendarCheck size={28} />}
        title="Nothing due"
        body="Add a problem you solved today, or pick one from the backlog. It will come back here when it is time."
        actions={
          <>
            <Button render={<Link href="/problems/new" />}>Add problem</Button>
            <Button variant="outline" render={<Link href="/backlog" />}>
              Open backlog
            </Button>
          </>
        }
      />
    </>
  );
}
