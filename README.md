# Recur

**Production:** https://recur-ronit.vercel.app (GitHub sign-in, restricted to allowlisted accounts)

A personal LeetCode tracker and spaced-repetition reviser built for interview prep. Every solved
problem becomes a flip card scheduled by FSRS-6 through `ts-fsrs`. Each morning at 9 AM Pacific,
Today lists exactly which problems to revise or re-solve, interleaved across topics, with the
interval each grade would schedule shown on the grade buttons.

Single user. Not a product. No AI features inside the app: it tests you, it never answers for you.

## Local setup

```bash
pnpm install
cp .env.example .env.local        # fill in the values below
pnpm db:migrate                   # drizzle migrations against DIRECT_URL
pnpm dev                          # http://localhost:3000
```

`.env.local` needs, at minimum:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler (port 6543), through node-postgres |
| `DIRECT_URL` | Supabase session pooler (port 5432); used by drizzle-kit |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | A GitHub OAuth app whose callback is `http://localhost:3000/api/auth/callback/github` |
| `AUTH_TRUST_HOST` | `true` |
| `ALLOWED_GITHUB_LOGIN` | GitHub logins allowed to sign in, comma-separated |
| `CRON_SECRET` | Any long random string; Vercel sends it as a bearer token to the cron route |

Optional: `RESEND_API_KEY` and `NUDGE_EMAIL_TO` turn on the 9 AM email (`NUDGE_EMAIL_FROM` and
`APP_URL` refine it); `AUTH_TEST_LOGIN` enables a test-only credentials provider outside
production (Playwright and offline development); `DATABASE_URL=pglite://.pglite` runs an
in-process Postgres for offline development; `LEETCODE_GRAPHQL_URL` points the prefill at a stub.

## Deploying

Vercel, personal Hobby plan, deployed with the CLI and connected to the GitHub repo so pushes to
`main` go to production.

1. `vercel link` (project `recur`), `vercel git connect`.
2. Add every variable above with `vercel env add <NAME> production` (and `preview`,
   `development`). The production GitHub OAuth app's callback is
   `https://<domain>/api/auth/callback/github`. Values are stored as sensitive, so
   `vercel env pull` returns them empty; keep `.env.local` by hand.
3. `pnpm db:migrate` with `DIRECT_URL` pointing at the Supabase session pooler.
4. `vercel --prod`, or push to `main`.

`vercel.json` schedules `/api/cron/daily` at 16:00 UTC. On the Hobby plan that fires once in the
following hour: 9 AM Pacific in summer, 8 AM after the November change. The route builds the list
for the review day that contains now + 2 hours (correct on both sides of DST), runs a `select 1`
so the free Supabase project never pauses, and emails the queue if Resend is configured.

## How scheduling works

### FSRS-6, through the library

FSRS (Free Spaced Repetition Scheduler) models each card with three numbers: Difficulty D in
[1, 10], Stability S (days until recall probability falls to 90%), and Retrievability R (the
probability of recall right now). It is Anki's default scheduler and beats SM-2 by a wide margin
in the open benchmarks. The forgetting curve is R(t, S) = (1 + F·t/S)^(-w20) with F chosen so
R(S, S) = 0.9; the interval that hits a desired retention r is (S/F)(r^(-1/w20) - 1), which equals
S at r = 0.9.

Every memory-state transition goes through `ts-fsrs` 5 (`src/lib/fsrs/core.ts`). Nothing is
reimplemented:

- `createEmptyCard` plus `f.next` for the first rating when a problem is marked solved.
- `f.repeat` for the four interval previews on the grade buttons, `f.next` to apply one.
  The instant captured at flip time feeds both calls, and fuzz is seeded per card
  (`GenSeedStrategyWithCardId`) so the interval applied is the interval shown.
- `f.rollback` for undo, `f.forget` for reset (which writes a Manual log that counters ignore).
- `f.get_retrievability` for R now, `f.forgetting_curve` for the predicted recall on the interview
  date, `f.next_interval` for the retention-ramp pass.

Parameters: library defaults (21 weights, decay w20 = 0.1542), `enable_short_term: false`, no
learning steps, fuzz on, maximum interval 365 days, desired retention 0.90. With short-term
scheduling off a card only ever sits in New or Review; "Lapsed" in the UI means the last grade was
Again. Coding problems do not need same-day re-reviews: the first Good on a new card lands two to
three days out and grows from there. The weights are editable in Settings (validated by
`checkParameters`) with a reset to defaults.

### Revise and Resolve

Recalling the approach (declarative) and implementing it bug-free under time (procedural) decay
differently, so there are two review modes with separate counters:

- **Revise** (about three minutes): flip, recall the key insight, approach and complexity, grade.
- **Resolve** (fifteen to forty-five minutes): re-code it cold, with a timer against a per-difficulty
  target, then grade.

Both go through the same `f.next`; the mode only changes what counts as Good. Easy is disabled in
Revise by default because Easy is earned by resolving.

### The mode heuristic

`suggestMode(card, logs, problem, settings)` (`src/lib/fsrs/suggest-mode.ts`, pure, unit-tested)
proposes Resolve when any of these hold, otherwise Revise. The toggle is always yours.

1. A tag with "always resolve" is on the problem.
2. The last grade was Again.
3. This is the first review after the initial solve and that solve was Again or Hard.
4. Stability crossed a milestone (7, 30, 90 days) the card has not been resolved at yet.
5. There have been N consecutive revises since the last resolve (default 3).

### The review day

`dayStart(now)` is the most recent 9:00 in `America/Los_Angeles` that is at or before now, and
`dayEnd` is the next one. Between midnight and 9 AM it is still yesterday's review day, like Anki's
"next day starts at". It is computed with `date-fns-tz`, never a hardcoded offset, and the tests
cover 8:59 vs 9:01, the 25-hour day on November 1, 2026, the 23-hour day in March, and a card due
at 11 PM.

### Today's queue

Active cards due before `dayEnd`, most overdue first, then interleaved so consecutive items rarely
share a primary topic (the problem's first topic tag by order), with ties inside a day broken by a
hash of the date. The first request of each review day materializes that order into `queue_days`;
later requests read it back and only append cards that became due since, so the list is stable
across reloads and devices. A daily soft cap hides the tail behind "Show more" but never an
overdue card.

### Interview date, ramp, cram

With an interview date set, every active card shows its predicted recall on that date if not
reviewed again. Over the final 14 days the desired retention ramps linearly from 0.90 to 0.95:
the scheduler instance is built per request with the effective value, and once per review day a
pass shortens (never lengthens) any due date longer than `next_interval` implies at that
retention, with fuzz off so it is idempotent. Inside the last 7 days Today gains a Cram section:
not-yet-due cards sorted by lowest predicted interview-day recall, kept separate so the model's
schedule is never silently overridden. After the date passes, all of this switches off.

## Adding a problem

Paste a LeetCode URL or slug. A server action asks LeetCode's GraphQL endpoint for the number,
title, difficulty and topics (four-second timeout, then manual entry) and maps topics onto your
tags. Then: the front (your restatement), the back (key insight, approach, complexity, pitfalls),
code snippets in CodeMirror (stored byte for byte, tabs included), tags, similar problems, and
extended notes. "Solved it today" asks how the solve went and schedules the first review;
"Add to backlog" queues it unscheduled. Cmd+Enter saves.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, `tsc --noEmit`, Prettier |
| `pnpm test` | Vitest: day boundary and DST, mode heuristic, retention ramp math and the daily ramp pass, queue interleaving, grading and undo, the GitHub allowlist (database cases on PGlite) |
| `pnpm test:e2e` | Playwright smoke: sign in, add from a URL (stubbed LeetCode), solve, review, grade, undo, theme persistence, tab-safe copy |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | drizzle-kit |
| `pnpm db:seed` | Sample data, local databases only |
| `pnpm screenshots` | Every screen in Light, Dim and Dark at desktop and phone widths |
| `pnpm deploy` | `vercel --prod` |

## Layout

```
src/app            routes: (app)/today, backlog, problems, problems/[id], problems/new, review, stats, settings; login; api/auth; api/cron
src/components     shell, common, problems, review, today, stats, settings, code, notes, ui (restyled shadcn)
src/db             schema, client (postgres.js, PGlite opt-in), bootstrap, defaults
src/lib            fsrs (core, scheduler, grade, suggest-mode), queue, review, problems, tags, settings, data, stats, day, leetcode, validation
tests              unit (Vitest), e2e (Playwright + LeetCode stub)
drizzle            migrations
```

See `DESIGN.md` for the visual direction, `DECISIONS.md` for every judgment call, and `CLAUDE.md`
for the rules future sessions must keep.
