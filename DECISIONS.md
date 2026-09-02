# DECISIONS.md

Judgment calls made while building Recur, in the order they came up. Product decisions that were
handed down in the brief are not repeated here; this is the list of things that were mine to decide.

## Name: Recur

"Recall" names the goal; "Recur" names the mechanism. A problem recurs in the queue at the interval
the scheduler picks, and the word carries a nod to recursion for a tool that exists to prepare for
coding interviews. One word, short, reads well as a wordmark in a serif.

## Local Postgres for tests: PGlite, not Docker

Docker is not installed on this machine and Homebrew is blocked by an outdated Xcode Command Line
Tools install. Unit and integration tests that need a database run against PGlite (Postgres compiled
to WebAssembly, in-process) with the same Drizzle migrations. Production and local development use
Supabase through postgres.js exactly as specified. Nothing in the app imports PGlite; only the test
harness does.

## shadcn on Base UI, restyled through tokens

shadcn's current default preset builds on Base UI rather than Radix. It was kept as the primitive
layer (focus management, positioning, a11y) and restyled through CSS variables, fixed radii and
edited class lists so the stock look is gone. Icons are Phosphor (one family, regular weight);
lucide was removed.

## Type: Newsreader for the material, Geist for the instrument, JetBrains Mono for code

The brief asked for a characterful display face with a quiet sans. A serif was chosen deliberately
and confined to the content the user wrote for themselves (titles, restatements, the key insight),
which makes the tool chrome read as an instrument and the card read as a notebook. Newsreader has
an optical size axis so it holds at 14 px and at 40 px. JetBrains Mono because that is what a C++
developer sees in their IDE; ligatures are off so the code on screen matches the code they type.

## Themes via `data-theme`, and "dark:" covers both Dim and Dark

next-themes writes `data-theme="light|dim|dark"` on `<html>`. Tailwind's `dark:` variant is
redefined to match both Dim and Dark so third-party component styles behave, while the app's own
styling goes through tokens that are defined three times.

## One accent, two borrowed semantic scales

The accent (a muted cobalt) is used only for interaction. Rating colors follow Anki (red, amber,
green, teal for Easy instead of Anki's sky blue, so it does not fight the accent) and difficulty
colors follow LeetCode (teal, amber, rose), because those are the conventions the user already has
in muscle memory.

## Design database consulted and overruled

The ui-ux-pro-max search suggested Claymorphism with a purple primary for a study tool. It was
rejected because the brief asks for Linear and Things 3 restraint. Its accessibility checklist was
kept.

## Undo restores the previous due date from a snapshot

`ts-fsrs` `rollback(card, log)` rebuilds stability, difficulty, reps, lapses, state and
`last_review` from the log, but the log's `due` field holds the previous review instant, so the
rolled-back card comes back due "now". That is fine mid-session and wrong for an early review of a
card due next month. Each log therefore stores `prev_due`; undo calls `rollback` and then restores
`due` from the snapshot. Nothing else about the library's rollback is overridden.

## Charts are hand-rolled SVG, one hue, with a table view

The stats page follows the dataviz rules: single-series marks in the accent, bars capped at
24 px and rounded only at the data end, hairline solid grids, a hover tooltip layer that never
gates a value (every chart has a table twin), the hero readiness figure in the sans with
proportional figures, and no dual axes. The difficulty triple (teal, amber, rose) was run through
the palette validator: it passes in light; in dark the amber pair sits in the 6-8 CVD band, which
is allowed only with secondary encoding, so difficulty is always labeled by text next to the mark.
No chart library: the six charts are small, and a dependency would bring its own look.

## Shared constants live in plain modules

Importing a value (not a component) from a `"use client"` file into a server component yields a
client reference, not the value. Rubric text and the key table therefore live in `src/lib/rubric.ts`
with no directive, and both sides import from there.

## The cron builds the list for now + 2 hours

Vercel Hobby cron fires somewhere in the hour after 16:00 UTC, which is 9 AM PDT and 8 AM PST.
Building the queue for the review day that contains now + 2 hours lands on the correct day on
both sides of the DST change without hardcoding an offset. The same hit runs `select 1` as the
Supabase keep-alive.

## Raw SQL fragments never carry a Date

PGlite serializes a JavaScript Date inside a drizzle `sql` fragment; postgres.js does not
(`ERR_INVALID_ARG_TYPE`), and the unit tests run on PGlite. The live verification against
Supabase caught it in the first-solve update. Rule: inside `sql\`...\`` pass `date.toISOString()`
with a `::timestamptz` cast; typed columns in `.set()` and `.values()` are fine. The verification
script (`scripts/verify-live.mts`) now runs against the real database after every schema or
transaction change.

## Vercel variables are sensitive

Values added with `vercel env add` are stored as sensitive, so `vercel env pull` writes them back
empty. The runtime sees them (the cron route verified it); local development keeps its own
`.env.local`. The README says so instead of promising a working pull.

## Driver: node-postgres, not postgres.js

The brief asked for postgres.js on the Supavisor transaction pooler. Against the real project that
combination hangs: any burst of concurrent queries (24 in flight, even on a pool of one connection,
even with pipelining disabled) never gets its responses back, Postgres shows every backend idle,
and the request holds until the client gives up. Reproduced deterministically with a 30-line
script; the same load through the session pooler completes in half a second, and node-postgres on
the transaction pooler completes it in about one second. So the app uses `drizzle-orm/node-postgres`
on the transaction pooler (unnamed statements, so no prepared-statement setting is needed) with a
30-second client-side `query_timeout` as a guard, and drizzle-kit keeps the session pooler.
Everything else in the data layer is unchanged; the unit tests still run on PGlite.
