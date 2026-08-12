# Ceremonies — handoff

Branch: `feature/ceremonies-v1` · builds on `feature/mission-control-v1` · Route: **`/mission`**

Four things can happen to an agent that will never happen to it again. This
branch makes the screen stop for them.

```bash
npm install
npm run dev -- -p 3002        # http://localhost:3002/mission
./scripts/mission/verify.sh   # check the simulation still behaves
```

Read [`DESIGN_REVIEW.md`](./DESIGN_REVIEW.md) first — it covers the field itself,
the three-layer architecture and the two decisions everything rests on. This
document only covers what was added on top.

> **Still entirely simulated.** No chain, no backend, no network call. The
> `SIMULATED` badge stays until real data is wired in.

---

## Read this first

**This has now actually been looked at**, which was not true of v1. Every
ceremony was captured rendering in a real browser at 1600×1000 and the results
are in [Verifying](#verifying). Four things were wrong and are fixed; they are
listed there rather than quietly folded in, because they are the kind of thing
that gets reintroduced.

Two caveats remain:

- **Only at one size, and only in headless Chrome on a CPU.** Nothing has been
  opened on a phone, at an ultrawide, or on a real GPU. Performance is still
  unmeasured on hardware anybody would actually use.
- **Graduation has never been seen.** It is the rarest of the four — two or
  three per ten minutes — and it did not fire inside any capture window. The
  simulation confirms it fires and the smoke test confirms it completes its
  state machine, but nobody has looked at what it draws.

---

## The four

| | What it means | How it looks |
|---|---|---|
| **First Light** | The first time it was ever paid. | The field recedes, one slow payment crosses, and the node ignites. Three rings outward. |
| **First Stranger** | The first payment from outside its own cluster. | Both ends stay lit and the whole arc is drawn, because the moment is the *distance*, not the payment. Cool ring on contact, warm underneath. |
| **Long Night** | It went quiet for a long time, and someone came back. | The deepest dim. The agent is drawn exactly like one that has never been paid — cold, small, indistinguishable from the dark — with the caption already reading *dark for twenty-six minutes*. Then the payment lands and it isn't. |
| **Graduation** | Every cluster in the network has now paid it. | The world barely dips: this one is public, not private. Widest rings on the screen, and it leaves a permanent thin ring around the node. |

Graduation's ring is the only permanent mark on a screen where everything else
fades. It is drawn almost too faint to see, on purpose — you notice that *some*
nodes are circled well before you notice which, which is the right order to
learn it in.

---

## The one thing to understand

**The economy stages the timing. It never invents the fact.**

`Economy.receiver()` doubles as a stage manager. When a ceremony is due it looks
for an agent the moment is *genuinely true for* — one that has actually never
been paid, actually never met an outsider, actually been silent for eight
minutes — and sends the next payment there. It chooses *when*, out of real
candidates. It never marks something that did not happen.

Three guards keep that honest, and you should not remove any of them:

1. Facts are recorded in `settle()` every single time they become true, whether
   or not anybody is watching. Most First Strangers happen with no ceremony at
   all. The ceremony is a spotlight, not the event.
2. A refunded payment gets no ceremony. Nothing was paid, so nothing happened,
   and the scheduler retries in six seconds.
3. `happened()` is the last gate: a staged moment is dropped unless the field it
   names was stamped with *this* clock value. If the staging and the truth ever
   disagree, the truth wins.

This is the load-bearing idea of the whole branch. A ceremony that fires on a
schedule regardless of what is true is a screensaver.

### Why the economy had to change

Two mechanics did not survive contact with the numbers. Both were measured with
`scripts/mission/economy-probe.cjs` rather than guessed at.

**Trade is now clustered.** Payers used to be uniform across the whole roster,
which meant essentially every payment was cross-cluster and First Stranger would
have fired on every agent's second call. Agents now buy from their own
neighbourhood ~94.5% of the time. That makes First Stranger rare enough to mean
something, and as a side effect the field reads as seven communities instead of
one hairball — the threads between clusters only appear while you watch.

**Graduation is no longer a money line.** It was "lifetime earnings cross a
dollar". Earnings are power-law, so at *every* threshold tried — $0.25, $0.4,
$0.6, $1, $1.5, $2.5 — between zero and four agents crossed in ten minutes, and
the live run produced none at all. There is no dollar figure that produces a
watchable cadence, because the agents below any line are mostly very far below
it. Graduation is now "every cluster has paid it", which is a seven-rung ladder
the whole population climbs, so there is always a cohort one rung short. It also
composes: First Stranger is the first rung of the same ladder.

### Reserves

Warm-up runs 3.2 simulated hours before the first frame, and would otherwise
spend every first-time moment where nobody could see it.

- `UNLIT_RESERVE` (46) — agents never paid during warm-up. Was already there.
- `STRANGER_RESERVE` (40) — agents that trade *only* with neighbours for the
  whole of warm-up. New, and it exists because the rest of the roster needs real
  cross-cluster history or nobody is anywhere near Graduation when the screen
  opens.
- Long Night needs no reserve: the long tail of a power-law economy generates
  silent agents for free, and warm-up hands the live field about ten of them.

---

## DNA

`lib/mission/dna.ts` no longer hashes the handle. Fifteen bars, oldest on the
left, read off `Agent.trace` — a fixed-size ring the economy writes on every
settlement:

- **height** — earning cadence, log-scaled. Tall means a call that came hard on
  the heels of the last one; short followed a silence.
- **gold** — the payer was from outside the agent's own cluster. Rare, so reach
  reads as a few gold bars in a grey strand.
- **notch** — a refund. Short and dim, because nothing was earned.

Two agents with the same traffic look alike, and a strand changes as its agent's
life does. That is the point: you cannot forge one by picking a good name.

Every input is something a chain could prove, so this survives the switch to
real data unchanged.

---

## Where things live

Everything new sits inside the boundary v1 established — the economy still knows
about money and never about brightness, the renderer still owns all the light.

| File | What changed |
|---|---|
| `lib/mission/types.ts` | `CeremonyKind`, the four nullable `*At` fields, `patrons`, and the `Trace` ring. |
| `lib/mission/economy.ts` | Clustered payers, the ceremony scheduler, candidate finders, the `happened()` gate. |
| `lib/mission/renderer.ts` | Per-kind staging table, two-subject ceremony pass, permanent circlets, the cold-node treatment. |
| `lib/mission/dna.ts` | Rewritten against behaviour. |
| `components/mission/ceremony-overlay.tsx` | Replaces `first-light.tsx`. Captions all four. |
| `scripts/mission/` | The verification harness. |

### Adding a fifth

The seams are the same ones v1 left, and they held:

1. Add to `CeremonyKind` in `types.ts`. TypeScript will then walk you through
   every switch that needs a new arm — `CEREMONY`, `arrive()`, `happened()`,
   `caption()`, `TITLE`, `MARK`.
2. Add a nullable `somethingAt: number | null` on `Agent`, set exactly once in
   `settle()`, never unset. That invariant is what makes a moment unrepeatable.
3. Add a `candidate()` arm and put the kind in `SCHEDULED`.
4. Run `./scripts/mission/verify.sh`. If the candidate pool is zero, the
   ceremony will never fire and nothing on screen will tell you.

Hold a fifth to the same bar: **if it can happen twice, it is a notification,
not a ceremony**, and it belongs in the feed.

---

## Verifying

```bash
./scripts/mission/verify.sh
```

No new dependency — it compiles `lib/mission` with the TypeScript already in
`node_modules` and runs two probes.

`economy-probe.cjs` fails if construction is not deterministic, if any kind never
fires, or if the screen goes more than 90 seconds without a moment. Current run:
17 moments in 10 minutes, longest quiet stretch 47s, all four kinds.

`render-smoke.cjs` drives the real renderer against a stub 2D context for 12
simulated minutes at 60fps on a 2560×1400 viewport, and fails if it throws, if
two ceremonies overlap, or if one ever clears without landing.

**Run this after touching any threshold in `economy.ts`.** All of them are
fitted to this roster, and a plausible-looking change can silently stop a
ceremony ever firing — which is not a failure you will spot by looking, because
the field carries on settling perfectly happily with a moment that never comes.

### What looking at it actually caught

Screenshots were taken by driving a real browser over the DevTools Protocol,
polling the DOM for a ceremony caption and capturing the instant one appeared.
None of the four problems below were visible from the code, the type checker, or
the headless smoke test. All are fixed; they are recorded because they are the
kind of thing that comes back.

**The field used less than half the height it had.** `layout.ts` normalised both
axes by a single combined maximum, so the wider axis decided the fate of the
narrower one: x overflowed to about 1.7, everything was scaled by 0.58, and y —
which only ever reached 0.8 — came out at 0.46. A full-bleed hero with a dead
band across the bottom third of it. Now normalised per axis, and recentred on
the actual bounding box rather than assuming the cloud is symmetric about the
origin.

**The panels did not recede during a ceremony.** The field dimmed to 18% and the
glass stayed at 100%, leaving a bright gold revenue figure as the loudest thing
on screen during a moment about one agent. It mattered practically too: the
field is full-bleed, so a ceremony can fire for an agent sitting *behind* a
panel — the first First Light captured was almost entirely hidden by the
settlements feed. The instruments now recede with everything else.

**The caption could sit anywhere.** Positioned at the agent's canvas coordinates
with no clamping, so a ceremony near an edge put its own name off-screen. Now
clamped inside the viewport.

**First Stranger's arc came from nowhere.** The payer was drawn at ordinary
resting brightness, so the caption named an agent you could not find at the far
end of the line. It is now lifted while it is reaching, and gets a departure
ring.

---

## What I changed my mind about

**Long Night is about an agent, not about you.** The original sketch had it as
the operator being away overnight. That needs a notion of absence the simulation
does not have, and it makes the ceremony about the viewer rather than the agent
— which is the wrong subject for a screen whose whole argument is that these
things have lives. It is now an agent's own silence, and it works because the
tail of a power-law economy is full of agents nobody has called in a while.
The operator-away version is still worth building; it is a different feature.

**The ceremony rotation is deliberately unpredictable.** The first version
round-robined the four kinds and produced a perfect repeating cycle — a
metronome, which is precisely what `economy.ts` spends its comments avoiding. It
now picks at random among whatever is eligible, never repeating the last kind
while anything else is available.

**Ceremonial payments travel for a fixed time, not a distance-scaled one.** This
was a real bug, not a preference. Travel time scaled with distance while the dim
envelope was a fixed 3.4 seconds, so on a wide screen a long payment landed after
the world had already come back — and First Stranger crosses the field *by
definition*, so it would have broken every time. The envelope now holds until the
payment actually arrives and only then starts counting its release.

---

## What still feels unfinished

- **Performance on a real GPU is still unmeasured**, mobile has never been
  opened, and nothing is keyboard reachable. All inherited from v1.
- **Graduation has never been seen rendering.** See the top of this document.
- **Ceremonies are unreachable without waiting.** There is no way to replay one,
  and no way to ask "show me the last First Light". Roughly 12% of the time the
  field is dimmed for a moment; if you look away you have simply missed it. A
  quiet log of the last few, in the feed panel, is probably the next thing.
- **The caption is clamped, not laid out.** It no longer leaves the viewport,
  but for an agent near an edge it now sits at the clamp boundary rather than
  under its own node, so the line between name and subject gets long. The hover
  card flips sides at 250px from the right edge; this should probably do
  something equivalent instead of clamping.
- **The feed announces a ceremony before the field does.** The row and its badge
  appear the instant the economy settles, while the renderer is still walking the
  payment across a three-second arc. It is not wrong — the feed is a ledger and
  the field is a dramatisation — but it does spoil the reveal slightly.
- **Nothing is audible.** Four moments that stop the world and none of them make
  a sound. If sound happens it wants a small module beside the renderer with the
  same discipline: no React, no per-frame allocation, muted until asked for.
- **Long Night's supply is measured, not proven.** The pool sits at ten
  candidates when the field opens and holds around five to seven over ten
  minutes, which means the tail regenerates them about as fast as the scheduler
  spends them. Over an hour that balance is untested.
- **`eslint` reports 7 errors in `components/mission`.** All of them predate this
  branch — the `Odometer` ref-during-render pattern and the renderer handoff in
  `stream-canvas.tsx`, both deliberate. Same count as on `feature/mission-control-v1`.
  Worth resolving properly rather than leaving as background noise.
