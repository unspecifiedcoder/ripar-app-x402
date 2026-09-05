# Handoff — the ledger-dark redesign

Read this first. Then `DESIGN_DECISIONS.md`, `DESIGN_SYSTEM.md`, `DESIGN_PLAN.md`.
Those three are the source of truth; this file says where the work stands.

## What this is

A redesign of the Ripar workspace onto the visual identity its own Mission
Control screen already had: ink ground, gold only for money that settled,
IBM Plex Sans for prose and Plex Mono for evidence, no tracked capitals, no
entrance motion, one animated moment — a gold bloom when a real settlement
lands. The reason is in the first section of `DESIGN_DECISIONS.md`: the
surface with the *real* Algorand data looked like a template and the one
with the *simulated* data looked alive.

Base branch is `origin/main` (nickthelegend/ripar-app-x402). Work is on
`design/ledger-dark`. The older `feature/ceremonies-v1` is 51 commits stale
and is not the base for anything here.

## State of `design/ledger-dark` (all verified, all committed)

| Commit | Packet | What landed |
|---|---|---|
| e5c7d04, 30c4833 | — | the three design documents, revised against the frontend-design skill |
| 2752187 | P-00 | vitest + the claims and labelling invariant tests, ported to main |
| 00e08ea | P-04 | `arrived: boolean` on RealRun via pure `markArrivals`, tested |
| d685f7a | — | gitignore Next 16's generated AGENTS.md / CLAUDE.md |
| dec0b60, 8302247 | P-01, D-018 | ink ground, Plex Sans + Mono app-wide, mint focus ring, MotionConfig, reduced-motion fixes, `mist` token |
| 42669fb | P-02 | every primitive in `components/app/bits.tsx` rebuilt on the system; new `components/app/table.tsx`; `lib/format.ts` |
| 02afdbf | P-11 | mission screen: sentence-case labels, phone bottom sheet, landmarks |

Gates at 02afdbf: `npx tsc --noEmit` 0 · `npm run build` 0 · `npm test` 85
pass / **1 deliberate red** (see below) · `npx eslint .` 2 pre-existing
errors (`chat-view.tsx:92`, `shell.tsx:72`) that predate this branch.

**The workspace looks wrong at 02afdbf on purpose.** The primitives render
frost text, but `components/app/shell.tsx` still paints a `#fafafa` ground
over the ink body, so everything is frost-on-white. P-03 fixes the ground.

## Two packets in flight, on topic branches, unreviewed

- **`design/p03-shell`** (e040e51) — P-03: shell, sidebar, mobile drawer,
  ⌘K palette, `components/ui/*`, brand marks. All 11 files touched; tsc
  clean (the commit message says one error remains — it was fixed after
  the message was written). **Not screenshotted, not merged.** Do the
  P-03 acceptance criteria from `DESIGN_PLAN.md` before merging.
- **`design/p08-canvas`** (f76c304) — P-08: workflow canvas on React Flow
  `colorMode="dark"`, five swatches removed, `.rf-canvas` overrides
  deleted. tsc clean. **Not screenshotted, not merged.** Same: run its
  acceptance criteria first.

Merge order: P-03 first (it turns the ground; nothing else is judgeable
until it lands), then P-08. Both are disjoint from each other and from
`design/ledger-dark`'s tip, so the merges should be clean.

## What is left (from `DESIGN_PLAN.md`)

After P-03 merges, in this order, two at a time at most:

1. **P-05 Overview** — delete the prompt-box hero; instrument strip; the
   settlement `Stream` with the arrival bloom driven ONLY by `arrived`.
2. **P-06 Agents / Endpoints / Receipts** — three tables onto `Table`.
3. **P-07 Directory / Job board / Register** — the TestNet registry
   surfaces; status pills per D-013; the unsigned-transaction sheet.
4. **P-09 Chat.**
5. **P-10 Login** — replace the mockup with `<Stream readOnly />`. This is
   what turns the deliberate red test green.
6. **P-12** — the director's review of every surface at 1440 and 390
   against §18 of the brief.

Each has a full spec in `DESIGN_PLAN.md`; write the implementer's packet
from that section plus the `DESIGN_SYSTEM.md` §-references it names.

## Rules that were learned the hard way

- **The deliberate red test.** `tests/invariants/claims.test.ts` fails on
  `components/dashboard-preview.tsx` because the login mockup says "Let
  agents bid, pay on a verified result" and there is no bidding feature.
  Do not allowlist it. P-10 deletes that mockup; the test going green is
  how you know P-10 did its job.
- **One worktree per concurrent agent.** Two engineers in one checkout
  reverted each other's edits and collided on `.next`. Give each packet
  its own `git worktree` on its own topic branch, merge back.
- **Check exit codes, not piped output.** `npx tsc … | head` hides the
  failure. Use `cmd; echo $?`.
- **Stale `next start` servers lie.** A server started before a rebuild
  serves an unhydrated shell that looks like a blank page or a regression.
  Kill by PID (`ss -ltnp`), never `pkill -f` (it matches its own command
  line). Restart after every build before screenshotting.
- **Look at the screenshot.** Every packet's acceptance includes reading
  the PNG. A green build with an invisible field has happened twice.
- **`verify.sh` for the mission economy lives only on
  `feature/ceremonies-v1`.** It is not on this branch; the economy files
  are untouched here, which is why that is acceptable.
- **Gold means it settled** (D-002). `tone="settled"` and `kind="settled"`
  are the only routes to gold. A quote, a budget, a TestNet registration
  do not get it. The `TestNet` badge tells the reader whether the gold is
  money.
- **No `uppercase`, no `tracking-[` with a positive value, no section
  fade-ins, no middle-dot meta strings** (D-017, D-019, §2.6a). The
  negative tracking on h1 and mono-lg is intentional.

## How to verify anything

```
npx tsc --noEmit; echo tsc=$?
npx eslint .;      echo eslint=$?
npm test;          echo test=$?      # expect 1 red until P-10 lands
npm run build;     echo build=$?
npx next start -p 3004               # then screenshot, then LOOK
```

Reference captures of `origin/main` before any of this, for comparison,
are described in `DESIGN_DECISIONS.md` (the login mockup, the light
overview, the mission screen). The mission screen on this branch must
match its previous self at 1440 except for label case.

## Three things a fresh session gets wrong unless told

**Commit identity.** Every commit on this branch is authored
`Ravi Shankar Bejini <ravishankarbejini@gmail.com>`. That was set per
commit with `-c`, not in config, so a new environment will commit as
whatever its integration provides. Set it once, repo-local, before the
first commit:

```
git config user.name  "Ravi Shankar Bejini"
git config user.email "ravishankarbejini@gmail.com"
```

**Screenshots.** Use Playwright with its bundled Chromium
(`npx playwright install chromium` first), not an ad-hoc headless
launch. Desktop: viewport 1440×900, deviceScaleFactor 1. Phone: viewport
390×844, deviceScaleFactor 2, `isMobile: true`, `hasTouch: true`. Wait
at least 4500 ms after navigation on /mission and 8000 ms on /dashboard
(the indexer read takes ~5 s) before capturing. For the reduced-motion
check use `page.emulateMedia({ reducedMotion: "reduce" })` and evaluate
`document.getAnimations().length` after 3 s. Captures made any other
way are not comparable to the ones the plan was written against.

**Stopping.** If you stop for any reason — a STOP condition, a failed
gate you cannot fix, end of session — leave the tree clean on the last
green per-packet commit, and state exactly which packet and which
acceptance criterion you stopped at. Never leave a half-finished packet
uncommitted and unmentioned.
