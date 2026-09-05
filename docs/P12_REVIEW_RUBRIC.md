# P-12 — Director's review rubric

One copy of the checklist per screen. Fill every row with GREEN, AMBER or RED and one line
of evidence (a screenshot filename, a measured number, or a quoted string). Anything not
GREEN stops the chain (DESIGN_PLAN.md P-12).

Screens, in journey order: `/login`, Overview, Agents, Endpoints, Receipts, Directory,
Job board, Register, Chat, Workflows, `/mission`.

Captures per screen: `<screen>-1440.png`, `<screen>-390.png`, plus any state the packet's
acceptance names (drawer open, sheet open, error state, bloom mid-fade, running edge).

---

## Screen: ____________________   Captures: ____________________

### A. The primary journey (DESIGN_PLAN.md) — does this screen serve its step?

| # | Check | Result | Evidence |
|---|---|---|---|
| A1 | Which journey step this screen serves (Entry / Intent / State / Action / Response / Feedback / Next / Completion). If none, it is out of scope for this pass — say so. | | |
| A2 | The network badge is present in the page head and reads TestNet when the workspace chain is TestNet, absent on MainNet; Directory, Job board and Register carry it always, because the registry is hardwired to TestNet (D-002, D-012). | | |
| A3 | Every `verify ↗` opens the explorer for the chain the row was read from (`lib/explorer.ts`). Click one. | | |
| A4 | A cold reader can answer "is any of this real?" from the screen without scrolling. | | |

### B. Hard rules — mechanical, run the greps and read the PNG

| # | Check | Result | Evidence |
|---|---|---|---|
| B1 | Gold appears only on `tone="settled"` / `kind="settled"` and only where the figure is > 0. List every gold pixel's source. | | |
| B2 | No `uppercase`, no positive `tracking-[`, no `tracking-wide*`. `grep -nE "uppercase\|tracking-(wide\|\[0*\.?[1-9])"` on the screen's files = 0. | | |
| B3 | No middle-dot strings in visible text. `grep -n "·"` = 0 (or every hit is a declared exemption). | | |
| B4 | No colour outside ink / frost / mist / haze / gold / mint / `#f28b82` (brand-logos.tsx and the logo's oranges in ui/mark.tsx exempt, D-016). No `neutral-`, `emerald`, `rose`, `sky`, `violet`, `amber`, `accent`. | | |
| B5 | No section entrance motion. `emulateMedia reduce` → `document.getAnimations().length` after 3s = 0 (Overview: 0 when no row has `arrived`). | | |
| B6 | No `$` shown; amounts read `n USDC`. | | |
| B7 | Every action does and says what it did on `origin/main` (Withdraw modal, ⌘K palette, CSV export, compose, verdict buttons). | | |

### C. Acceptance from the packet's own section

| # | Check | Result | Evidence |
|---|---|---|---|
| C1 | 1440×900 capture reviewed with eyes, not just exit code. Nothing invisible, clipped, or frost-on-white. | | |
| C2 | 390×844 capture: table is in list mode; every interactive element ≥ 44px tall (touch probe). | | |
| C3 | Landmarks: one `<main>`, one `<header>` where the packet specifies, one `<h1>`, `<nav aria-label="Workspace">`. | | |
| C4 | Loading / error / empty states each captured and match §2.13 / §2.15 / §2.14 (empty names the figure that is zero and why). | | |
| C5 | Packet-specific: (Overview) bloom mid-fade on an `arrived` row, two captures 30s apart · (Agents) sort still works · (Register / Board) sheet open · (Directory, Board, Register) error state with a bad host · (Workflows) running edge, no light pixels · (Login) real round numbers in the right panel, claims test green · (Mission) no overlapping labels at 390. | | |
| C6 | Contrast: every `mist` cell ≥ 4.5:1 on its actual ground (spot-check three). | | |

### D. The five questions (HANDOFF.md / brief §18) — judgement, one sentence each

| # | Question | Answer | Verdict |
|---|---|---|---|
| D1 | Would it embarrass beside the best in its category (Stripe Dashboard, Linear, Vercel, a Bloomberg pane)? Name the comparison and what falls short. | | |
| D2 | Does it look generated? Point at the tell if there is one (eyebrow, stagger, gradient blob, chip row, generic empty state). | | |
| D3 | Can the identity be stated in one sentence from this screen alone? Write the sentence. | | |
| D4 | Is there one screenshot-worthy moment on this screen? Name it, or say this screen is deliberately quiet and which screen carries the moment. | | |
| D5 | Does every element earn its place? Name any element that could be deleted with no loss. | | |

### E. Screen verdict

| Field | Value |
|---|---|
| Overall | GREEN / AMBER / RED |
| Blocking finding (if not GREEN) | |
| Which packet owns the fix | |
| Which acceptance criterion it fails | |

---

## Run summary (fill after all screens)

| Screen | A | B | C | D | Verdict |
|---|---|---|---|---|---|
| /login | | | | | |
| Overview | | | | | |
| Agents | | | | | |
| Endpoints | | | | | |
| Receipts | | | | | |
| Directory | | | | | |
| Job board | | | | | |
| Register | | | | | |
| Chat | | | | | |
| Workflows | | | | | |
| /mission | | | | | |

Gates at the reviewed commit: `tsc=` `eslint=` (2 pre-existing) `test=` (0 red after P-10) `build=`

The one sentence that states the identity, as read off the whole product:

> ______________________________________________________________________

The one screenshot to lead with, and why:

> ______________________________________________________________________
