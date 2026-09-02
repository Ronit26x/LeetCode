# CLAUDE.md

Recur: a single-user LeetCode tracker with FSRS-6 spaced repetition, built for interview prep.
Read DESIGN.md before touching UI and DECISIONS.md before changing an approach.

## Stack

Next.js 16 (App Router, Server Actions, `proxy.ts` instead of middleware), React 19, TypeScript
strict, Tailwind v4, shadcn (Base UI preset) restyled, Phosphor icons, next-themes (light/dim/dark
+ system via `data-theme`), Drizzle + postgres.js on Supabase, Auth.js v5 with GitHub and a
server-side allowlist, ts-fsrs 5 (FSRS-6), CodeMirror 6 + Shiki, Vitest + Playwright, pnpm.

## Commands

`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`,
`pnpm db:generate`, `pnpm db:migrate` (uses DIRECT_URL), `pnpm db:studio`, `pnpm db:seed` (dev
only), `pnpm icons`, `pnpm deploy` (`vercel --prod`).

## Rules that are easy to break

- All FSRS math goes through `ts-fsrs`. Never reimplement a formula.
- Every mutation is a Server Action that checks the session first and validates with Zod.
- Grade + log + counter updates happen in one transaction; `client_review_id` makes grading idempotent.
- The review day starts at 9 AM in `settings.timezone`. Never hardcode a UTC offset.
- Snippets are stored byte for byte. No formatting, no trimming, tabs preserved.
- One accent color. Ratings and difficulty are the only other hues. No emoji in chrome.
- Text in the UI: sentence case, no exclamation marks, no em dashes.
- Screenshot every changed screen in Light, Dim and Dark before calling it done.
