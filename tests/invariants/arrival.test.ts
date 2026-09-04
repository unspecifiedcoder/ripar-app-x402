import { describe, it, expect } from "vitest";
import { markArrivals, type RealRun } from "../../lib/real-data";

/**
 * P-04 / D-014 — arrival is a data-layer fact, not a component guess.
 *
 * `useWorkspace` replaces `runs` wholesale every ~30s poll, so nothing above
 * the data layer can tell a settlement that just landed from one shown for a
 * minute. The gold "money just arrived" bloom (D-005) must fire only when
 * `markArrivals` says a row's id is new across polls — never from `when`,
 * `round`, or array position, all of which would fire on every poll and every
 * mount.
 *
 * This suite exercises `markArrivals` directly: no network, no React, no
 * timers — just the pure id-tracking rule.
 */

function run(id: string, extra: Partial<RealRun> = {}): RealRun {
  return {
    id,
    target: "TARGET",
    round: 100,
    when: 1_000,
    amountUsdc: 1,
    from: "FROM",
    to: "TARGET",
    arrived: false,
    ...extra,
  };
}

describe("markArrivals (I: arrival is a data-layer fact)", () => {
  it("initial load (empty seen) marks every run arrived:false, and records every id", () => {
    const runs = [run("a"), run("b"), run("c")];
    const { runs: marked, next } = markArrivals(new Set(), runs);

    expect(marked.map((r) => r.arrived)).toEqual([false, false, false]);
    expect(next).toEqual(new Set(["a", "b", "c"]));
  });

  it("second call marks exactly the new id, leaves the rest false", () => {
    const seen = new Set(["a", "b"]);
    const runs = [run("a"), run("b"), run("c")];

    const { runs: marked, next } = markArrivals(seen, runs);

    expect(marked.find((r) => r.id === "a")?.arrived).toBe(false);
    expect(marked.find((r) => r.id === "b")?.arrived).toBe(false);
    expect(marked.find((r) => r.id === "c")?.arrived).toBe(true);
    expect(next).toEqual(new Set(["a", "b", "c"]));
  });

  it("third call with the same runs clears the previously-new id", () => {
    const seen = new Set(["a", "b", "c"]); // as produced by the previous poll
    const runs = [run("a"), run("b"), run("c")];

    const { runs: marked, next } = markArrivals(seen, runs);

    expect(marked.every((r) => r.arrived === false)).toBe(true);
    expect(next).toEqual(new Set(["a", "b", "c"]));
  });

  it("an id that disappears and later returns is NOT re-marked as arrived", () => {
    // Poll 1: a, b seen.
    let seen = new Set(["a", "b"]);
    // Poll 2: b drops out of the window (e.g. capped out of the query).
    let result = markArrivals(seen, [run("a")]);
    seen = result.next;
    expect(seen).toEqual(new Set(["a", "b"])); // b stays remembered, not forgotten

    // Poll 3: b comes back.
    result = markArrivals(seen, [run("a"), run("b")]);
    expect(result.runs.find((r) => r.id === "b")?.arrived).toBe(false);
    expect(result.runs.find((r) => r.id === "a")?.arrived).toBe(false);
  });

  it("does not mutate its inputs", () => {
    const seen = new Set(["a"]);
    const seenBefore = new Set(seen);
    const runs = [run("a"), run("b")];
    const runsBefore = runs.map((r) => ({ ...r }));

    markArrivals(seen, runs);

    expect(seen).toEqual(seenBefore);
    expect(runs).toEqual(runsBefore);
    // Same object identity for the array and every element passed in.
    runs.forEach((r, i) => expect(r).toBe(runs[i]));
  });

  it("empty runs against a non-empty seen returns [] and next equal to seen", () => {
    const seen = new Set(["a", "b"]);
    const { runs: marked, next } = markArrivals(seen, []);

    expect(marked).toEqual([]);
    expect(next).toEqual(new Set(["a", "b"]));
  });
});
