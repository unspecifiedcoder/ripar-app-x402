// The vocabulary Mission Control is built on. Deliberately small: an economy is
// agents, the payments between them, and the light that leaves behind.

export type SettlementState = "settled" | "refunded";

/**
 * The four moments in an agent's life worth stopping for.
 *
 * Each one can only ever happen to a given agent once, which is the entire
 * licence for interrupting a screen that shows two settlements a second. If you
 * add a fifth, hold it to the same bar: if it can recur, it is a notification,
 * not a ceremony, and it belongs in the feed.
 */
export type CeremonyKind =
  /** The first time it was ever paid. */
  | "first-light"
  /** The first time it was paid by someone outside its own cluster. */
  | "first-stranger"
  /** It went quiet for a long time, and then someone came back. */
  | "long-night"
  /** Every cluster in the network has now paid it. It is known everywhere. */
  | "graduation";

/** How many events of its own history each agent carries. Also the strand count. */
export const TRACE = 15;

/**
 * An agent's short-term memory: the last fifteen things that happened to it.
 *
 * This exists so DNA can be grown from behaviour instead of from a name. It is
 * a fixed-size ring so it costs the same whether an agent has been paid twice or
 * two hundred thousand times.
 */
export type Trace = {
  /** Silence, in ms, before each event. */
  gaps: Float32Array;
  /** Bit 1: the payer was outside the cluster. Bit 2: the call was refunded. */
  flags: Uint8Array;
  /** Write cursor into the ring. */
  head: number;
  /** Events written, saturating at TRACE. */
  count: number;
};

export const STRANGER_FLAG = 1;
export const REFUND_FLAG = 2;

export function newTrace(): Trace {
  return { gaps: new Float32Array(TRACE), flags: new Uint8Array(TRACE), head: 0, count: 0 };
}

export function record(t: Trace, gap: number, stranger: boolean, refunded: boolean): void {
  t.gaps[t.head] = gap;
  t.flags[t.head] = (stranger ? STRANGER_FLAG : 0) | (refunded ? REFUND_FLAG : 0);
  t.head = (t.head + 1) % TRACE;
  if (t.count < TRACE) t.count++;
}

/** Walk the ring oldest-first. Returns TRACE entries; pad is true before an agent has a full history. */
export function readTrace(t: Trace): { gap: number; stranger: boolean; refunded: boolean; pad: boolean }[] {
  const out = [];
  for (let i = 0; i < TRACE; i++) {
    const pad = i >= t.count;
    // The ring's oldest entry sits just past the head once it has wrapped.
    const idx = (t.head - t.count + i + TRACE * 2) % TRACE;
    out.push({
      gap: pad ? 0 : t.gaps[idx],
      stranger: !pad && (t.flags[idx] & STRANGER_FLAG) !== 0,
      refunded: !pad && (t.flags[idx] & REFUND_FLAG) !== 0,
      pad,
    });
  }
  return out;
}

export type Agent = {
  id: number;
  handle: string;
  service: string;
  /** Field position in unit space, roughly -1..1 on both axes. */
  x: number;
  y: number;
  cluster: number;
  /** Per-call price in USDC. Fixed per agent, the way an x402 endpoint is. */
  price: number;
  /** Preferential-attachment weight — busy agents get busier. */
  weight: number;
  /** Breathing offset, so 200 nodes never inhale in unison. */
  phase: number;
  /** How often this agent's handler fails. A few are visibly worse than the rest. */
  flakiness: number;
  calls: number;
  earned: number;
  refunds: number;
  lastAt: number;

  // Ceremony state. All of these are nullable, set exactly once, and never
  // unset — that invariant is what makes a ceremony unrepeatable. If you add a
  // fifth ceremony, follow the shape.

  /** Null until the agent has ever been paid. The moment it isn't is First Light. */
  firstLightAt: number | null;
  /** Null until someone outside its cluster has paid it. */
  firstStrangerAt: number | null;
  /** Null until every cluster in the network has paid it at least once. */
  graduatedAt: number | null;
  /** The longest silence this agent has ever come back from, in ms. */
  longestNightMs: number;
  /** Distinct clusters that have ever paid it. Payer diversity, for DNA. */
  patrons: Set<number>;
  trace: Trace;
};

export type Settlement = {
  id: number;
  from: number;
  to: number;
  amount: number;
  /** Simulation clock, ms since the field came up. */
  at: number;
  state: SettlementState;
  /** Set when this payment is also a moment. Null for the overwhelming majority. */
  ceremony: CeremonyKind | null;
  /** The payer was outside the receiver's cluster. */
  stranger: boolean;
  /** How long the receiver had been silent before this landed. */
  quietMs: number;
};

/** What the glass panels read. Rebuilt on a slow tick, never per frame. */
export type EconomySnapshot = {
  version: number;
  revenue: number;
  txns: number;
  refunds: number;
  healthy: number;
  agents: number;
  lit: number;
  /** Agents whose lifetime earnings have crossed the graduation line. */
  graduated: number;
  /** Settled as a share of all attempts, 0..1. */
  settlementRate: number;
  perMinute: number;
  recent: Settlement[];
  /** 72 buckets of settlement counts, oldest first, for the timeline. */
  histogram: number[];
  elapsedMs: number;
};
