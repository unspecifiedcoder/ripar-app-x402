// Drives the real renderer against a stub 2D context.
//
// It cannot tell you whether the screen looks good — nothing here can, that
// still needs eyes on a real GPU. What it can tell you is that the renderer does
// not throw over a long run, and that the ceremony state machine is sound:
// every moment rises, lands, and clears, exactly one at a time, and none of them
// leaves the world dimmed.
//
// The viewport is deliberately very wide. The one real bug found while building
// the ceremonies only appeared when two agents were far enough apart that the
// payment outlasted the dim, and a 1280-wide test would have sailed past it.
//
// Usage: node render-smoke.cjs <dir containing compiled renderer.js>

const path = require("path");

const gradient = { addColorStop() {} };
const ctx = new Proxy(
  {},
  {
    get(_, k) {
      if (k === "createRadialGradient" || k === "createLinearGradient") return () => gradient;
      return () => {};
    },
    set: () => true,
  }
);
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const dir = path.resolve(process.argv[2]);
const { Economy } = require(path.join(dir, "economy.js"));
const { StreamRenderer } = require(path.join(dir, "renderer.js"));

const MINUTES = 12;
const DT = 16;
/** Nothing should hold the world back anywhere near this long. */
const STUCK_MS = 12_000;

const economy = new Economy({ agents: 200 });
const r = new StreamRenderer(economy.agents);
r.resize(2560, 1400);

const seen = [];
const problems = [];
let open = null;

r.onCeremony = (c) => {
  if (c === null) {
    if (!open) problems.push("cleared with nothing open");
    else if (!open.lit) problems.push(`${open.kind} on ${open.handle} cleared before it landed`);
    open = null;
    return;
  }
  if (c.phase === "rising") {
    if (open) problems.push(`${c.kind} began while ${open.kind} was still running`);
    open = { kind: c.kind, handle: c.handle, lit: false, t: 0 };
    seen.push(c);
  } else if (!open) {
    problems.push(`${c.kind} landed with nothing open`);
  } else {
    open.lit = true;
  }
};

const buf = [];
let t = 0;
for (let i = 0; i < (MINUTES * 60 * 1000) / DT; i++) {
  t += DT;
  buf.length = 0;
  economy.tick(DT, buf);
  r.frame(ctx, DT, t, buf);
  if (open) {
    open.t += DT;
    if (open.t > STUCK_MS) {
      problems.push(`${open.kind} stuck open for ${open.t}ms`);
      open = null;
    }
  }
}

const by = {};
for (const s of seen) by[s.kind] = (by[s.kind] || 0) + 1;
console.log(`=== ${MINUTES} simulated minutes at ${1000 / DT}fps ===`);
console.log("  no exceptions");
console.log("  moments staged", seen.length, JSON.stringify(by));
console.log("  circlets on screen", economy.agents.filter((a) => a.graduatedAt !== null).length);

console.log(problems.length ? "\nFAIL\n  " + problems.join("\n  ") : "\nOK  every moment rose, landed and cleared, one at a time");
process.exitCode = problems.length ? 1 : 0;
