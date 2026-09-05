# Design decisions

The record of what was decided, why, and what was rejected. `DESIGN_SYSTEM.md`
says what the rules are; this says where they came from. When an implementer
finds the system and the code in conflict, this document is the tiebreaker.

Decisions are numbered and never renumbered. A reversed decision stays here,
marked reversed, with the reason.

---

## The finding everything else follows from

There are two products in this repository, and they have the wrong data.

`/mission` has an identity. Ink ground, gold for money, Plex Mono for
anything that is a value, a canvas where every light is a payment landing.
Someone would screenshot it. It runs on a **simulation**.

`/dashboard` reads **real settlements off Algorand MainNet** — actual USDC,
between actual addresses, with a round number and an explorer link, seconds
old. It is rendered as a light-grey SaaS table under a prompt-box hero.
Nobody would screenshot it. The login page beside it shows a mockup of a
different product entirely ("Good afternoon, John Doe", "3% used credits").

The thing that is real looks fake. The thing that is fake looks real.

Every decision below is in service of one correction: **bring the identity
to where the proof lives.**

---

## D-001 — One visual system, and it is Mission Control's

**Decision.** The whole product adopts the `/mission` palette and type: ink,
frost, haze, gold, mint; Inter for prose, IBM Plex Mono for evidence. The
light workspace theme is retired, not kept as an alternative.

**Why.** It is the only identity in the repository, and it is good. A product
should be recognisable without its logo; the mission screen already is. The
workspace is not recognisable *with* its logo.

**Why dark is not arbitrary here.** The brief rightly warns against dark mode
as decoration. This is not that. The product's proof is *light* — a payment
is something that arrives and glows — and light reads against dark. The
register is a ledger, a terminal, an instrument panel: things that are dark
because they are looked at for a long time and must not shout. And the
identity already exists; this inherits it rather than inventing it.

**Rejected.** Keeping light for the workspace and dark for mission, "because
dashboards are light." That preserves the two-product problem this exists to
solve.

**Rejected.** A theme toggle. Two palettes means two of every decision below
and a product that looks different in every screenshot. One identity.

---

## D-002 — Gold is spent only on money that moved on-chain

**Decision.** Gold marks a settlement — a USDC transfer that actually
occurred on the chain the workspace is pointed at — and nothing else.
Simulated rows: frost and haze only. A reader can tell settled from simulated
by colour before reading a word.

**Revised after seeing `origin/main`.** The workspace there reads Algorand
**TestNet** by default. Under the first draft of this rule ("gold means
MainNet money") the product would have shipped with no gold anywhere but the
Simulated badge, and an instrument with no signal is not an instrument. So:
gold means *it settled*, and *which chain* is a workspace-level fact stated
once and never hidden — a `TESTNET` badge in the sidebar's brand block and in
every page head while the workspace is on TestNet, absent on MainNet. The
per-row grammar (gold figure + `verify ↗`) is identical on both networks;
the badge is what tells you whether the gold is money.

**Why.** This is `docs/INVARIANTS.md` I-001 made visible. The badge says
"simulated"; the palette should agree with it. In the mission screen gold
already means revenue; extending that meaning to "revenue that actually
happened" is the single rule that makes the identity *mean* something rather
than merely look like something.

**The one exception, carried over.** The SIMULATED badge itself is gold on
the mission screen. That is deliberate and stays: its whole job is to be
noticed on a screen convincing enough to be mistaken for a chain. It is the
only place gold is spent on something that is not money, and the comment in
`top-rail.tsx` explaining that is now the rule for the whole product.

**Rejected.** Using the orange accent from the old workspace as a second
signal colour. Two warm signals is no signal.

---

## D-003 — Evidence is monospace; prose is not

**Decision.** Any value a reader might copy, compare, or check elsewhere —
an address, an amount, a round, a transaction id, a timestamp, a price — is
set in IBM Plex Mono with tabular numerals. Sentences are Inter.

**Why.** Monospace says "this is a literal value, not a description of one."
A round number in Plex beside a sentence in Inter reads as a fact beside its
caption. It is also how the mission screen already works, and it is why the
settlements panel there is legible at eleven pixels.

**Practical consequence.** Plex Mono currently loads only under
`app/mission/layout.tsx`. It moves to the root layout.

---

## D-004 — The Overview leads with the settlement stream

**Decision.** The prompt-box hero ("Ship a paid endpoint in one click") is
removed from the Overview. The first thing on screen is the live settlement
stream: real payments, newest first, round numbers advancing, each with its
proof link. The four metrics sit above it as a single instrument strip.
"Ship an endpoint" becomes a secondary action in the page head.

**Why.** Hierarchy is inverted today. The most remarkable thing the product
can show — money moving on a public chain, seven seconds ago, checkable —
is below a text box that does nothing yet. The screen should answer "what is
this?" with its proof, not its aspiration.

**Rejected.** Keeping the hero and moving the stream up beside it. Two heroes
is a landing page, not an instrument.

---

## D-005 — A new settlement arrives; it does not appear

**Decision.** When the stream receives a settlement it has not shown before,
the row enters with a brief gold bloom that settles to rest over about a
second. This is the mission screen's "first light" motion, borrowed. Under
`prefers-reduced-motion` there is no bloom; the row is simply present.

**Why.** This is the memorable moment, and it has to be earned by the real
thing. Money arriving should look like something arriving. The motion is
causal — it happens because a payment settled, and only then — so it is
information, not decoration.

**Constraint.** The arrival signal must come from the data layer knowing a
row is new, not from the component guessing by timestamp. If the data hook
cannot say "this one is new," the implementer stops rather than faking it.

**Rejected.** Animating every row on every poll. That is noise, and it
destroys the meaning of the one animation that matters.

---

## D-006 — The login page shows the real thing

**Decision.** The mockup panel on `/login` — a fabricated screenshot of a
credits-and-projects product that does not exist — is replaced with a
read-only frame of live MainNet settlements. The same stream as the Overview,
without controls. Real payments, before you sign in.

**Why.** First impressions are made at the door. The current panel makes a
false claim about what the product is, in the one place a stranger decides
whether to continue. The real stream is more impressive than the mockup and
has the advantage of being true.

**Status on `origin/main`.** The providers are fixed — `auth-panel.tsx`
asks the project which are enabled and draws only those. But the mockup was
*replaced*, not removed: the panel now shows a "Your workspace" screen with
Home / Compose / Projects / Integrations / Usage in its sidebar — five views
this product does not have — and a "Post a job" card reading "Let agents bid,
pay on a verified result," the claim `tests/invariants/claims.test.ts` exists
to stop. It is a better-looking fiction than the last one. It is still a
fiction, at the door. The replacement is the live stream, read-only.

---

## D-007 — Every view has a URL

**Decision.** `/dashboard/overview`, `/dashboard/agents`, and so on. The
sidebar navigates; the back button walks; a link to an agent can be sent to
someone.

**Status on `origin/main`.** Done, as `?view=agents` with `pushState`, so
back walks the views. Design inherits it; nothing to build. Kept here because
every packet that links between views depends on it.

---

## D-008 — Density: an instrument, not a brochure

**Decision.** The workspace is dense. Tables at 12.5–13px, rows at 36–40px,
one screen holding twenty settlements. The mission screen's settlements panel
is the reference. Whitespace is spent on separating *sections*, not on
padding *rows*.

**Why.** The brief's rule: maximum useful information per unit of attention.
A person watching payments arrive wants to see many of them. The current
receipts table shows nine rows in 900px of height; the mission panel shows
twelve in 700 with room to spare, and is more legible.

---

## D-009 — Zero is a result, not an absence

**Decision.** Every empty state names what the number would have been and why
it is zero. "0.00 USDC — no paid calls to your address" already exists on the
Overview and is the model. Empty tables say what would fill them.

**Why.** The product's voice already has this: *"Zero paid calls so far, and
it stays zero until somebody actually pays."* That sentence is more
trustworthy than a full table would be. Design should make the honest empty
state feel like the instrument reading zero, not like a failure to load.

---

## D-010 — What does not change

- The mission screen's canvas, economy, and renderer. They are the reference,
  not the subject.
- Any copy governed by `tests/invariants/claims.test.ts`. Design changes the
  frame, not the claims.
- The `<Simulated />` marker and where it appears. Design restyles it into
  the palette (gold, per D-002's exception) and moves nothing.
- The Chat's disclosure that replies are scripted. It stays visible.

---

## D-011 — Base branch

**Decision.** These documents are branch-independent. Implementation packets
target the product as it is on `origin/main`, which is 51 commits ahead of
`feature/ceremonies-v1` and already contains D-006's provider fix and
D-007's addressable views. Implementers must start from `origin/main`; a
packet that assumes this branch's stale workspace is wrong.

**Why.** Designing against a UI that no longer exists produces work that
cannot land.

---

## D-012 — Three tiers of truth, and colour names only the top one

**Decision.** Every row and figure in the product sits in exactly one of
three provenance tiers, and the design encodes them consistently:

| Tier | What it means | Marker | Colour for the figure |
|---|---|---|---|
| **Settled** | a USDC transfer that occurred on the configured chain | `verify ↗` to the explorer for that chain | **gold** |
| **Registered** | an on-chain record exists (an `ag_` or `jb_` box); no transfer is being reported | `verify ↗`, and the surface is labelled with its chain | frost |
| **Simulated** | generated in this browser; touched no chain | `SIMULATED` badge, and the copy says so | frost / haze |

Plus one workspace-level marker: **`TESTNET`**, shown in the sidebar brand
block and beside every page title while the settlements chain is TestNet.
It is not a tier; it qualifies tier one. The registry surfaces (Directory,
Job board, Register) are hardwired to TestNet regardless of the workspace
setting, so they carry the badge in their page head even when the workspace
is on MainNet.

Gold is spent on tier one only (D-002). Tiers two and three are told apart
by badge and by the presence or absence of a chain link, never by colour.

**Why this is new.** `origin/main` added a second real data source:
`lib/registry-chain.ts` reads an ERC-8004 Identity Registry, Validation
Registry and job board off Algorand **TestNet**, and its header comment draws
the line precisely — `real-data.ts` defines an agent by *behaviour* (it was
paid), the registry defines one by *registration* (it holds an `ag_` box).
Neither is a superset of the other. A design that showed both in the same
colour would erase the distinction the code goes out of its way to keep.

**Consequence for the Simulated badge.** It stays gold-outlined (D-002's
exception) and is therefore the most visually assertive of the three markers.
That ordering is correct: the tier furthest from the chain needs the loudest
label.

**Rejected.** A fourth colour for TestNet. Colour is scarce here on purpose;
a second signal hue would cost gold its meaning.

---

## D-013 — The workflow canvas gives up its five colours

**Decision.** React Flow's step kinds (`STEP_KINDS` in `workflow-canvas.tsx`)
lose their five swatches — sky, orange, violet, emerald, indigo — and are
told apart by icon and label on a `glass` node. The one colour on the canvas
is `mint` on the edge of a step that is currently running, and `gold` on a
step that settled a MainNet payment. React Flow's `colorMode="dark"` is
adopted and the twenty hand-written `.rf-canvas` light overrides in
`globals.css` are deleted rather than inverted.

**Why.** Five hues on one screen is a legend, and a legend is a sign the
colour is not carrying meaning. The rest of the product spends colour on two
things; the canvas should not be the exception because a library shipped a
palette. Icon plus label distinguishes step kinds at least as well and does
not cost gold its meaning (D-002).

**Amended after pre-flight.** There is no gold edge, and there must not
be one. `lib/workflow-run.ts` treats the 402 as the success case and says
so: a workflow run quotes, it never settles, and `RunResult` carries only
`quotedUsdc`. A gold edge would need a settlement that does not exist,
which is D-002's exact prohibition. The canvas therefore has one colour,
mint on a running edge, until the day a run can settle. Implementers must
not stop at P-08 for the missing gold, and must not invent it.

**Also in scope.** The Job board's six status chips on `origin/main` —
Disputed (rose), Submitted (violet), Open (sky), Validated (emerald),
Cancelled (grey), and the escrow figure in green — collapse to the status
pill grammar in `DESIGN_SYSTEM.md` §2.8: a dot and a word. Validated `mint`,
Open `frost`, Submitted `gold/60`, Cancelled `haze`, Disputed error. Escrow
that is actually held is a settled figure and is `gold`.

**Rejected.** Keeping the swatches "because the canvas is a different kind
of surface." It is the surface most likely to be screenshotted after the
stream; it must belong to the same product.

---

## D-014 — Arrival is a data-layer fact, not a component guess

**Decision.** `useWorkspace` gains a set of settlement ids it has already
delivered, and marks each run with `arrived: boolean` on the poll that first
includes it. The initial load marks nothing. The arrival bloom (D-005, §1.7)
fires only on `arrived === true`. Views never infer newness from timestamps
or from array position.

**Why.** The inventory established there is no such signal today: `runs` is
replaced wholesale every 30 seconds, so a component cannot tell a row that
just settled from one it has shown for a minute. Faking it — animating the
top row, or anything with `when` within the last 30 seconds — would fire on
every poll and on every mount, and the one animation that is supposed to
mean "money just moved" would mean "the page re-rendered." The mission feed
already does this correctly with `AnimatePresence initial={false}`; the
workspace needs the same discipline at the source.

**Constraint on implementers.** This is the single data-layer change design
is permitted to request. It touches `lib/real-data.ts` only, adds a field,
changes no existing field, and is covered by a test that asserts the initial
load marks nothing and the second poll marks exactly the new ids.

---

## D-015 — Reduced motion is honoured, including on the mission screen

**Decision.** `motion` animations across the product run inside a
`MotionConfig reducedMotion="user"`, and the `missionFlash` keyframe gets
the reduced-motion guard it is missing. `Odometer` snaps to its target under
reduced motion rather than easing.

**Why.** Measured: with `prefers-reduced-motion: reduce` emulated, the
dashboard runs 0 animations and the mission screen runs 18, twelve of them
the settlement flash. The hook exists (`usePrefersReducedMotion`) and is
honoured in exactly one place. A design system that specifies reduced-motion
behaviour for every component (§1.7) while the flagship screen ignores the
setting is not a system.

---

## D-016 — Brand marks get a dark-ground variant, not a recolour

**Decision.** The Ripar fan (`components/ui/mark.tsx`) keeps its orange
blades — it is the logo — but its two darkest stops (`#b62c00`, `#8a2000`)
lift to keep the fan legible on ink; `AppIcon` drops its white plate for a
`glass` one. Third-party OAuth logos (Google, Microsoft, GitHub) sit on a
small `frost` chip because their brand guidelines forbid recolouring and the
GitHub mark is near-black.

**Why.** The logo is the one place orange survives. It is not a signal
colour in the interface (D-002) and its presence in the sidebar corner does
not dilute gold; a wordmark is read as a name, not as a state.

---

## D-017 — No tracked capitals, on the mission screen either

**Decision.** The `label` style is 11px sentence case with no
letter-spacing. The mission screen's `Label` component (`font-plex
text-[9.5px] uppercase tracking-[0.2em]`) changes to match, so "REVENUE"
becomes "Revenue" and "LAST 6 MINUTES" becomes "Last 6 minutes".

**Why.** Reviewed against the frontend-design skill's list of generated-page
tells: a tracked-out all-caps eyebrow above every heading is the first on
it, and the mission screen has it on every panel. It was the least
considered choice on the screen that was otherwise the most considered.
Sentence-case Plex at 11px is more legible at the sizes an instrument uses
and is less like everyone else's dark dashboard, which is the point of
having an identity.

**Cost.** The mission screenshots in `DESIGN_REVIEW.md` and `CEREMONIES.md`
will no longer match exactly. That is acceptable; P-11 carries the change.

---

## D-018 — IBM Plex Sans replaces Inter

**Decision.** Prose is set in IBM Plex Sans; evidence stays in IBM Plex
Mono. Inter is unloaded.

**Why.** Inter is the sans a generator reaches for on any brief, and this
brief has a subject. Plex was drawn for engineering documentation; Sans and
Mono share skeleton and colour, so a caption and the value it describes
read as one voice on one line, which is what D-003 is for. One superfamily
is also one fewer decision for every implementer.

**Rejected.** A display serif for headings. It would be the second most
common generated look (cream-and-serif inverted), and this product has no
headline moment that wants a serif — its most characteristic thing is a row
of settlements, not a sentence.

---

## D-019 — One orchestrated moment

**Decision.** The workspace has no page-enter fade, no panel stagger, and no
hover motion beyond a colour change. The settlement-arrival bloom is the
only animation that plays without the user asking for it. The mission
screen keeps its staged opening, which is that screen's own single moment.

**Why.** Reviewed against the same list: fade-and-slide-up on every section
is the default entrance of a generated page, and §1.7 had it. Motion is
information; a page where everything moves has nothing that means
anything. The bloom means money moved. It has to be the only thing that
moves so that it can.

