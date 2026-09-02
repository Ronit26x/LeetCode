import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/common/mark";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Wordmark />
      <h1 className="display mt-6 text-2xl leading-8">Nothing here</h1>
      <p className="mt-2 max-w-sm text-sm text-fg-muted">
        That page does not exist, or the problem it pointed at was deleted.
      </p>
      <Button className="mt-6" render={<Link href="/today" />}>
        Back to Today
      </Button>
    </div>
  );
}
