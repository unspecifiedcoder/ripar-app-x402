# Invariants

Properties this repository must not break. Each one has an enforcement
mechanism and a test. An invariant with no test is an intention, not an
invariant — if you add one here, add the test in the same change.

The numbering is stable. Never renumber; retire an ID rather than reusing it.

---

## I-001 — Simulated data is never presented as observed data

**Rationale.** This product's single defensible claim is that some of its rows
come from Algorand MainNet. That claim is worth nothing if the reader cannot
tell which rows those are. One mislabelled table costs more trust than every
honest one earns.

**Scope.** `lib/app-data.ts`, `lib/receipts.ts`, `lib/logs.ts`,
`lib/mission/*`, and every view that renders them.

**Rule.** Any surface backed by generated data carries a visible marker in the
UI, and its copy must not use language implying observation — "sample of the
ledger", "recent activity", "your receipts". Generated means generated, and
the words must say so.

**Enforcement.** `tests/invariants/labelling.test.ts` asserts every view
importing a generated-data module also renders the shared `<Simulated />`
marker.

---

## I-002 — Chain reads are filtered on the full x402 predicate

**Rationale.** An agent's earnings are computed from settlements matched by
note prefix, asset ID and group membership. Loosening any leg of that filter
silently converts unrelated USDC transfers into "x402 revenue" — the exact
failure that turns a true claim into a false one, with no visible symptom.

**Scope.** `lib/real-data.ts`, `lib/live-chain.ts`.

**Rule.** A transaction counts as an x402 settlement only when **all** hold:
- `tx-type === "axfer"`
- `asset-transfer-transaction.asset-id === 31566704` (USDC, MainNet)
- decoded note starts with `x402-payment-v2-`
- the transaction belongs to a group whose fee-payer leg carries a note
  starting with `x402-fee-payer-`

Constants live in one module. No inline literals at call sites.

**Enforcement.** `tests/invariants/settlement-filter.test.ts` runs the parser
over a frozen indexer fixture including near-miss transactions (right asset /
wrong note, right note / wrong asset, ungrouped, wrong tx-type) and asserts
each is rejected.

---

## I-003 — Parsing is pure and offline-testable

**Rationale.** A verifier that can only be exercised against live MainNet
cannot be tested in CI, cannot be reasoned about, and cannot be reproduced by
a skeptic. Network access and interpretation must not live in the same
function.

**Scope.** `lib/real-data.ts`, `lib/live-chain.ts`.

**Rule.** Fetching and parsing are separate exports. Parsing takes decoded
indexer JSON and returns settlements — no `fetch`, no clock, no randomness.

**Enforcement.** `tests/invariants/settlement-filter.test.ts` imports the
parser and runs it with no network available.

---

## I-004 — Money is integer base units until display

**Rationale.** USDC has 6 decimals. Floating-point accumulation across many
settlements drifts, and a revenue figure that disagrees with the chain is a
false claim about someone's money.

**Scope.** every module handling `amount`, `earnedUsdc`, `price`.

**Rule.** Sums and comparisons use integer base units. Conversion to a decimal
happens once, at render.

**Enforcement.** `tests/invariants/units.test.ts` sums a fixture of 10,000
settlements and asserts exact integer equality.

---

## I-005 — The simulation never consults the clock or the global RNG

**Rationale.** The mission economy is constructed identically on server and
client. `Date.now()` or `Math.random()` in that path produces a hydration
mismatch and destroys reproducibility of any bug report.

**Scope.** `lib/mission/*`.

**Rule.** All randomness derives from the seeded `mulberry32`. Time advances
only via the `dt` passed into `tick`.

**Enforcement.** `scripts/mission/economy-probe.cjs` asserts two runs from one
seed are byte-identical, and additionally scans every `lib/mission/*.ts` file
(comments stripped) for `Date.now(` / `Math.random(`, failing if either
appears.

---

## I-006 — Demo mode stays a supported configuration

**Rationale.** The README promises the app runs with no environment at all.
Every Supabase entry point is null-safe by design. A change that assumes a
session breaks the first thing a new visitor does.

**Scope.** `lib/supabase/*`, `lib/db.ts`, `proxy.ts`.

**Rule.** No env, no session, no schema, or any error returns `null` and the
local fallback renders.

**Enforcement.** CI builds with no Supabase env (already true in
`.github/workflows/ci.yml`).

---

## I-007 — Claims in UI copy are backed by evidence in the same view

**Rationale.** Words like *verified*, *real*, *actually*, *guaranteed* are
load-bearing. Where the evidence is a chain read, the view must expose the
route to it — an explorer link, a round number, an address.

**Scope.** all customer-facing copy.

**Rule.** Any such word requires either (a) a visible artifact the reader can
independently check, or (b) removal of the word.

**Enforcement.** `tests/invariants/claims.test.ts` greps view copy for the
claim vocabulary and fails on any occurrence not registered in
`tests/invariants/claims.allowlist.ts`, where each entry names its evidence.
