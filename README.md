# @matchops/shared

Logic shared by the **MatchOps web app** (`pitch-pulse-broadcast`) and the **Windows
graphics app** (`matchops-graphics`).

Installed straight from git — no registry, no publish step:

```jsonc
"@matchops/shared": "github:zemang86/matchops-shared#v0.5.3"
```

**`dist/` is committed, on purpose.** Consumers install from a git tag, and a git dependency
that has to compile itself on install depends on the consumer's package manager running
`prepare` — not every one does, and the failure is a production build that cannot resolve
any subpath. With the output in the tag, any package manager installs it with no build step
and no TypeScript. The cost is rebuilding `dist/` before every tag; see Releasing.

## The rule that keeps this useful

**Pure functions and constants only. No React, no Supabase client, no DOM.**

It has to run in a browser, in Electron's main process and in Node. The moment it
imports a framework it stops being shareable and starts coupling the two apps'
internals — at which point it is worse than duplication.

Deliberately **not** here:

| | Why |
|---|---|
| Generated Supabase types | Regenerate where they are used, with the web repo's `npm run db:types`. The database is the contract. |
| `vmixTransformers.ts` | vMix-specific; the graphics app has its own template contract. |
| React components, query hooks | App internals. Sharing them couples release cycles. |
| Hand-written entity types (`common.ts`) | App-level view models, and they overlap the generated types. Regenerate rather than share. |

## What is here

Five entry points, the `exports` in `package.json`:

- **`@matchops/shared`** — `clock.ts`, the match clock (`getMatchClock()` /
  `getMatchMinute()`); `logos.ts`, team badge storage paths and broadcast URLs; and
  `format.ts`, shared display formatting.
- **`@matchops/shared/playout`** — the playout bus and the graphics manifest: five layers,
  ducking, autoOut, seq guards and panic. Plain JavaScript with no imports, so the Windows
  app runs it in its main process and the web tier runs it in a function.
- **`@matchops/shared/domain`** — the domain model: what a match, a live feed, a team sheet
  and a graphic are.
- **`@matchops/shared/arming`** — what a graphic will put on air, worked out before the
  operator presses TAKE. It also re-exports the readers it is built on: `events.ts` (the
  event pool and the bug's red cards), `passes.ts` (the pass board), `headline.ts` and
  `flash.ts`.
- **`@matchops/shared/stopwatch`** — the operator's stopwatch, as pure transitions. Not the
  match clock.

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

**Cut the release on a branch, tag it there, and fast-forward `main` to the release
before tagging the next one.** A release that is only reachable from a feature branch
leaves `main` describing a package nobody installs, and the next release branch has
nowhere sound to start from.

```bash
# on the release's branch, never on main
npm run build                  # dist/ is committed: rebuild it and commit the result
npm test                       # node:test, no deps
npm version patch --no-git-tag-version   # or minor/major
git commit -am "chore(release): x.y.z — what it carries"
git tag vx.y.z
git push -u origin HEAD && git push origin vx.y.z
# then bump the tag in each consumer's package.json

# once the consumers run on it, and before the next tag
git switch main && git merge --ff-only vx.y.z && git push origin main
```

Consumers pin an exact tag. Nothing updates itself behind your back mid-season.
