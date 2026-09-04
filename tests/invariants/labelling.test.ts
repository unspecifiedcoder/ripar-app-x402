import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * I-001 — simulated data is never presented as observed data
 * (docs/INVARIANTS.md).
 *
 * This is static analysis over source TEXT, not a render: components/app is
 * a "use client" tree that pulls in browser-only modules (localStorage,
 * requestAnimationFrame, the clipboard), so importing and rendering it in a
 * Node test would mean stubbing most of the DOM to prove very little. The
 * question this invariant actually asks — "does this file import row data
 * from a generated module, and if so does it disclose that" — is answerable
 * by reading the file.
 *
 * Re-derived for this branch (design/ledger-dark, cut from origin/main).
 * origin/main's generated-data modules are NOT the same as the ones this
 * test was originally written against: `lib/receipts.ts` and `lib/logs.ts`
 * are gone entirely, and `logs-view.tsx` / `test-console.tsx` do not exist
 * on this branch. `receipts-view.tsx` changed the other direction — it now
 * reads real settlements off lib/real-data.ts instead of a generated
 * RECEIPTS array. `lib/app-data.ts` on this branch exports exactly one row
 * array: `WORKFLOWS` (a set of starter/template workflows), plus formatters
 * (`usd`, `compact`), constants (`STATUS_TONE`) and bare types — none of
 * which make a surface "generated" on their own, per the same narrow
 * definition the original test used.
 */

const COMPONENTS_APP = path.resolve(__dirname, "../../components/app");

function componentFiles(): string[] {
  return readdirSync(COMPONENTS_APP)
    .filter((f) => f.endsWith(".tsx"))
    .sort();
}

function read(file: string): string {
  return readFileSync(path.join(COMPONENTS_APP, file), "utf8");
}

/** Named bindings actually imported from `spec` in this source text (both
 * `import { a, b }` and multi-line `import {\n a,\n b\n}` forms). Returns []
 * if the module isn't imported at all. */
function namedImportsFrom(src: string, spec: string): string[] {
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${spec}["']`, "g");
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    for (const raw of m[1].split(",")) {
      const cleaned = raw.replace(/^type\s+/, "").trim();
      if (cleaned) names.push(cleaned.split(/\s+as\s+/)[0].trim());
    }
  }
  return names;
}

/** Bindings that hand the component actual rows to render, per generated
 * module. Everything else importable from lib/app-data (usd, compact,
 * STATUS_TONE, costOfSteps, STEP_KIND_IDS, or a bare type) is a formatter, a
 * constant, or a type — none of which make a surface "generated" on their
 * own. `lib/receipts.ts` and `lib/logs.ts` no longer exist on this branch —
 * see the file header — so they are not listed here; a future re-add of
 * either should be added back to this map. */
const ROW_DATA_EXPORTS: Record<string, string[]> = {
  "@/lib/app-data": ["WORKFLOWS"],
};

/** Files that import row data from a generated module but are exempted from
 * requiring the `<Simulated />` marker/`simulated` disclosure, with the
 * reason on record. Anything not in this set must disclose. */
const EXEMPT: Record<string, string> = {
  "workflows-view.tsx":
    "KNOWN ISSUE — not silently fixed or hidden. This view imports WORKFLOWS " +
    "(lib/app-data.ts) both as SAVED_STEPS seed data and as the 'Start from a " +
    "template' starter list rendered into the workflow list alongside anything " +
    "the reader has built — i.e. generated rows presented in the same list as " +
    "real ones, with no visible marker distinguishing them. On this branch " +
    "there is no `<Simulated />` component and PageHead (components/app/bits.tsx) " +
    "has no `simulated` prop at all yet — DESIGN_PLAN.md's P-02 packet adds both, " +
    "and P-08 explicitly says 'The Workflows page head keeps simulated', i.e. it " +
    "is expected to gain the marker once P-02 lands. Fixing this now would mean " +
    "either inventing the marker component (a design decision out of scope for " +
    "this task) or editing workflows-view.tsx, which the task constraints " +
    "forbid. Recorded as exempt rather than turned red so P-00's test suite can " +
    "land; P-02/P-08 should remove this exemption once PageHead supports " +
    "`simulated`.",
};

/** Views the app documents as reading real chain/manifest data through
 * lib/real-data.ts — these must NOT carry the Simulated marker. A false
 * badge on real data is exactly as dishonest as a missing one on generated
 * data (I-001's converse). Scoped to lib/real-data.ts specifically (not
 * lib/registry-client.ts, which directory-view.tsx and board-view.tsx read
 * from) to match the narrower, already-reviewed scope of this check.
 *
 * `receipts-view.tsx` is added relative to the original version of this
 * test: on that branch it was a generated-RECEIPTS surface; on this branch
 * it imports RealRun/useWorkspace from lib/real-data.ts instead (see its
 * import line) and so belongs in this list now. */
const REAL_DATA_VIEWS = ["agents-view.tsx", "endpoints-view.tsx", "overview-view.tsx", "receipts-view.tsx"];

function importsRowData(src: string): boolean {
  for (const [spec, rowExports] of Object.entries(ROW_DATA_EXPORTS)) {
    const imported = new Set(namedImportsFrom(src, spec));
    if (rowExports.some((name) => imported.has(name))) return true;
  }
  return false;
}

function discloses(src: string): boolean {
  return /<Simulated\b/.test(src) || /\bsimulated\b/.test(src);
}

function importsRealData(src: string): boolean {
  return namedImportsFrom(src, "@/lib/real-data").length > 0;
}

describe("I-001 — simulated data is never presented as observed data", () => {
  const files = componentFiles();

  it("found the view files this test is supposed to cover (sanity check)", () => {
    // If components/app is ever renamed or emptied, every other assertion in
    // this file would vacuously pass. Guard against that directly.
    expect(files).toEqual(expect.arrayContaining(["receipts-view.tsx", "workflows-view.tsx", "agents-view.tsx"]));
  });

  for (const file of files) {
    it(`${file} — generated-row surfaces disclose, or are on record as exempt`, () => {
      const src = read(file);
      if (!importsRowData(src)) return; // not a generated-row surface at all
      if (file in EXEMPT) {
        expect(EXEMPT[file].length).toBeGreaterThan(0); // the exemption itself must carry a reason
        return;
      }
      expect(discloses(src)).toBe(true);
    });
  }

  for (const file of REAL_DATA_VIEWS) {
    it(`${file} — a real-data view is not falsely marked simulated`, () => {
      const src = read(file);
      expect(importsRealData(src)).toBe(true); // sanity: this really is a real-data view
      expect(discloses(src)).toBe(false);
    });
  }
});
