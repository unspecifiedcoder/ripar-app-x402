import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { CLAIMS_ALLOWLIST } from "./claims.allowlist";

/**
 * I-007 — claims in UI copy are backed by evidence in the same view
 * (docs/INVARIANTS.md).
 *
 * Scans customer-facing copy for the claim vocabulary and fails on any hit
 * not registered in claims.allowlist.ts. This is a source-text scan, not a
 * render: it looks at JSX text and a fixed set of visible-copy keys
 * (title/subtitle/description/label/placeholder/blurb/body/hint/desc/
 * summary), whether they are written as a JSX prop (`subtitle="…"`) or a
 * plain object field later spread into JSX (`{ desc: "…" }` then `{card.desc}`
 * — dashboard-preview.tsx does exactly this). Code comments are excluded
 * before scanning, on purpose: this invariant is about what a reader sees.
 */

const ROOTS = ["components", "app"];
const REPO_ROOT = path.resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function tsxFiles(): string[] {
  return ROOTS.flatMap((r) => walk(path.join(REPO_ROOT, r))).sort();
}

/** Strips comments before scanning — this invariant is about what a reader
 * sees, not what a future maintainer is told. Only unambiguous comment forms
 * are removed (block comments, and lines that are ONLY a comment) so a
 * string containing "//" (a URL) on an otherwise code-bearing line survives
 * intact. */
function stripComments(src: string): string {
  const noBlocks = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlocks
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? "" : line))
    .join("\n");
}

/** Import statements are not customer-facing copy — but their `}` and `>`
 * characters (`import { a, b } from "@/lib/real-data";`) are exactly the
 * kind of boundary the JSX-text scan below looks for, and a module path
 * like "@/lib/real-data" contains the word "real". Drop them before scanning
 * text, the same way stripComments drops comments. */
function stripImports(src: string): string {
  return src.replace(/^import\b[\s\S]*?;\s*$/gm, "");
}

/** Prop names / object-literal keys whose string value is rendered to the
 * reader somewhere in this codebase. Not exhaustive of every prop that could
 * ever carry copy — exhaustive of the ones actually used that way here. */
const VISIBLE_TEXT_KEYS = [
  "title",
  "subtitle",
  "description",
  "label",
  "placeholder",
  "blurb",
  "body",
  "hint",
  "desc",
  "summary",
];

function extractCandidates(src: string): string[] {
  const out: string[] = [];

  // key="..."  or  key: "..."   (JSX prop or object-literal field)
  const dq = new RegExp(`\\b(?:${VISIBLE_TEXT_KEYS.join("|")})\\s*[:=]\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g");
  let m: RegExpExecArray | null;
  while ((m = dq.exec(src))) out.push(m[1]);

  // key={`...`}  or  key: `...`
  const tpl = new RegExp(`\\b(?:${VISIBLE_TEXT_KEYS.join("|")})\\s*[:=]\\s*\`([^\`]*)\``, "g");
  while ((m = tpl.exec(src))) out.push(m[1]);

  // Bare JSX text nodes: text sitting between a tag boundary (`>`) or an
  // expression container's close (`}`) and the next structural character.
  // Anchoring only the LEFT side (not requiring an immediate `<` on the
  // right) matters: real prose routinely runs into a `{expr}` — e.g.
  // `exactly the{" "}{rows.length} rows shown` — and a two-sided anchor
  // would silently skip the whole sentence instead of splitting on it.
  const jsxText = /[>}]([^<>{}]+)/g;
  while ((m = jsxText.exec(src))) {
    const t = m[1].trim();
    if (t) out.push(t);
  }

  return out;
}

/** The claim vocabulary from docs/INVARIANTS.md I-007, as whole words. */
const CLAIM_WORDS =
  /\b(guarantee|guaranteed|guarantees|verified|authentic|immutable|certified|attested|trusted|compliant|real|actually)\b/i;

function relative(file: string): string {
  return path.relative(REPO_ROOT, file).split(path.sep).join("/");
}

function isAllowed(file: string, candidate: string): boolean {
  return CLAIMS_ALLOWLIST.some((e) => {
    if (e.file !== file) return false;
    const a = e.phrase.trim();
    const b = candidate.trim();
    return a === b || a.includes(b) || b.includes(a);
  });
}

describe("I-007 — claims in UI copy are backed by evidence in the same view", () => {
  const files = tsxFiles();

  it("scanned at least the known claim-bearing views (sanity check)", () => {
    const rels = files.map(relative);
    expect(rels).toEqual(
      expect.arrayContaining([
        "components/app/agents-view.tsx",
        "components/app/endpoints-view.tsx",
        "components/dashboard-preview.tsx",
      ])
    );
  });

  for (const file of files) {
    const rel = relative(file);
    it(`${rel} — every claim-vocabulary hit is allowlisted with evidence`, () => {
      const src = stripImports(stripComments(readFileSync(file, "utf8")));
      const candidates = extractCandidates(src);
      const offenders = candidates.filter((c) => CLAIM_WORDS.test(c) && !isAllowed(rel, c));

      if (offenders.length > 0) {
        // The failure message names the exact phrase and file — enough to go
        // straight to claims.allowlist.ts and either add evidence or fix the copy.
        expect(offenders, `Unregistered claim(s) in ${rel}:\n${offenders.map((o) => `  - "${o}"`).join("\n")}`).toEqual([]);
      }
    });
  }

  it("every allowlist entry still points at a real file with the phrase actually in it", () => {
    for (const entry of CLAIMS_ALLOWLIST) {
      const full = path.join(REPO_ROOT, entry.file);
      const src = readFileSync(full, "utf8");
      expect(src.includes(entry.phrase), `"${entry.phrase}" not found verbatim in ${entry.file}`).toBe(true);
      expect(entry.evidence.length, `${entry.file} — "${entry.phrase}" has no evidence recorded`).toBeGreaterThan(0);
    }
  });
});
