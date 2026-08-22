# @matchops/shared

Logic shared by the **MatchOps web app** (`pitch-pulse-broadcast`) and the **Windows
graphics app** (`matchops-graphics`).

Installed straight from git — no registry, no publish step:

```jsonc
"@matchops/shared": "github:zemang86/matchops-shared#v0.1.0"
```

`npm run prepare` builds on install, so consumers get `dist/` without it being committed.

## The rule that keeps this useful

**Pure functions and constants only. No React, no Supabase client, no DOM.**

It has to run in a browser, in Electron's main process and in Node. The moment it
imports a framework it stops being shareable and starts coupling the two apps'
internals — at which point it is worse than duplication.

Deliberately **not** here:

| | Why |
|---|---|
| Generated Supabase types | Regenerate in each repo with `npm run db:types`. The database is the contract. |
| `vmixTransformers.ts` | vMix-specific; the graphics app has its own template contract. |
| React components, query hooks | App internals. Sharing them couples release cycles. |
| Hand-written entity types (`common.ts`) | App-level view models, and they overlap the generated types. Regenerate rather than share. |

## What is here

- **`clock.ts`** — the match clock. `getMatchClock()` / `getMatchMinute()`.
- **`logos.ts`** — team badge storage paths and broadcast URLs.
- **`format.ts`** — shared display formatting.

## Why the clock lives here

Two disagreeing implementations already existed in the web repo: `matchUtils.ts`
derived the minute from time elapsed since `kickoff_at`, while `Scorebug.tsx` used the
highest logged event minute — which does not tick at all. Fine for a lower-third that
is on screen for eight seconds; fatal for a scorebug that is up for ninety minutes.

The clock is a **pure function of `now` and a start timestamp**, never a stream. So it
keeps running when the venue uplink drops — precisely when it must not stop — and it
survives an app restart.

It prefers `matches.period_started_at` (migration 026). Without it, it falls back to
scheduled `kickoff_at` assuming a 15-minute half time, and sets **`isEstimate: true`**
so the UI can say so. A late kickoff is the normal case, not the exception.

## Releasing

```bash
npm test                       # 15 tests, node:test, no deps
npm version patch              # or minor/major
git push && git push --tags
# then bump the tag in each consumer's package.json
```

Consumers pin an exact tag. Nothing updates itself behind your back mid-season.
