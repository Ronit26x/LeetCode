"use client";

import * as React from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  const dbMissing = /DATABASE_URL|ECONNREFUSED|ENOTFOUND|connect/i.test(error.message);
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface px-6 py-10 text-center">
      <WarningCircle size={28} className="mx-auto text-again" />
      <h1 className="display mt-4 text-xl leading-7">Something went wrong</h1>
      <p className="mt-2 text-sm text-fg-muted">
        {dbMissing
          ? "The database is not reachable. If this is a fresh deployment, DATABASE_URL and DIRECT_URL are not set yet."
          : "The page could not be rendered. Try again, and check the server logs if it keeps happening."}
      </p>
      {error.digest ? <p className="mt-2 font-mono text-2xs text-fg-subtle">{error.digest}</p> : null}
      <Button className="mt-5" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
