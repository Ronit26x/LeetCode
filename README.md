# Recur

**Production:** https://recur-ronit.vercel.app (GitHub sign-in, restricted to one account)

A personal LeetCode tracker and spaced-repetition reviser built for interview prep. Every solved
problem becomes a flip card scheduled by FSRS-6 (through `ts-fsrs`). Each morning at 9 AM Pacific,
Today lists exactly which problems to revise or re-solve, interleaved across topics, with the
interval each grade would schedule shown on the grade buttons.

Single user. Not a product. No AI features inside the app: it tests you, it never answers for you.

## Local setup

```bash
pnpm install
cp .env.example .env.local        # fill in the values below
pnpm db:migrate                   # runs drizzle migrations against DIRECT_URL
pnpm dev                          # http://localhost:3000
```

`.env.local` needs, at minimum:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler (port 6543); the app uses `prepare: false` |
| `DIRECT_URL` | Supabase session pooler (port 5432); used by drizzle-kit |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | A GitHub OAuth app whose callback is `http://localhost:3000/api/auth/callback/github` |
| `AUTH_TRUST_HOST` | `true` |
| `ALLOWED_GITHUB_LOGIN` | The only GitHub login allowed to sign in |
| `CRON_SECRET` | Any long random string; Vercel sends it as a bearer token to the cron route |

Optional: `RESEND_API_KEY` and `NUDGE_EMAIL_TO` turn on the 9 AM email; `AUTH_TEST_LOGIN` enables a
test-only credentials provider outside production (used by Playwright and offline development);
`DATABASE_URL=pglite://.pglite` runs an in-process Postgres for offline development.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, `tsc --noEmit`, Prettier |
| `pnpm test` | Vitest: day boundary and DST, mode heuristic, retention ramp, queue interleaving, grading and undo (on PGlite) |
| `pnpm test:e2e` | Playwright smoke: sign in, add from a URL (stubbed LeetCode), solve, review, grade, undo, theme persistence, tab-safe copy |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | drizzle-kit |
| `pnpm db:seed` | Sample data, local databases only |
| `pnpm screenshots` | Every screen in Light, Dim and Dark at desktop and phone widths |
| `pnpm deploy` | `vercel --prod` |

The full write-up (how FSRS is used and why, Revise vs Resolve, the mode heuristic, the day
boundary) lands with the final phase. See `DESIGN.md` for the visual direction and
`DECISIONS.md` for every judgment call.
