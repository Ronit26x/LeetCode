import { Wordmark } from "@/components/common/mark";

/** Shown instead of the app when the database is not configured. Production hides error text, so this is explicit. */
export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
        <Wordmark />
        <h1 className="display mt-5 text-xl leading-7">Almost there</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Sign-in works, but the database is not connected yet. Set these environment variables and redeploy:
        </p>
        <ul className="mt-3 flex flex-col gap-1 font-mono text-md">
          {missing.map((m) => (
            <li key={m} className="rounded-sm bg-sunken px-2 py-1">
              {m}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-2xs text-fg-subtle">
          Supabase: transaction pooler on port 6543 for DATABASE_URL, session pooler on port 5432 for DIRECT_URL, then run the migrations.
        </p>
      </div>
    </div>
  );
}
