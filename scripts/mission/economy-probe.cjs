// Does the economy still produce all four moments, at a watchable pace?
//
// The thresholds in economy.ts are not guesses, they are fitted to this roster,
// and this is the thing they were fitted against. If you change NIGHT_MS,
// STRANGER_RESERVE, UNLIT_RESERVE, CLUSTERS or the ceremony interval, run this
// and read the two numbers that matter: every kind should appear, and the
// longest gap between moments should stay under about a minute.
//
// Usage: node economy-probe.cjs <dir containing compiled economy.js>

const path = require("path");
const { Economy, CLUSTERS } = require(path.resolve(process.argv[2], "economy.js"));

const MINUTES = 10;
const e = new Economy({ agents: 200 });
const A = e.agents;
const pct = (xs, p) => xs.slice().sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)];

console.log("=== the field as it opens ===");
console.log("  simulated history   ", (e.now() / 3600000).toFixed(2), "hours");
console.log("  earning             ", A.filter((a) => a.firstLightAt !== null).length, "/", A.length);
console.log("  known everywhere    ", A.filter((a) => a.graduatedAt !== null).length);
console.log("  never met a stranger", A.filter((a) => a.firstStrangerAt === null).length);
console.log("  calls p50/p90/max   ", pct(A.map((a) => a.calls), 0.5), pct(A.map((a) => a.calls), 0.9),
  Math.max(...A.map((a) => a.calls)));

// Candidate pools. Any of these at zero means that ceremony cannot fire at all.
const pool = {
  "first-light": A.filter((a) => a.firstLightAt === null).length,
  "first-stranger": A.filter((a) => a.firstLightAt !== null && a.firstStrangerAt === null).length,
  "long-night": A.filter((a) => a.firstLightAt !== null && a.calls >= 24 && e.now() - a.lastAt >= 8 * 60000).length,
  graduation: A.filter((a) => a.graduatedAt === null && a.patrons.size === CLUSTERS - 1).length,
};
console.log("  candidate pools     ", JSON.stringify(pool));

const start = e.now();
const fired = [];
const buf = [];
for (let i = 0; i < (MINUTES * 60 * 1000) / 16; i++) {
  buf.length = 0;
  e.tick(16, buf);
  for (const s of buf) if (s.ceremony) fired.push(s);
}

console.log(`\n=== ${MINUTES} live minutes ===`);
const by = {};
for (const f of fired) by[f.ceremony] = (by[f.ceremony] || 0) + 1;
console.log("  moments", fired.length, JSON.stringify(by));

let maxGap = 0;
let prev = start;
for (const f of fired) {
  maxGap = Math.max(maxGap, f.at - prev);
  prev = f.at;
}
console.log("  longest quiet stretch", (maxGap / 1000).toFixed(0), "s");
for (const f of fired.slice(0, 8)) {
  console.log(`   ${((f.at - start) / 1000).toFixed(0).padStart(5)}s  ${f.ceremony.padEnd(15)} ${A[f.to].handle}`);
}

// Same seed, same economy, or the page hydrates into a different universe than
// the one the server rendered.
const same = new Economy({ agents: 200 }).getSnapshot().revenue === new Economy({ agents: 200 }).getSnapshot().revenue;

const missing = Object.keys(pool).filter((k) => !by[k]);
const bad = [];
if (!same) bad.push("construction is not deterministic — hydration will mismatch");
if (missing.length) bad.push(`never fired: ${missing.join(", ")}`);
if (maxGap > 90_000) bad.push(`${(maxGap / 1000).toFixed(0)}s without a moment is too long to watch`);

console.log(bad.length ? "\nFAIL\n  " + bad.join("\n  ") : "\nOK  deterministic, all four kinds fired, pace is watchable");
process.exitCode = bad.length ? 1 : 0;
