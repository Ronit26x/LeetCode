# CLAUDE.md

Recur: a single-user LeetCode tracker with FSRS-6 spaced repetition, built for interview prep.
Read DESIGN.md before touching UI and DECISIONS.md before changing an approach. README.md explains
the algorithm, the modes, the day boundary and deployment.

## Stack

Next.js 16 (App Router, Server Actions, `src/proxy.ts` instead of middleware), React 19,
TypeScript strict, Tailwind v4, shadcn (Base UI preset) restyled through tokens, Phosphor icons,
next-themes (light/dim/dark + system via `data-theme`), Drizzle + node-postgres on Supabase (PGlite
opt-in for tests and offline dev; postgres.js hangs on the transaction pooler, see DECISIONS.md), Auth.js v5 with GitHub and a server-side allowlist, ts-fsrs 5
(FSRS-6), CodeMirror 6 + Shiki, Vitest + Playwright, pnpm.

## Commands

`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`,
`pnpm db:generate`, `pnpm db:migrate` (uses DIRECT_URL), `pnpm db:studio`, `pnpm db:seed` (local
databases only), `pnpm db:seed:gfg [--dry-run]` (idempotent GFG history import), `pnpm screenshots` (all screens, three themes, two widths; needs a dev server and
AUTH_TEST_LOGIN), `pnpm exec tsx scripts/a11y.mts` (Lighthouse accessibility), `pnpm deploy`.

Local offline loop: `.env.local` with `DATABASE_URL=pglite://.pglite` and `AUTH_TEST_LOGIN=Ronit26x`,
then `pnpm db:seed` and `pnpm dev`. Delete `.pglite` to start over. `next start` disables the test
login (NODE_ENV=production), so verification runs on `next dev`.

## Rules that are easy to break

- All FSRS math goes through `ts-fsrs`. Never reimplement a formula. Build the instance with
  `schedulerForNow(settings, now)` so the retention ramp applies.
- Every mutation is a Server Action that calls `requireSession()` first and validates with Zod.
- Grade + log + counter updates happen in one transaction (`src/lib/review/core.ts`);
  `client_review_id` makes grading idempotent; undo restores `prev_due` from the log.
- The review day starts at `settings.dayStartHour` in `settings.timezone`. Never hardcode an offset.
- Snippets are stored byte for byte. No formatting, no trimming, tabs preserved.
- `prior_solved_at` is history for display and ordering only. Never use it to backdate a card,
  pre-set stability, or fabricate review logs. Slugs are unique per (source, slug).
- Importing a value from a `"use client"` file into a server component gives a client reference.
  Shared constants live in `src/lib/*` without a directive.
- Use `getDb()` (lazy); nothing may touch the database at import time or build time.
- Never put a Date inside a raw `sql` fragment: pass `toISOString()` with a `::timestamptz` cast.
  After schema or transaction changes run `DATABASE_URL=<supabase tx url> pnpm exec tsx scripts/verify-live.mts`.
- One accent color. Ratings and difficulty are the only other hues. No emoji in chrome.
- Text in the UI: sentence case, no exclamation marks, no em dashes.
- Screenshot every changed screen in Light, Dim and Dark before calling it done, and run the
  console check (`scripts/console-check.mts`) for hydration errors.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
