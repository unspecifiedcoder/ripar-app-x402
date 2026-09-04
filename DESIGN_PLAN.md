# Design plan

The implementation contract. Each packet is one unit of work an implementer
can take without reading the others. `DESIGN_SYSTEM.md` §-references are the
spec; this document says where each rule lands and what the screen is *for*.

**Base branch: `origin/main`.** Not `feature/ceremonies-v1` (D-011). Every
file path below is as it exists on `origin/main`.

**Order.** P-01 first, alone. Then P-02, P-03 and P-04 in parallel (disjoint
files). Then P-05 through P-10 in any order, each after its stated deps.
P-11 any time. P-12 is the director's review, not an implementer's task.

---

## The primary journey

A technical person evaluating whether to route money through this.

```
Entry        /login — the live stream is visible before signing in
  ↓
Intent       "Is any of this real?"
  ↓
State        Overview: instrument strip reads; stream shows settlements
             newest-first; the network badge says which chain
  ↓
Action       clicks verify ↗ on a row
  ↓
Response     the explorer for that chain opens on that transaction
  ↓
Feedback     returns; a new row has arrived with a gold bloom since
  ↓
Next         Agents — "who is actually being paid?" → an address → its rows
  ↓
Completion   Register — builds an unsigned transaction they can inspect
             before any wallet touches it
```

Every packet below serves a step of this. Anything that does not is out of
scope for this pass.

---

## P-01 — Foundation

**Purpose.** Make the ground ink, load the evidence face everywhere, and
honour reduced motion, so every later packet builds on the system rather
than around the old one.

**Files.** `app/globals.css`, `app/layout.tsx`, `app/mission/layout.tsx`,
`lib/mission/palette.ts`, `components/mission/bits.tsx` (Odometer only),
`components/mission/settlement-feed.tsx` (flash guard only).

**Spec.**
- `globals.css` `:root`: retire `--background/--foreground/--muted/--accent/
  --border`. `body` gets `background: var(--color-ink); color: var(--color-frost);
  color-scheme: dark;`. Add `--color-mist: #98a2b6` to the mission `@theme`
  block, and add `mist` to `PALETTE`/`RGB` in `palette.ts` with the same value.
- Move the `IBM_Plex_Mono` load from `app/mission/layout.tsx` to
  `app/layout.tsx`; apply `plex.variable` on `<html>` beside `inter.variable`.
  Delete the wrapper div's font class in the mission layout (keep `bg-ink`
  and `data-mission`).
- Scrollbars: `scrollbar-color: rgba(255,255,255,0.14) transparent`; thumb
  hover `0.24`.
- Focus: replace the blue with `outline: 2px solid var(--color-mint);
  outline-offset: 2px;` on `:focus-visible` for `button, a, input, textarea,
  select, [tabindex]`. Delete the duplicate inside `.rf-canvas`.
- `::selection`: one declaration, `background: rgba(232,182,90,0.28)`.
- Delete `.bg-metal .bg-dash .bg-editor .orb-blue .heading-grad` (unused).
- Wrap the root layout's children in `<MotionConfig reducedMotion="user">`
  from `motion/react`.
- Add `missionFlash` to the existing `prefers-reduced-motion` block so it
  does not run; and in `settlement-feed.tsx` gate the flash class on the
  hook rather than relying on CSS alone.
- `Odometer`: take `usePrefersReducedMotion()`; when reduced, set
  `textContent` to the target immediately instead of easing.

**Don't.** Touch any `components/app/**` file. Change any token *value*
other than adding `mist`. Remove `data-mission`.

**Accept.** `/mission` renders identically at 1440 (pixel-compare against
the pre-change screenshot; only the focus ring may differ). `/dashboard`
renders on an ink ground with its light components still visible (they will
look wrong; that is P-02's job). `prefers-reduced-motion` emulated on
`/mission`: `document.getAnimations().length === 0` after 3s. `npm test`,
`npx tsc --noEmit`, `npx eslint .` (0 errors), `npm run build` green.

---

## P-02 — Primitives

**Purpose.** One set of workspace components on the system, so every view
packet is composition rather than styling.

**Files.** `components/app/bits.tsx` (rewrite in place, keep every export
name and prop signature), new `components/app/table.tsx`, new
`lib/format.ts`, `lib/app-data.ts` (`STATUS_TONE` only).

**Spec — bits.tsx.** Each export per `DESIGN_SYSTEM.md`:
- `Sheet` → renders the mission `Glass` recipe (§1.2 surfaces). Keep the
  name `Sheet` so call sites do not change; import `Glass` from
  `components/mission/bits` and wrap it. `r-md`.
- `PageHead` → title `h1`, subtitle `body` `mist` max 68ch. Gains
  `network?: "mainnet" | "testnet"`; when `"testnet"` renders `<Testnet />`
  beside the title. `simulated` keeps rendering `<Simulated />`.
- `Simulated` → §2.8: `gold/85` on `gold/[0.07]`, border `gold/25`,
  `label` size, `r-full`. Text, not aria-hidden.
- new `Testnet` → §2.8: `mist` on `white/[0.06]`, border `white/[0.10]`.
- `StatusPill` → dot + word, colours from the revised `STATUS_TONE` (below).
- `SearchInput` → §2.2. `mono` when `evidence` prop is true.
- `Segmented` → §2.3.
- `Metric` → §2.6 instrument panel. Gains `tone?: "settled"` which sets the
  figure `gold`; default `frost`. Figure is `mono-lg`.
- `EmptyState` → §2.14: figure-first, one sentence `mist`, optional
  secondary action. Gains `figure?: string`.
- `SortHeader` → §2.7 head; the `<th>` contains a `<button>`.
- `CopyButton` → success flashes the *copied value's* text `mint` (§2.16)
  and label "Copied" 1.5s. Failure uses the error colour.
- `CodeBlock` → `inset` surface, `mono`, `frost/90`.
- new `ErrorPanel({ what, host, message, onRetry })` → §2.15.
- new `Loading({ label })` → §2.13 the sweeping line.

**Spec — table.tsx.** `Table`, `Th`, `Tr`, `Td` implementing §2.7,
including the phone list mode: `Table` takes `list?: (row) => { primary,
amount, secondary, proof }` and below 640px renders that instead of
`<table>`. Sticky head. Row hover `glass-raised`. `Td` gains `kind?:
"text" | "mist" | "mono" | "amount" | "settled" | "proof"` mapping to the
§2.7 column rules; `settled` is `gold` `mono` right-aligned; `proof` renders
`verify ↗` as a ghost link.

**Spec — lib/format.ts.** One `usd(baseUnitsOrDecimal, digits)` for the
workspace, moved from `app-data.ts`, no `$` prefix (amounts are USDC and say
so). `shortAddr` moves here from `real-data.ts` and is re-exported there.
Delete the `usd` in `app-data.ts`; update its importers to `lib/format`.

**Spec — STATUS_TONE.** Replace the `-500/-700` Tailwind pairs with tokens:
live/working `mint`; bidding `gold/60`; paused/draft/offline `haze`; idle
`mist`; error the error colour. `dot` and `text` both from tokens.

**Don't.** Change any prop name or remove an export. Add a fourth colour.
Style a view.

**Accept.** Every view still compiles and renders (they will look mixed;
that is expected). A Storybook-free check: a scratch page under
`app/_kit/page.tsx` (delete before merging) renders every primitive in every
state; screenshot it at 1440 and 390 and attach. `npm test`, tsc, eslint 0
errors, build green.

---

## P-03 — Shell, sidebar, palette, dialogs

**Purpose.** The chrome. §2.4, §2.10, §2.11, §2.12, and every mobile target
to 44px.

**Files.** `components/app/shell.tsx`, `components/app/sidebar.tsx`,
`components/app/shortcuts.tsx`, `components/ui/{menu,modal,slide-over,
toast,mark,app-icon,button}.tsx`, `app/dashboard/page.tsx` only if the
`<main>` landmark must move.

**Spec.**
- Root ground: remove `bg-[#fafafa]`; inherit ink.
- Sidebar §2.4: `glass`, 228 wide, items 36 tall (44 on touch — use
  `min-h-11` below `lg`), active `frost` with a 2px `frost` left bar,
  inactive `mist`. Brand block: `Mark` (D-016 variant) + "Ripar" `frost`,
  beneath it the network in `mono` `haze` — and when `data.chain.network
  === "testnet"` a `<Testnet />` badge in place of the word. The earnings
  card is a §2.6 metric: figure `gold` when > 0, `frost` when 0, `tone`
  from `mine.earnedUsdc`.
- Mobile: top bar 52px `glass`; hamburger 44×44; the drawer is a
  `SlideOver` from the left (reuse `components/ui/slide-over.tsx`, it
  already has a spring), 280 wide, with focus trap, Escape, and the scrim.
  The top bar shows the current view's *label* (not the id) at `h2`.
- Palette §2.11. Entries come from `useWorkspace()` for agents and
  endpoints and from `lib/registry-client` for directory agents — not from
  `app-data`'s generated arrays (closes the `TASKS/CONFLICTS.md` finding).
  Selected row `glass-raised`, not orange.
- `Modal`, `SlideOver`, `Toast`, `Menu` restyled to §1.6 level 2 and §2.10,
  §2.12. Keep their motion; it already uses the house easing.
- `Mark` D-016: darkest two stops → `#d84a1a` / `#b8380f`. `AppIcon` plate
  → `glass`. `Button` → §2.1 variants; delete `.btn-shine`.
- Landmarks: `<nav aria-label="Workspace">` for the sidebar, `<main>` for
  content, `<header>` for the mobile top bar.

**Don't.** Change routing or the `?view=` mechanism. Change what the palette
*does* on select. Recolour third-party OAuth logos (that is P-10).

**Accept.** Tab order unchanged from the a11y report's first 25 stops. Every
interactive element on 390 measures ≥ 44 in height (re-run the touch probe).
Escape closes the drawer and the palette; focus returns to the trigger.
Screenshots at 1440 and 390, drawer open and closed.

---

## P-04 — Arrival signal (D-014)

**Purpose.** The data layer says which settlement is new, so the one
animation that means "money just moved" is true.

**Files.** `lib/real-data.ts`, `tests/invariants/arrival.test.ts` (new).
Nothing else.

**Spec.** `RealRun` gains `arrived: boolean`. `useWorkspace` keeps a
`Set<string>` of ids across polls in a ref. On the initial load every run is
`arrived: false` and all ids are recorded. On each subsequent poll a run is
`arrived: true` iff its id was not in the set; the set is then updated.
`arrived` resets to `false` on the poll after it was true. A poll that
errors leaves the set untouched.

The pure part — `markArrivals(prev: Set<string>, runs: RealRun[]): { runs,
next }` — is exported and tested: initial load marks nothing; second call
marks exactly the new ids; third call clears them; an id that disappears and
returns is *not* re-marked (it is in the set).

**Don't.** Change any other field. Change the poll interval. Infer newness
from `when`.

**Accept.** The test passes and fails when the set logic is broken (report
the break experiment). `npm test` green. No view changes.

---

## P-05 — Overview

**Purpose.** The screen that answers "is this real?" with its proof (D-004).
**Deps.** P-02, P-04.

**Files.** `components/app/overview-view.tsx`, new
`components/app/stream.tsx`.

**Layout (desktop, §3).** Page head with the network badge and one ghost
action, "Ship an endpoint", which does what the old hero's submit did (seeds
the Chat). Then the instrument strip: four `Metric` panels in a row —
*Settled to you* (`tone="settled"` when > 0), *Endpoints live*, *Network
settlements*, *Round* — separated by rules, not gaps. Then a 12-column row:
`Stream` in 8 columns, and in 4 columns a `glass` panel "Your endpoints"
listing the manifest's endpoints with price and a `LIVE` badge each, and a
ghost link to the Endpoints view.

**The hero is deleted.** The textarea, the suggestion chips, and the radial
gradient go. Nothing replaces them at the top.

**Stream (`stream.tsx`).** A `Table` (§2.7) with columns Amount
(`settled`), Payer (`mono` `mist`), Paid to (`mono` `mist`), Round (`mono`
right), When (`mist` right), Proof. Rows keyed by `id`. Wrapped in
`AnimatePresence initial={false}`; a row with `arrived` enters per §1.7 —
`opacity 0→1, y 6→0` over 220ms with the gold bloom (an absolutely
positioned radial `gold/[0.18]` → 0 over 1100ms behind the row). Reduced
motion: no bloom, no y. Header row says "Live x402 settlements" `h2` with,
on the right, `mono` `haze` "round 66,982,883 · 2.7s" (the chain status)
and the "Open the explorer" ghost link. Shows 20 rows; "Load more" as a
ghost button reveals 20 more from `runs`.

`Stream` takes `readOnly?: boolean` (hides Load more and the explorer link;
used by P-10) and `rows?: number`.

**States.** Loading: `Loading label="reading the indexer"` in place of the
table body. Error: `ErrorPanel what="settlements" host={indexer}` above a
*retained* table if stale data exists (the hook keeps it). Empty: §2.14 —
"0 settlements in the current window" and the sentence from the existing
empty state.

**Phone.** Instrument strip stacks per §3; the stream uses list mode with
`primary` = amount, `amount` = when, `secondary` = payer → payee, `proof`.

**Don't.** Keep any part of the hero. Animate rows that are not `arrived`.
Show a `$`.

**Accept.** Two screenshots 30s apart at 1440 showing a row with the bloom
mid-fade (drive with a mocked `arrived` in dev if the chain is quiet — but
the *shipped* code must only read the real flag). 390 list mode screenshot.
Contrast spot-check: every `mist` cell ≥ 4.5:1 (it is; confirm).

---

## P-06 — Agents, Endpoints, Receipts

**Purpose.** The three settlement surfaces on the shared table.
**Deps.** P-02.

**Files.** `components/app/{agents,endpoints,receipts}-view.tsx`.

**Spec.** Each converts its hand-written `<table>` to `Table`. Column kinds:
- Agents: address `mono frost` (10…6), calls / payers `mono`, median
  `mono`, earned `settled`, last paid `mist`. The footnote ("An agent with
  one payer and many calls is usually one operator testing…") becomes the
  page subtitle's second sentence; it is the best line on the page.
- Endpoints: name `frost` + path `mono mist` beneath, status pill, method
  `mono`, price `mono`, calls `mono`, earned `settled`. The curl line stays,
  in a `CodeBlock`.
- Receipts: settled-at `mono`, payer `mono mist`, paid-to `mono mist`,
  amount `settled`, proof. The `Mine / All` segmented stays. The empty state
  is already the D-009 model; keep its words, restyle to §2.14.

Page heads carry `network`. Every explorer link uses `lib/explorer.ts`.

**Don't.** Change a column's data. Reorder columns. Add a chart.

**Accept.** Screenshots 1440 + 390 for each. Sort still works on Agents.
The claims test still passes (the copy is protected).

---

## P-07 — Directory, Job board, Register

**Purpose.** The registry surfaces — tier two — with the TestNet marker and
the sheet for the unsigned transaction.
**Deps.** P-02.

**Files.** `components/app/{directory,board,register}-view.tsx`,
`components/app/unsigned-txn.tsx`.

**Spec.**
- All three page heads: `network="testnet"` always (hardwired chain).
- Directory: the "This is not the same list as Agents" paragraph is the
  most important text on the page — it becomes a `glass` callout directly
  under the head, `body` `frost`, with the two bolded terms kept. The three
  metrics → instrument strip (figures `frost`; nothing here settled). Table
  → `Table`: id `mono`, domain `mono frost`, controlling address `mono mist`
  + explorer link, registered `mist`, jobs paid `mono`, settled `settled`
  (it *is* a settlement count, gold when > 0), validated / disputed as two
  `mono` figures `mint` / error.
- Job board: each job is a `Tr` in a `Table`, not a separate card: id
  `mono`, status pill per D-013's mapping, budget `mono`, escrow `settled`
  when held else `haze` "none", legal actions `mist` right. The footnote
  stays, `caption` `mist`.
- Register: two columns keep. Inputs §2.2 with `evidence` (mono). The
  disabled primary shows its reason in a tooltip ("Enter the signing
  address"). The explanatory panel is `glass`; its `lib/registry-compose.ts`
  reference is `mono`. The pre-check panel beneath the form is §2.13
  `Loading` while reading boxes, §2.15 `ErrorPanel` on failure.
- `unsigned-txn.tsx` → a `SlideOver` per §2.10: plain-language block first
  in `frost` `body` with amounts `mono`; the base64 in a `CodeBlock`
  (`inset`) with `CopyButton`. Title gains a `mint` check on copy.

**Don't.** Change what the registry reads. Change the compose logic. Put
gold on a figure that is not a settlement.

**Accept.** Screenshots 1440 + 390 ×3 plus the sheet open. Error state
screenshot for each (force a bad host in dev).

---

## P-08 — Workflow canvas (D-013)

**Purpose.** The canvas belongs to the same product.
**Deps.** P-01.

**Files.** `components/app/workflow-canvas.tsx`, `components/app/
{workflows-view,workflow-rail,workflow-activity-panels}.tsx`,
`app/globals.css` (`.rf-canvas` block and `.edge-flow`).

**Spec.** `<ReactFlow colorMode="dark">`. Delete the entire `.rf-canvas`
override block. `STEP_KINDS` lose `chip` and `swatch`; nodes are `glass`
with icon 16 + label `frost` + kind `label` `haze`. `Background` dots
`white/[0.08]`; `MiniMap` `maskColor rgba(7,10,16,0.7)`, `nodeColor` →
`#e8edf7` at 40%. Edges `white/[0.22]`; a running edge `mint` with
`.edge-flow`; an edge whose step settled a payment `gold`. Both canvas
grounds (`bg-[#fbfbfb]` ×2) → ink. The Workflows page head keeps
`simulated`.

**Don't.** Add a colour per step kind. Keep any `.rf-canvas` rule.

**Accept.** Screenshot of a workflow with a running edge. No light pixels
in the canvas at 1440.

---

## P-09 — Chat

**Deps.** P-02. **Files.** `components/app/chat-view.tsx`.

**Spec.** The thread on ink; user turns `glass-raised` right-aligned,
replies `glass`. The composer is a §2.2 input at 44 tall with the hint in
`caption` `haze`. The scripted-replies disclosure stays exactly where it is,
`caption` `mist`. Suggestion chips → ghost buttons. The empty state is the
existing "What should Ripar build?" restyled to §2.14 without a figure.

**Don't.** Change any reply text. Hide the disclosure.

---

## P-10 — Login (D-006)

**Deps.** P-02, P-04, P-05 (`Stream readOnly`).
**Files.** `app/login/page.tsx`, `components/auth-panel.tsx`,
`components/dashboard-preview.tsx` (replace), `components/brand-logos.tsx`
(chips only).

**Spec.** Two columns on ≥ 1024, stacked below. Left: the form as today,
on ink, inputs §2.2, primary button §2.1. The OAuth buttons that
`auth-panel` decides to show render their logo on a 24×24 `frost` chip
(`r-sm`). Right: a `glass` panel, `r-md`, containing a `label` eyebrow
"Settling now on Algorand {network}" with the network badge, then
`<Stream readOnly rows={8} />` — the real stream, the same component as the
Overview — and beneath it, `caption` `mist`: "Every row is a USDC transfer
read off the chain. Ripar is never in the path." Delete
`dashboard-preview.tsx`'s mockup entirely; the file becomes this panel. The
"HOW YOU GET PAID" card's text survives as that caption.

**Don't.** Show any view, figure, or feature that does not exist. Fake a
row. Recolour a third-party logo.

**Accept.** The claims test passes. Screenshot 1440 + 390. The right panel
shows rows with real round numbers.

---

## P-11 — Mission: phone layout and landmarks

**Files.** `components/mission/mission-control.tsx`, `components/mission/
top-rail.tsx`, `lib/mission/renderer.ts` (label collision only).

**Spec.** Below 640: the field is full-bleed and the panels become a single
bottom sheet (`glass`, 40dvh, a drag handle) holding the summary, with the
settlements list scrolling inside it; the timeline is hidden. Canvas labels
below 640: draw only the hovered agent's label and the ceremony agent's —
no resting labels, which is what collides. Landmarks: the top rail is a
`<header>`, the field wrapper a `<main aria-label="Mission Control">`, and
"Mission Control" becomes the page's `<h1>` (visually as now).

**Don't.** Change the economy or renderer beyond the label rule. Change the
desktop layout.

**Accept.** 390 screenshot with no overlapping labels. Landmark dump shows
one `main`, one `header`, one `h1`.

---

## P-12 — Director's review

After each packet lands: screenshot at 1440 and 390, compare to this plan,
check §18 of the brief (embarrassing beside the best? template? one-sentence
identity? one screenshot-worthy moment? every element earning its place?).
GREEN continues; anything else stops the chain.
