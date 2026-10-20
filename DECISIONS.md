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

## GFG import: history is display, never memory

The 334 GeeksforGeeks solves come in with `prior_solved_at` and its precision, a tier, and an
import batch. None of that touches FSRS: no card, no log, nothing due. A problem enters the
schedule only when it is rated in the app, through one of two doors from the backlog: "Solved it
again" (first rating logged as resolve #1) or "Still remember it" (first rating logged as revise #1,
Easy refused). A shaky first rating from either door suggests Resolve at the next review. Backdating
would have put hundreds of overdue cards in Today and taught the scheduler nothing true.

## Slugs are unique per source

The GFG list contains `lru-cache`, `topological-sort` and other slugs that also exist on LeetCode.
They are different problems, so the unique index is (source, slug) and export/import, the seed and
the add-flow duplicate check all key by source plus slug. Tag order is stored (`problem_tags.position`)
so the first tag of an imported row is its primary topic for interleaving and coverage.

## Tiers are the user's starting point

`core`, `warmup` and `skip` came from the file and are editable in bulk. The seed never overwrites a
tier, a title, tags, notes or a status on re-run; it only fills empty history fields. Un-archiving a
skip row simply drops it into the backlog, since it has no card.

## Review actions do not revalidate

`gradeCard` used to call `revalidatePath` for the session route. Next re-rendered the route inside
the action response, so the "what went wrong" prompt after Again or Hard was replaced by the next
card before it could be typed into. Every page under the shell is `force-dynamic`, so nothing was
ever stale; the session advances with `router.replace` when the user is done. Space now toggles the
card both ways, and the first flip is the instant that grade previews and the review timer use.

## The roadmap is a second list, not a second scheduler

The Google pattern list arrived as a standalone page: 413 problems grouped by pattern, mapped to
four weeks, with Done / Redo marks and a pace projection. It is now `/roadmap` inside Recur so the
plan and the reviser sit together, and it stays independent on purpose: the list is static data
(`data/roadmap/problems.json`), the only table is `roadmap_marks` keyed by LeetCode number, and
nothing in the scheduler reads it. Marking a roadmap problem done does not create a card; a
problem enters the schedule only through the usual add or backlog doors. Keeping the two apart
means the plan can be edited or replaced without touching memory state.

The roadmap's "today" is the review day, not the calendar day. Marks made at one in the morning
belong to the session that started the evening before, and the pace panel counts days the same way
the reviser does (`settings.dayStartHour` in `settings.timezone`). With the calendar day a late
session rolled the plan to day 2 at midnight, dropped the running average by half and called the
plan off pace while the first day was still going. Both the stamp and the pace math now use
`reviewDayKey`, so the two surfaces agree on what day it is.

## The pace verdict is a plan line, not a projection

The pace panel used to project the running average to the end of practice and call a tier on
track when the projection cleared it. That average divides by the days elapsed including today,
so it swings through the day, and a strong first day props up a weak second one: 15 on day one
and 4 on day two still projected a finish, while the user had plainly not done the day's work.
Each tier is now spread evenly over the practice days and the verdict compares Done marks with
that line at the end of today: on track (and how far ahead), N to go today when only today's
share is owed, or behind when a deficit is carried in. The tick on each bar is the plan line, so
the picture matches the words. Off days (`ROADMAP_PLAN.offDays`) are inside the window but not
practice days: the line does not move on them and nothing is due; the list is empty for now. The
plan starts Oct 14 (marks from before it still count) and runs to Nov 10, which ends at 9 am on
Nov 11 by the review day boundary, with no taper, because the user asked for every day up to the
interview to count.

The "needs N a day" figure under each bar had the same swing: it divided what was left by the days
left including today, so every mark made today lowered it and doing exactly the rate read as
getting ahead (13.9 a day on day one became 13.4 after 14 were done). It is now the rate the day
started with: today's marks are added back to the remaining count and today stays a full day, so
the figure holds through the day and moves only at the day boundary, where it becomes what is
left over the days left. Before the start and on off days there is no day to hold, so marks made
then lower it straight away.

The line itself had a related slip. It spread the whole tier over the practice days from zero,
so marks made before Oct 14 counted as day-one work: with 25 done before the start and 8 on day
one the panel said "on track, 18 ahead" next to "needs 13.9 a day", which the user read, rightly,
as 6 still to go today. The line now starts at the head start (done marks dated before the plan,
or with no day on record) and spreads the rest evenly, so its slope is the day-one needed rate
and the two figures agree: 25 + 13.9 is 39 by the end of day one, and 33 done is 6 to go. The
running average in the summary likewise covers only marks made during the plan.

## One roadmap, four bands, dashed hand-offs

The page had four separate week graphs joined by one arrow. The user asked for a single roadmap
partitioned by week with every element connected, in the spirit of NeetCode's map. The graph is one
layered layout over all 34 patterns: layers run top to bottom and belong to a week, the week bands
are drawn behind them, and each week's last layer hands off to the next week's first layer with
dashed edges, so the whole thing is one connected drawing and the reading order is the plan order.
Hand-offs do not pull nodes during layout, so each week's prerequisite tree stays centered in its
band. Below the tablet breakpoint the SVG would shrink below legibility, so phones get the same
weeks and topics as a tappable list without edges.

## The plan is a quota from Oct 20, and the tiers share it

Five days in, the user asked for the plan to be 15 a day from Oct 20 to Nov 10 instead of each
tier spread evenly from Oct 14. `ROADMAP_PLAN` now carries `perDay`, and the 92 done by Oct 19
are the head start the lines begin from (the start moved, so everything before it counts as
before the plan, the same rule as before). Everything left, 321 across every tier, at 15 a day
is 21.4 days of work; the line on Everything rises exactly 15 a day and caps at 413 on the last
day, and each tier's line rises with its share of those 15 (core 126 of 321, so about 6 a day)
rather than at 15 of its own, because the quota is on problems, not on core problems, and a line
of 15 core a day would have called core behind from the first week no matter what was done. The
"needs N a day" figure keeps its meaning, the rate that finishes the tier by Nov 10, which is
now slightly under the quota (14.6 for everything): the quota is the commitment, the needs figure
the arithmetic. With `perDay` null the old even spread is still there, and tested. The four
bands were re-tiled on what was left in each (24, 107, 152, 38), so week 1 is two days.

## Spreading the backlog moves every due date by the same number of days

With 67 due and the oldest five days overdue, the user asked for the backlog to clear in order
from tomorrow: the five-day cards tomorrow, the four-day cards the day after, and so on. That is
one shift applied to every active card, six days here (the oldest age plus one), so the relative
order the scheduler produced is kept and each day carries what one day produced. The shift is
wall-clock days in the settings timezone, so a review day maps to a review day across the
November DST change. Only `due` changes. Stability, difficulty, the interval the last grade
produced and the review logs stay as they were: ts-fsrs computes elapsed days from `last_review`
and never reads `due`, so the next grade sees a later review and the model is told nothing
false. The materialized `queue_days` row for the day is left alone; it lists ids and the queue
filters them by due. The script (`scripts/spread-backlog.mts`) reports the counts per day,
writes nothing on `--dry-run`, takes `--days N` (negative to undo) and `--backup` for a JSON of
every move. No button in the app: this is a deliberate, occasional intervention, and a script
with a dry run is the right shape for it.
