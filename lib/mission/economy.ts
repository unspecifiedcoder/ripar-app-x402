// The simulated economy.
//
// No React, no canvas, no DOM. It keeps a roster of agents and a clock, and on
// every tick it decides whether anyone got paid. The renderer reads it; the
// panels subscribe to it; neither can change it.
//
// Timing is a Poisson process whose rate breathes on a couple of slow sines,
// with bursts when one agent goes viral for a few seconds and lulls when the
// network goes quiet. Nothing here fires on a fixed interval, because a metronome
// is the one thing that would give the illusion away.
//
// Everything is simulated. Nothing in this file has ever touched a chain.

import { handles, SERVICES } from "./names";
import { placeAgents } from "./layout";
import { between, exponential, gaussian, pick, rng, type Rng } from "./rng";
import {
  newTrace,
  record,
  type Agent,
  type CeremonyKind,
  type EconomySnapshot,
  type Settlement,
  type SettlementState,
} from "./types";

const SEED = 0x5eed_1a20;

/** Communities in the field. Also the number of patrons Graduation requires. */
export const CLUSTERS = 7;

/** Rolling window drawn by the timeline. */
const BUCKETS = 72;
const BUCKET_MS = 5_000;

/** Panels repaint on this cadence. Frames are 60/s; nobody can read 60 numbers/s. */
const COMMIT_MS = 200;
const FEED = 26;

/** Hours of history simulated before the first frame, so the field opens mature. */
const WARM_MS = 3.2 * 3600_000;
const WARM_STEP = 250;

/** Agents left dark at the end of warm-up, held back for First Light. */
const UNLIT_RESERVE = 46;

/**
 * How often a live payment comes from outside the receiver's cluster.
 *
 * Deliberately small. Agents mostly trade with their neighbours, which is what
 * makes the field read as seven communities rather than one hairball — and what
 * makes a payment arriving from across the map mean something.
 *
 * During warm-up this is zero: every agent enters the live field having only
 * ever been paid by its own neighbours, so every First Stranger is still ahead
 * of it and none of them were spent where nobody was watching.
 */
const STRANGER_ODDS = 0.055;

/**
 * Agents that trade only with their own neighbours for the whole of warm-up, so
 * they enter the live field having never met an outsider.
 *
 * This is the First Stranger equivalent of UNLIT_RESERVE, and it exists for the
 * same reason: the rest of the roster needs to build real payer diversity during
 * warm-up — otherwise nobody is anywhere near Graduation when the screen opens —
 * but if *everyone* did, every first stranger would have been spent in the dark.
 */
const STRANGER_RESERVE = 40;

/**
 * Silence that counts as a night, and the history you need to have earned one.
 *
 * Eight minutes, which is not arbitrary: measured against this roster it leaves
 * about five agents in the dark at the end of warm-up and the long tail
 * regenerates them at roughly the rate the scheduler spends them. Raising it to
 * twenty minutes looks more dramatic and runs the pool dry inside ten.
 */
const NIGHT_MS = 8 * 60_000;
const NIGHT_MIN_CALLS = 24;

/** Ceremonies the economy stages, in rotation. */
const SCHEDULED: CeremonyKind[] = ["first-light", "first-stranger", "long-night", "graduation"];

/** Gap between staged ceremonies, and the quiet either side of any of them. */
const CEREMONY_MIN_MS = 24_000;
const CEREMONY_MAX_MS = 48_000;
const CEREMONY_LOCKOUT_MS = 9_000;
/** How soon to try again when a staged ceremony was refunded, or nobody was eligible. */
const CEREMONY_RETRY_MS = 6_000;
const CEREMONY_IDLE_MS = 12_000;

/**
 * Minimum spacing per kind, because three of the four draw from pools nothing
 * refills: there are only so many agents that have never been paid, never met an
 * outsider, or sit one cluster short. Spent at the scheduler's natural pace they
 * run dry inside an hour or two and the screen ends up staging nothing but Long
 * Nights, which regenerate. This rations a finite supply rather than pacing the
 * rhythm — the rhythm is the unordered draw below, and it is left alone.
 */
const COOL: Record<CeremonyKind, number> = {
  "first-light": 240_000,
  "first-stranger": 100_000,
  graduation: 100_000,
  "long-night": 0,
};

/** Sentinel clusters for a staged payment's origin. */
const ANY = -1;
const ANY_STRANGER = -2;

export type EconomyOptions = { agents?: number; seed?: number };

export class Economy {
  readonly agents: Agent[];
  private readonly r: Rng;
  /** Agent ids by cluster, so picking a neighbour is one draw rather than a scan. */
  private readonly members: number[][];
  /** Agents kept from meeting an outsider until someone is watching. */
  private readonly sheltered = new Set<number>();

  private t = 0;
  private seq = 0;
  private waitMs = 0;

  private burstUntil = -1;
  private burstTarget = -1;
  private lullUntil = -1;

  /** The ceremony `receiver()` staged, read and cleared by `settle()`. */
  private pending: CeremonyKind | null = null;
  /** Cluster the staged payment must come from: -1 any, -2 any but home. */
  private pendingFrom = ANY;
  private ceremonyDue = 0;
  private ceremonyLock = 0;
  private lastKind: CeremonyKind | null = null;
  /** Earliest clock each kind may be staged again. */
  private cool: Record<CeremonyKind, number> = {
    "first-light": 0,
    "first-stranger": 0,
    graduation: 0,
    "long-night": 0,
  };

  private revenue = 0;
  private txns = 0;
  private refunds = 0;
  private lit = 0;
  private graduated = 0;

  private readonly buckets = new Array<number>(BUCKETS).fill(0);
  private bucketAcc = 0;
  private bucketMs = 0;
  private warming = false;

  private feed: Settlement[] = [];
  private listeners = new Set<() => void>();
  private snap: EconomySnapshot;
  private commitAcc = 0;
  private version = 0;

  constructor({ agents = 200, seed = SEED }: EconomyOptions = {}) {
    this.r = rng(seed);
    const names = handles(agents, this.r);
    const places = placeAgents(agents, CLUSTERS, this.r);

    this.agents = names.map((handle, id) => {
      const p = places[id];
      // Log-uniform prices: most endpoints are fractions of a cent, a few are
      // worth real money, which is what gives the feed its dynamic range.
      const price = Math.exp(between(this.r, Math.log(0.0006), Math.log(0.075)));
      return {
        id,
        handle,
        service: pick(this.r, SERVICES),
        x: p.x,
        y: p.y,
        cluster: p.cluster,
        price: Math.round(price * 1e6) / 1e6,
        weight: Math.max(0.2, 1 + gaussian(this.r, 0, 0.5)),
        phase: this.r() * Math.PI * 2,
        // Most agents are near-perfect; a handful are quietly unreliable.
        flakiness: this.r() < 0.12 ? between(this.r, 0.04, 0.14) : between(this.r, 0, 0.012),
        calls: 0,
        earned: 0,
        refunds: 0,
        lastAt: -Infinity,
        firstLightAt: null,
        firstStrangerAt: null,
        graduatedAt: null,
        longestNightMs: 0,
        patrons: new Set<number>(),
        trace: newTrace(),
      } satisfies Agent;
    });

    this.members = Array.from({ length: CLUSTERS }, () => [] as number[]);
    for (const a of this.agents) this.members[a.cluster]?.push(a.id);

    // Drawn before warm-up so the shelter is part of the deterministic seed.
    while (this.sheltered.size < Math.min(STRANGER_RESERVE, agents)) {
      this.sheltered.add(Math.floor(this.r() * agents));
    }

    this.warm();
    this.ceremonyDue = this.t + between(this.r, 4_000, 11_000);
    this.snap = this.build();
  }

  /* ── clock ─────────────────────────────────────────────────────────────── */

  /**
   * Advance the simulation. New settlements are appended to `out` rather than
   * returned, so the render loop can reuse one array and allocate nothing.
   */
  tick(dtMs: number, out: Settlement[]): void {
    // A backgrounded tab hands back an enormous delta on return. Advancing the
    // whole gap would fire hundreds of particles at once, so we skip it instead.
    const dt = Math.min(100, Math.max(0, dtMs));
    this.t += dt;
    this.advanceBuckets(dt);

    this.waitMs -= dt;
    let guard = 0;
    while (this.waitMs <= 0 && guard++ < 24) {
      const s = this.settle();
      if (s) out.push(s);
      this.waitMs += exponential(this.r, this.rate()) * 1000;
    }

    this.commitAcc += dt;
    if (this.commitAcc >= COMMIT_MS) {
      this.commitAcc = 0;
      this.snap = this.build();
      this.version++;
      for (const fn of this.listeners) fn();
    }
  }

  /** Settlements per second right now. */
  private rate(): number {
    const s = this.t / 1000;
    // Two slow sines that never share a period, so the network's mood never
    // repeats on any interval a viewer could learn.
    const base = 2.15 + 1.05 * Math.sin(s / 23.4) + 0.55 * Math.sin(s / 7.31 + 1.2);
    let r = Math.max(0.22, base);

    if (this.t < this.burstUntil) r *= 4.2;
    else if (this.burstUntil > 0 && this.t >= this.burstUntil) {
      this.burstUntil = -1;
      this.burstTarget = -1;
    }

    if (this.t < this.lullUntil) r *= 0.14;
    else if (this.lullUntil > 0 && this.t >= this.lullUntil) this.lullUntil = -1;

    // Roughly one burst a minute and one lull every couple of minutes.
    if (this.burstUntil < 0 && this.lullUntil < 0) {
      if (this.r() < 0.0066) {
        this.burstUntil = this.t + between(this.r, 1_800, 4_600);
        this.burstTarget = this.hot();
      } else if (this.r() < 0.0033) {
        this.lullUntil = this.t + between(this.r, 2_800, 6_500);
      }
    }
    return r;
  }

  /* ── events ────────────────────────────────────────────────────────────── */

  private settle(): Settlement | null {
    const to = this.receiver();
    if (to < 0) return null;

    // Read and clear in one place: a staged ceremony is consumed by exactly the
    // payment it was staged for, whether or not it ends up earning one.
    const staged = this.pending;
    const stagedFrom = this.pendingFrom;
    this.pending = null;
    this.pendingFrom = ANY;

    const a = this.agents[to];
    const from = this.payer(to, stagedFrom);
    const stranger = this.agents[from].cluster !== a.cluster;

    // A handler that fails is refunded, never charged — the whole point of
    // atomic settlement. It still costs the network a round trip, so it counts
    // as an attempt and it still shows up on the field, as a payment that
    // never lands.
    const failed = this.r() < a.flakiness;
    const state: SettlementState = failed ? "refunded" : "settled";

    // 8% of calls are metered rather than fixed-price — x402's `upto` scheme.
    const metered = this.r() < 0.08;
    const amount = failed ? 0 : a.price * (metered ? between(this.r, 0.3, 1) : 1);

    // `lastAt` is the last time it *earned*, so a failed call does not end a
    // night. Nobody paid, and the silence the agent is sitting in is unbroken.
    const quietMs = a.lastAt === -Infinity ? 0 : this.t - a.lastAt;

    a.calls++;
    a.weight += 0.35;
    this.txns++;
    record(a.trace, quietMs, stranger, failed);

    // A refunded ceremony is not a ceremony: nothing was paid, so nothing
    // happened. The staged moment is spent, and the scheduler tries again soon.
    let kind: CeremonyKind | null = failed ? null : staged;
    if (failed && staged) this.ceremonyDue = this.t + CEREMONY_RETRY_MS;

    if (failed) {
      a.refunds++;
      this.refunds++;
    } else {
      a.earned += amount;
      this.revenue += amount;
      a.lastAt = this.t;
      a.patrons.add(this.agents[from].cluster);
      if (quietMs > a.longestNightMs) a.longestNightMs = quietMs;

      // The facts below are recorded every time they become true. Whether one
      // of them gets a *ceremony* is a separate question, answered above by the
      // scheduler — otherwise a screen with two hundred agents on it would stop
      // for something every few seconds and none of it would land.
      if (a.firstLightAt === null) {
        a.firstLightAt = this.t;
        this.lit++;
      }
      if (stranger && a.firstStrangerAt === null) a.firstStrangerAt = this.t;
      if (a.graduatedAt === null && a.patrons.size >= CLUSTERS) {
        a.graduatedAt = this.t;
        this.graduated++;
      }
    }

    // Last gate: a staged ceremony only counts if the fact it names actually
    // became true on this payment. The economy stages the timing and never the
    // truth, so if the two disagree the truth wins and the moment is dropped.
    if (kind && !happened(a, kind, this.t, quietMs)) kind = null;

    if (kind) this.ceremonyLock = this.t + CEREMONY_LOCKOUT_MS;
    this.bucketAcc++;

    const s: Settlement = {
      id: ++this.seq,
      from,
      to,
      amount,
      at: this.t,
      state,
      ceremony: kind,
      stranger,
      quietMs,
    };
    this.feed.unshift(s);
    if (this.feed.length > FEED) this.feed.length = FEED;
    return s;
  }

  /**
   * Who pays. Agents mostly buy from their own neighbourhood; occasionally
   * someone from the other side of the field finds them.
   *
   * `want` is the cluster a staged ceremony needs the payment to come from —
   * ANY to leave it to chance, ANY_STRANGER for anywhere but home.
   */
  private payer(to: number, want: number): number {
    const home = this.agents[to].cluster;

    if (want >= 0) return this.fromCluster(want, to);
    if (want === ANY_STRANGER) return this.fromAnywhereBut(home, to);

    // Sheltered agents hear only from their neighbours until the field is live.
    const shelter = this.warming && this.sheltered.has(to);
    if (shelter || this.r() > STRANGER_ODDS) {
      const m = this.members[home];
      if (m.length > 1) {
        let k = Math.floor(this.r() * m.length);
        if (m[k] === to) k = (k + 1) % m.length;
        return m[k];
      }
    }
    return this.fromAnywhereBut(home, to);
  }

  private fromCluster(cluster: number, not: number): number {
    const m = this.members[cluster];
    if (!m || m.length === 0) return this.fromAnywhereBut(this.agents[not].cluster, not);
    let k = Math.floor(this.r() * m.length);
    if (m[k] === not) k = (k + 1) % m.length;
    return m[k];
  }

  /** Bounded, so a degenerate roster with a single cluster cannot spin here. */
  private fromAnywhereBut(home: number, not: number): number {
    let p = Math.floor(this.r() * this.agents.length);
    for (let guard = 0; guard < 16 && this.agents[p].cluster === home; guard++) {
      p = Math.floor(this.r() * this.agents.length);
    }
    if (p === not) p = (p + 1) % this.agents.length;
    return p;
  }

  /**
   * Who gets paid. Tournament selection on weight gives the power-law shape a
   * real marketplace has — a few hubs, a long tail — without rebuilding a
   * cumulative table on every draw.
   *
   * Once a ceremony is due this also acts as the stage manager: it finds someone
   * the moment is genuinely true for and sends the next payment there. It never
   * invents the fact, only the timing.
   */
  private receiver(): number {
    if (this.warming) {
      // Hold a reserve of never-paid agents back so the live field has First
      // Lights left to give.
      if (this.lit >= this.agents.length - UNLIT_RESERVE) return this.pickLit();
      return this.tournament();
    }

    if (this.t >= this.ceremonyDue && this.t >= this.ceremonyLock) {
      const pool: { kind: CeremonyKind; who: number }[] = [];
      for (const kind of SCHEDULED) {
        if (this.t < this.cool[kind]) continue;
        const who = this.candidate(kind);
        if (who >= 0) pool.push({ kind, who });
      }

      if (pool.length > 0) {
        // Never the same kind twice running while another is available, but
        // otherwise unordered. A strict rotation would be a metronome, and the
        // one thing this screen must never become is predictable — a viewer who
        // can guess what happens next has stopped watching it.
        const fresh = pool.filter((p) => p.kind !== this.lastKind);
        const from = fresh.length > 0 ? fresh : pool;
        const choice = from[Math.floor(this.r() * from.length)];

        this.lastKind = choice.kind;
        this.cool[choice.kind] = this.t + COOL[choice.kind];
        this.pending = choice.kind;
        this.pendingFrom = this.originFor(choice.kind, choice.who);
        this.ceremonyDue = this.t + between(this.r, CEREMONY_MIN_MS, CEREMONY_MAX_MS);
        return choice.who;
      }
      this.ceremonyDue = this.t + CEREMONY_IDLE_MS;
    }

    if (this.burstTarget >= 0 && this.r() < 0.62) return this.burstTarget;
    return this.pickLit();
  }

  /** Someone the moment is actually true for, or -1 if nobody qualifies yet. */
  private candidate(kind: CeremonyKind): number {
    switch (kind) {
      case "first-light":
        return this.pickUnlit();

      case "first-stranger": {
        // The most established agent that has still only ever been paid by its
        // own neighbours. The longer that has been true, the more the arrival
        // of an outsider means.
        let best = -1;
        for (const a of this.agents) {
          if (a.firstLightAt === null || a.firstStrangerAt !== null) continue;
          if (best < 0 || a.calls > this.agents[best].calls) best = a.id;
        }
        return best;
      }

      case "long-night": {
        // Whoever has been in the dark longest, provided it had a life before it.
        let best = -1;
        for (const a of this.agents) {
          if (a.firstLightAt === null || a.calls < NIGHT_MIN_CALLS) continue;
          if (this.t - a.lastAt < NIGHT_MS) continue;
          if (best < 0 || a.lastAt < this.agents[best].lastAt) best = a.id;
        }
        return best;
      }

      case "graduation": {
        // One cluster short of the whole network. A single payment from the one
        // it has never heard from finishes the set — which is why graduation can
        // be staged at all, and why it cannot be staged early.
        let best = -1;
        for (const a of this.agents) {
          if (a.graduatedAt !== null || a.patrons.size !== CLUSTERS - 1) continue;
          if (best < 0 || a.calls > this.agents[best].calls) best = a.id;
        }
        return best;
      }
    }
  }

  /** Which cluster a staged payment has to come from for its moment to be true. */
  private originFor(kind: CeremonyKind, who: number): number {
    if (kind === "first-stranger") return ANY_STRANGER;
    if (kind === "graduation") {
      const a = this.agents[who];
      for (let c = 0; c < CLUSTERS; c++) if (!a.patrons.has(c)) return c;
    }
    return ANY;
  }

  private tournament(): number {
    let best = Math.floor(this.r() * this.agents.length);
    for (let i = 0; i < 3; i++) {
      const c = Math.floor(this.r() * this.agents.length);
      if (this.agents[c].weight > this.agents[best].weight) best = c;
    }
    return best;
  }

  /** Tournament restricted to agents that have already earned at least once. */
  private pickLit(): number {
    let best = -1;
    for (let i = 0; i < 6; i++) {
      const c = Math.floor(this.r() * this.agents.length);
      if (this.agents[c].firstLightAt === null) continue;
      if (best < 0 || this.agents[c].weight > this.agents[best].weight) best = c;
    }
    return best >= 0 ? best : this.tournament();
  }

  private pickUnlit(): number {
    const dark: number[] = [];
    for (const a of this.agents) if (a.firstLightAt === null) dark.push(a.id);
    return dark.length ? dark[Math.floor(this.r() * dark.length)] : -1;
  }

  private hot(): number {
    let best = 0;
    for (let i = 0; i < 12; i++) {
      const c = Math.floor(this.r() * this.agents.length);
      if (this.agents[c].weight > this.agents[best].weight) best = c;
    }
    return best;
  }

  /* ── history ───────────────────────────────────────────────────────────── */

  private advanceBuckets(dt: number) {
    this.bucketMs += dt;
    while (this.bucketMs >= BUCKET_MS) {
      this.bucketMs -= BUCKET_MS;
      this.buckets.shift();
      this.buckets.push(this.bucketAcc);
      this.bucketAcc = 0;
    }
  }

  /* ── warm-up ───────────────────────────────────────────────────────────── */

  /**
   * Run the economy for a few hours before anyone is watching. Costs a couple
   * of milliseconds at construction and buys the one thing a live visualisation
   * cannot fake: a past. The field opens with real hubs, real history and a
   * full timeline instead of a polite empty state.
   *
   * It also opens with agents already deep in a silence they have not yet come
   * back from, which is where the first Long Night comes from — you cannot wait
   * twenty-two minutes for one on a screen somebody just opened.
   */
  private warm() {
    this.warming = true;
    const end = WARM_MS;
    while (this.t < end) {
      this.t += WARM_STEP;
      this.advanceBuckets(WARM_STEP);
      this.waitMs -= WARM_STEP;
      let guard = 0;
      while (this.waitMs <= 0 && guard++ < 40) {
        this.settle();
        this.waitMs += exponential(this.r, this.rate()) * 1000;
      }
    }
    this.warming = false;
  }

  /* ── the read side ─────────────────────────────────────────────────────── */

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snap;

  /** Simulation clock in ms, for ageing rows in the feed. */
  now = () => this.t;

  private build(): EconomySnapshot {
    let healthy = 0;
    for (const a of this.agents) {
      if (a.calls > 0 && a.refunds / a.calls <= 0.04) healthy++;
    }
    // The last minute of the rolling window, which is twelve five-second buckets.
    let lastMinute = 0;
    for (let i = BUCKETS - 12; i < BUCKETS; i++) lastMinute += this.buckets[i];

    return {
      version: this.version,
      revenue: this.revenue,
      txns: this.txns,
      refunds: this.refunds,
      healthy,
      agents: this.agents.length,
      lit: this.lit,
      graduated: this.graduated,
      settlementRate: this.txns ? (this.txns - this.refunds) / this.txns : 1,
      perMinute: lastMinute,
      recent: this.feed.slice(0, FEED),
      histogram: this.buckets.slice(),
      elapsedMs: this.t,
    };
  }
}

/**
 * Did the moment this payment was staged for actually just happen?
 *
 * Every ceremony field is set exactly once and stamped with the clock, so
 * "became true on this payment" is just "was stamped now". Long Night is the
 * exception: it is a property of the silence before, not of a field.
 */
function happened(a: Agent, kind: CeremonyKind, t: number, quietMs: number): boolean {
  switch (kind) {
    case "first-light":
      return a.firstLightAt === t;
    case "first-stranger":
      return a.firstStrangerAt === t;
    case "graduation":
      return a.graduatedAt === t;
    case "long-night":
      return quietMs >= NIGHT_MS;
  }
}

/** What the panels render before the client engine exists. */
export const EMPTY_SNAPSHOT: EconomySnapshot = {
  version: -1,
  revenue: 0,
  txns: 0,
  refunds: 0,
  healthy: 0,
  agents: 0,
  lit: 0,
  graduated: 0,
  settlementRate: 1,
  perMinute: 0,
  recent: [],
  histogram: new Array<number>(BUCKETS).fill(0),
  elapsedMs: 0,
};

export const TIMELINE_SPAN_MS = BUCKETS * BUCKET_MS;
