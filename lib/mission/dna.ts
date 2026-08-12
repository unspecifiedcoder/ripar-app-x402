// Agent DNA.
//
// Fifteen bars, one per remembered event, oldest on the left. Read left to
// right it is the last stretch of an agent's working life:
//
//   height  earning cadence — a tall bar is a call that came hard on the heels
//           of the last one, a short one followed a silence
//   colour  who paid — a warm bar is someone from outside the agent's own
//           cluster. Those are rare, so reach reads as a few gold bars in a
//           grey strand rather than as gold everywhere, which would say nothing
//   scar    a refund: a notch, drawn short and dim, because nothing was earned
//
// It is not decorative and it is not a hash. Two agents with the same traffic
// look alike, and an agent's strand changes as its life does — which is the
// point, and the whole reason the handle-derived placeholder this replaces was
// never going to be enough. You cannot forge one by picking a good name.
//
// Every input comes off `Agent.trace`, a fixed-size ring the economy writes on
// each settlement. When this is wired to real data the source changes and this
// file does not: earning cadence, payer diversity and refund history are all
// things the chain can prove.

import { readTrace, TRACE, type Agent } from "./types";

export type Strand = {
  /** 0..1 of the available height. */
  height: number;
  /** Paid by someone outside the agent's own cluster. */
  warm: boolean;
  /** This call was refunded. */
  scar: boolean;
  /** No event here yet — the agent has not lived long enough to fill the strand. */
  empty: boolean;
};

/**
 * Gaps are wildly log-distributed — a busy hub is paid milliseconds apart, the
 * tail waits minutes — so the bars are drawn on a log scale. Anything under a
 * second is as tall as it gets; a five-minute silence bottoms out.
 */
const FAST_MS = 1_000;
const SLOW_MS = 300_000;

function cadence(gap: number): number {
  if (gap <= FAST_MS) return 1;
  if (gap >= SLOW_MS) return 0;
  const span = Math.log(SLOW_MS) - Math.log(FAST_MS);
  return 1 - (Math.log(gap) - Math.log(FAST_MS)) / span;
}

export function dna(agent: Agent): Strand[] {
  return readTrace(agent.trace).map(({ gap, stranger, refunded, pad }) => {
    if (pad) return { height: 0.12, warm: false, scar: false, empty: true };
    // A refund is drawn as a notch rather than a bar. It did happen, and it
    // should be visible, but it is not something the agent earned.
    if (refunded) return { height: 0.2, warm: false, scar: true, empty: false };
    return {
      // Floored so a very slow agent still reads as alive rather than as a gap.
      height: 0.18 + cadence(gap) * 0.82,
      warm: stranger,
      scar: false,
      empty: false,
    };
  });
}

export { TRACE as STRANDS };
