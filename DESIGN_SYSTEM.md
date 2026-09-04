# Design system

The rules. `DESIGN_DECISIONS.md` says why; this says what. An implementer
should be able to build any surface from this document plus `DESIGN_PLAN.md`
without inventing a colour, a size, or a motion.

Identity in one sentence: **ledger-dark instrumentation with a single warm
signal, where the only things that glow are things that actually happened
on-chain.**

---

## 1. Foundations

### 1.1 Type

Two faces. The split is by *kind of content*, never by size or emphasis.

| Role | Face | Used for |
|---|---|---|
| Prose | Inter (`--font-inter`) | sentences, headings, buttons, navigation, captions that describe |
| Evidence | IBM Plex Mono (`--font-plex`) | addresses, amounts, rounds, tx ids, timestamps, prices, handles, anything a reader might copy or compare |

Plex Mono moves from `app/mission/layout.tsx` to `app/layout.tsx`. Both
faces are loaded once, app-wide.

**Scale.** Pixels, not rems, because every value here was chosen against
a rendered screen and rems invite drift.

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 28 / 32 | 600 | −0.02em | one per page at most; the Overview revenue figure |
| `h1` | 20 / 26 | 600 | −0.02em | page title |
| `h2` | 15 / 20 | 600 | −0.01em | section title |
| `body` | 13.5 / 20 | 400 | 0 | paragraphs, subtitles |
| `table` | 12.5 / 18 | 400 | 0 | table cells |
| `caption` | 11.5 / 16 | 400 | 0 | help text under a control |
| `label` | 10 / 14 | 500 | +0.12em, uppercase | column heads, section eyebrows, badges |
| `mono` | inherits size | 400 | 0 | always with `tnum` (tabular numerals) |
| `mono-lg` | 22 / 26 | 400 | −0.01em | a single figure meant to be read from across the room |

Numerals are tabular everywhere a number can change (`font-variant-numeric:
tabular-nums`). A column of amounts must not jitter when a digit changes.

### 1.2 Colour

Five tokens exist. One is added. No others are introduced.

| Token | Value | Meaning |
|---|---|---|
| `ink` | `#070a10` | the ground. Everything sits on it. |
| `frost` | `#e8edf7` | primary text |
| `mist` | `#98a2b6` **(new)** | secondary text that must still be *read* — a second column, a subtitle, a timestamp |
| `haze` | `#6b7a93` | chrome: labels, dividers, placeholder text, disabled — things that are *seen* rather than read |
| `gold` | `#e8b65a` | money that moved on MainNet. Nothing else. (D-002) |
| `mint` | `#9ee6c8` | alive: a live endpoint, a connected socket, a pulse |

Why it is not called `dim`: `lib/mission/palette.ts` already exports `dim`
as the canvas-side name for `haze` (`#6B7A93`). A second `dim` at a different
value would be a bug waiting for whoever next reads that file. The CSS/TS
palette split (haze/dim) is pre-existing and stays; `mist` is added to both.

Why `mist` exists: measured contrast. On the glass surface (white at 6% over
ink) `haze` is **4.06:1**, below the 4.5:1 body-text floor; at the 80%
opacity the mission screen uses it is 3.29:1. `haze` is therefore legal for
labels at ≥ 11px uppercase-tracked (UI text, 3:1 floor) and for non-essential
chrome, and illegal for a table's second column. `mist` is frost at ~62%,
composited: 6.3:1 on ink, 6.1:1 on glass. Use `mist` wherever a reader is
expected to actually read the words.

**Measured ratios** (composited on ink / on glass):

| Pairing | on ink | on glass | Legal for |
|---|---|---|---|
| frost | 16.9 | 15.0 | anything |
| frost/70 | 8.4 | 7.9 | body |
| frost/50 | 4.7 | 4.6 | body, barely — prefer `mist` |
| mist | 6.4 | 6.1 | body |
| haze | 4.6 | 4.1 | labels, chrome — **not** body |
| haze/80 | 3.3 | 3.1 | labels only |
| gold | 10.6 | 9.5 | anything |
| gold/85 | 7.8 | 7.2 | body (the Simulated badge) |
| gold/60 | 4.3 | 4.2 | large text, UI |
| mint | 13.8 | 12.3 | anything |

**Surfaces.**

| Surface | Value | Use |
|---|---|---|
| ground | `ink` | page |
| glass | `white/[0.06]` + `backdrop-blur-md` + border `white/[0.08]` | panels, cards, the sidebar. This is the mission `<Glass />`. |
| glass-raised | `white/[0.09]` + border `white/[0.12]` | a hovered row, a focused card, a dialog |
| inset | `black/30` | code blocks, the base64 of a transaction, an input's well |

**Semantic states.** These are *states*, not a palette; they are used only
on the element in that state.

| State | Colour | Note |
|---|---|---|
| success | `mint` | settled, live, connected |
| warning | `gold/85` on `gold/[0.07]` | the Simulated badge, and only that |
| error | `#f28b82` on `#f28b82/[0.08]` | the one red. Used for "could not read the registry", failed calls, invalid input. Never for money. |
| info | `frost` | there is no blue. Information is the default state. |

**Rules.**
- No gradients on surfaces. The one radial glow permitted is behind a *real*
  settlement's arrival (§1.7), and it is gold.
- No pure white (`#fff`) text. Frost is white enough; pure white on ink
  halos.
- Orange (`accent`, the old workspace's `#f97316`-family) is retired. Its
  jobs are taken by gold (money) and frost (emphasis).
- Colour never carries a meaning alone. Gold is always beside a number or
  an explorer link; mint is always beside the word "Live"; error is always
  beside a sentence.

### 1.3 Spacing

A 4px base. Named steps, and only these:

`1`=4 · `2`=8 · `3`=12 · `4`=16 · `5`=20 · `6`=24 · `8`=32 · `10`=40 · `12`=48 · `16`=64

- Inside a component: 2–4.
- Between components in a group: 3–4.
- Between sections: 8–10.
- Page gutter: 5 (≤ 640px), 6 (tablet), 8 (desktop).
- Table cell padding: 3 vertical, 3 horizontal. Rows are 36px at `table`
  size, 40px when a cell has two lines.

Whitespace separates *sections*. It does not pad *rows*. (D-008)

### 1.4 Radius

| Token | Value | Use |
|---|---|---|
| `r-sm` | 6 | inputs, buttons, badges, table row hover |
| `r-md` | 10 | cards, panels, dialogs |
| `r-full` | 9999 | pills: the Simulated badge, the Live badge, avatars |

No 16px+ radii. Large radii read as consumer-app; this is an instrument.

### 1.5 Borders

Borders exist to separate glass from ground and rows from rows. They do not
decorate.

- Glass edge: `white/[0.08]`, 1px.
- Row divider: `white/[0.06]`, 1px, between rows only — never above the
  first or below the last.
- Focus: see §4.
- No borders on buttons except the ghost variant (§2.1).
- A border that is the only thing distinguishing two adjacent surfaces is a
  sign one of them should not exist.

### 1.6 Elevation

Two levels. Glass sits on ground; a dialog sits on glass.

| Level | Treatment |
|---|---|
| 0 — ground | none |
| 1 — glass | the blur and the 6% fill. No drop shadow; the blur *is* the elevation. |
| 2 — dialog / palette | glass-raised + `shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)]` + a `black/50` scrim behind |

Nothing else casts a shadow. A card with a shadow on a dark ground is a
card that could not decide whether it was floating.

### 1.7 Motion

Motion is information. It happens because something happened. Every
animation here answers "what changed?"; none answers "isn't this nice?".

| Moment | Motion | Duration / ease | Reduced motion |
|---|---|---|---|
| **A real settlement arrives** | row enters at `opacity 0 → 1`, `y 6 → 0`; simultaneously a gold radial glow (`gold/[0.18]` → 0) blooms behind the row and fades | 220ms enter · 1100ms glow · ease-out `[0.16,1,0.3,1]` | row is present, no glow |
| Page / view enters | content `opacity 0 → 1`, `y 8 → 0` | 320ms, same ease | instant |
| Glass panels on first paint | staggered 60ms apart, same as above | 320ms | instant |
| Hover on a row | background `→ glass-raised` | 120ms linear | same (not motion) |
| Button press | `scale 0.985` | 80ms | same |
| Odometer (a live figure changing) | digits ease toward target | time-constant 240ms | snaps |
| Loading | a 1px `mint/60` line sweeping across the top of the panel, 1.2s loop | — | static `mint/60` bar |
| Error | none. The error appears. Shaking things is for forms that were wrong; a chain read failing is not the reader's fault. | — | — |
| Dialog / palette | `opacity 0 → 1`, `scale 0.98 → 1` | 160ms | instant |
| Success (a transaction built / copied) | the affected value flashes `mint` for 600ms then returns | 600ms | colour change only |

The settlement-arrival bloom is the product's signature (D-005). It is
triggered only by the data layer reporting a row it has not delivered before.
It must not fire on initial load, on re-sort, on poll, or on re-mount.

`prefers-reduced-motion: reduce` is honoured everywhere through the existing
`usePrefersReducedMotion` hook. Reduced motion removes *movement*; it keeps
colour changes and opacity fades ≤ 200ms.

---

## 2. Components

### 2.1 Button

| Variant | Ground | Text | Border | Use |
|---|---|---|---|---|
| primary | `frost` | `ink` | none | one per view at most. "Withdraw", "Build transaction". |
| secondary | `white/[0.08]` | `frost` | none | most actions |
| ghost | none | `mist` | `white/[0.10]` | "View manifest", "Open the explorer" |
| danger | `#f28b82/[0.12]` | `#f28b82` | none | destructive, and it confirms |

Height 32 (default), 28 (in a table row or page-head), 40 (a form's
submit). Padding 3 horizontal. `r-sm`. `body` size, 500 weight. Icon
16px, gap 2.

Hover: ground +3% white. Active: `scale 0.985`. Disabled: `opacity 0.4`,
`cursor-not-allowed`, and the tooltip says *why* (a disabled button with no
reason is a bug).

### 2.2 Input

Height 36. Ground `inset`. Border `white/[0.08]`, on focus `mint/50` + the
focus ring (§4). Text `frost`, placeholder `haze`. `r-sm`. Padding 3.

Evidence inputs (an address, an amount) are `mono`. A monospace input
validates as you type; invalid shows the error colour on the border and one
sentence beneath at `caption` size, and *does not* clear the field.

### 2.3 Select / Segmented

Segmented (the "All / Mine", "24h / 7d / 30d" controls): a `glass` pill
containing options at `table` size; the selected option is `glass-raised`
with `frost` text, others `mist`. Counts beside labels are `mono` `haze`.

Native `<select>` styled as an input, with a `haze` chevron. No custom
dropdowns; the platform's is more accessible and this product does not
need to be clever here.

### 2.4 Navigation (sidebar)

Width 228 (desktop). `glass`. Items 36 tall, `body` size, `mist` text; the
active item is `frost` with a 2px `gold` bar on its left edge — the one
place gold appears outside money, and it means "you are here, at the money."

*Correction:* no. Gold means money (D-002). The active bar is `frost`.

Section eyebrows (`label`) in `haze`. The wordmark at top in `frost`; the
network beneath it in `mono` `haze` ("Algorand MainNet").

Below 1024: the sidebar becomes a top bar (52px, `glass`) with a menu
button opening a full-height `glass-raised` sheet from the left, 280 wide,
scrim behind. The current view's title sits in the top bar.

### 2.5 Tabs

Not used. Views are pages (D-007) and in-page choices are Segmented.

### 2.6 Card / Panel

`glass`, `r-md`, padding 4 (dense) or 5. A panel has at most: an eyebrow
(`label`, `haze`), a title (`h2`), a body, and one action in its top-right.
A card with two actions is two cards.

Metric panels (the instrument strip): eyebrow, then the figure in `mono-lg`
`frost` (or `gold` if it is settled MainNet money), then one line of
`caption` `mist` saying what the figure counts. Four across on desktop, two
on tablet, one on phone, separated by a `white/[0.06]` rule — not by gaps.

### 2.7 Table

The workhorse. The mission settlements panel is the reference.

- Column heads: `label`, `haze`, left-aligned for text, right-aligned for
  numbers. Sortable heads show a `haze` chevron; the active sort is `frost`.
- Rows: 36px, `table` size, dividers per §1.5. Hover `glass-raised`.
- Text columns `frost`; secondary text columns `mist`; evidence columns
  `mono`.
- Amounts right-aligned, `mono`, `tnum`. MainNet USDC that moved: `gold`.
  Everything else: `frost`.
- Addresses: `shortAddr` (6…4), `mono`, `mist`, full address in `title=`.
  Clicking copies; the value flashes `mint` (§1.7 success).
- The proof column is always last and always says `verify ↗` as a ghost
  link to the explorer. It is never an icon alone.
- Sticky head when the table scrolls. Max 20 rows before an explicit
  "Load more" — never infinite.
- On phone (< 640): the table becomes a list. Each row is a two-line item:
  line one `frost` primary + amount right-aligned; line two `mist` `mono`
  address + time + `verify`. Horizontal scroll is never the answer.

### 2.8 Badge

Pill, `r-full`, `label` size, padding 2 horizontal / 1 vertical.

| Badge | Treatment | Meaning |
|---|---|---|
| `SIMULATED` | `gold/85` on `gold/[0.07]`, border `gold/25` | generated in the browser (D-012 tier 3). The loudest badge, on purpose. |
| `TESTNET` | `mist` on `white/[0.06]`, border `white/[0.10]` | a real chain, no real money (tier 2) |
| `LIVE` | `mint` dot + `mint` text, no fill | an endpoint serving now |
| `MAINNET` | not a badge. MainNet is the default; it is said in the sidebar and not repeated. |

Status pills (Settled / Pending / Refunded / Failed) are a 6px dot + word:
`mint` / `gold/60` / `haze` / error.

### 2.9 Tooltip

`glass-raised`, `caption` size, `frost`, max-width 280, `r-sm`, 150ms fade.
Appears on hover *and* focus. Used for full addresses and for the reason a
control is disabled. Never for information a user needs to complete a task.

### 2.10 Dialog / Sheet

Level-2 elevation. Max-width 520 (dialog) or full-height 420 wide from the
right (sheet). Title `h2`; close is an icon button top-right *and* Escape;
the first focusable element receives focus on open; focus returns to the
trigger on close. Scrim click closes unless the dialog holds unsaved input.

The unsigned-transaction panel (`unsigned-txn.tsx`) is a sheet: plain
language first, then the base64 in an `inset` `mono` block with a copy
button. The plain-language block is `frost` at `body`; the amounts in it are
`mono` and, if MainNet USDC, `gold`.

### 2.11 Command palette (⌘K)

Level-2. 560 wide, top-aligned at 15vh. Input at 40px, `body`. Results in
groups with `label` eyebrows. Each result: icon 16, name `frost`, and on the
right its kind in `mono` `haze` ("view", "agent", "endpoint"). Arrow keys
move, Enter selects, Escape closes. Entries come from the same data the
views render — the palette that jumps to an agent must be built from the
list that page shows (this is the open finding in `TASKS/CONFLICTS.md`).

### 2.12 Notification / toast

Bottom-right, `glass-raised`, `r-md`, 360 wide, one line of `body` `frost`
and an optional action. Auto-dismiss 6s except errors, which stay until
dismissed. Never more than two stacked.

### 2.13 Progress / loading

The sweeping line (§1.7). Skeletons are not used: a skeleton pretends to
know the shape of data it has not read. A panel that is loading shows its
eyebrow and title and the sweeping line, and nothing else.

### 2.14 Empty state (D-009)

Not an illustration. A `glass` panel containing the figure that would have
been there, reading zero, and one sentence in `mist` saying why. Where a
next action exists it is a secondary button, not a primary one.

> **0.00 USDC** — no paid calls to your address. The endpoint is live and
> quoting; this stays zero until somebody pays.

### 2.15 Error state

A `glass` panel with the error colour on its left edge (3px), a sentence
in `frost` saying what could not be read and from where (the host name), the
verbatim message in `mono` `mist` beneath, and a "Retry" secondary button.
Nothing is hidden behind "something went wrong".

### 2.16 Success state

The affected value flashes `mint` (§1.7). Where a transaction was built: the
sheet's title gains a `mint` check and the copy button's label becomes
"Copied" for 1.5s. No confetti, no full-screen takeover.

---

## 3. Layout

- Max content width 1280, centred. The stream and tables may go to 1440
  on ultrawide; prose never exceeds 68ch.
- Desktop (≥ 1024): sidebar 228 + content. Content grid 12 columns, 24
  gutters. The Overview: instrument strip full width; stream 8 columns;
  the endpoints summary 4 columns beside it.
- Tablet (640–1023): sidebar collapses to the top bar. Grid 8 columns, 20
  gutters. Instrument strip 2×2. Stream full width; secondary panels below.
- Phone (< 640): single column, gutter 20. Tables become lists (§2.7). The
  instrument strip stacks; the first metric is `mono-lg`, the rest `table`
  size in a compact row.
- The mission screen keeps its own full-bleed layout; this section does not
  apply to it.

What survives on phone: the stream, the metrics, the proof links, the
badges. What collapses: the sidebar (to the top bar), tables (to lists).
What disappears: nothing. If it was worth showing on desktop it is worth
scrolling to on a phone.

---

## 4. Accessibility

- **Contrast.** Per the measured table in §1.2. Body text ≥ 4.5:1; labels
  and UI ≥ 3:1. `haze` is never body text.
- **Focus.** A 2px `mint` ring with 2px offset, on every interactive
  element, visible only for `:focus-visible`. It is the same on every
  component; a product with three focus styles has none.
- **Keyboard.** Every action reachable by Tab in reading order. ⌘K opens
  the palette from anywhere; Escape closes any layer. Table rows are not
  focusable, their links and buttons are. Sortable heads are buttons.
- **Reduced motion.** §1.7. Honoured via `usePrefersReducedMotion`, which
  already exists.
- **Semantics.** One `<h1>` per page. Landmarks: `<nav>` for the sidebar,
  `<main>` for content, `<header>` for the top bar. Tables use `<th scope>`.
  The canvas keeps its `role="img"` and `aria-label`. Badges are text, not
  `aria-hidden` — "Simulated" must be announced.
- **Touch.** Every target ≥ 44×44 on phone, including table-row links (the
  list item is the target, not the 12px link inside it).
- **Colour.** Never the only carrier (§1.2). Gold is beside a number; mint
  is beside "Live"; error is beside a sentence.

---

## 5. Provenance (D-012)

Three tiers. Every figure and row is in exactly one, and an implementer who
cannot say which tier a value belongs to must stop.

| Tier | Badge | Colour for the figure | Proof |
|---|---|---|---|
| Settled on MainNet | none (default) | `gold` | `verify ↗` to allo.info |
| Registered on TestNet | `TESTNET` | `frost` | `verify ↗` to lora.algokit.io |
| Simulated | `SIMULATED` | `frost` | none, and the copy says so |

The mission screen is tier 3 throughout and its badge is already correct.
