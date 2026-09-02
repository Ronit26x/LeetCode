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
