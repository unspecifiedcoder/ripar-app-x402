/**
 * I-007 — claims in UI copy are backed by evidence in the same view
 * (docs/INVARIANTS.md).
 *
 * Every entry the claims-vocabulary scanner (tests/invariants/claims.test.ts)
 * finds in customer-facing copy must be registered here, with the exact
 * phrase and the evidence that backs it. An entry with no real evidence is
 * not something to invent evidence for — see the "KNOWN ISSUE, UNRESOLVED"
 * entry below.
 *
 * Re-derived for this branch (design/ledger-dark, cut from origin/main) by
 * scanning components/**\/*.tsx and app/**\/*.tsx with the same scanner used
 * by claims.test.ts. Some phrases below are messy, multi-line captures —
 * that is the scanner's crude regex splitting mid-sentence around a `>`/`}`
 * boundary or a template-literal ternary, not a transcription choice. Each
 * one is still an exact, verbatim substring of its file (the allowlist test
 * itself checks that), so the phrase is left as extracted rather than
 * "cleaned up" into something that would no longer match.
 */

export type ClaimEntry = {
  file: string;
  /** The exact phrase as it appears in the source (for a human auditing
   * this list against the file — the test itself matches on vocabulary,
   * not this exact string). */
  phrase: string;
  evidence: string;
};

export const CLAIMS_ALLOWLIST: ClaimEntry[] = [
  {
    file: "components/app/agents-view.tsx",
    phrase: "Every address here has actually been paid over x402 on Algorand ${net}",
    evidence:
      "The table is rendered from lib/real-data.ts's useWorkspace(), which reads " +
      "settlements straight off whichever Algorand network the deployed agent's " +
      "manifest declares (fetchSettlements, filtered by tx-type/asset-id/note " +
      "prefix) — no fallback to generated rows. There is no registry to fake: an " +
      "address only appears here because a settlement naming it was found on-chain.",
  },
  {
    file: "components/app/agents-view.tsx",
    phrase:
      "”.`\n              : scope === \"mine\"\n                ? \"Your endpoint is live and quoting. This fills in the moment a real payment lands — it will not show anything before then.\"\n                : \"This is a young protocol and quiet stretches are normal. No rows are invented to fill the gap.\"",
    evidence:
      "Same lib/real-data.ts / useWorkspace() read as above — this empty-state " +
      "text is describing the one and only way this table's rows are populated: " +
      "a chain-observed settlement, not a generated placeholder.",
  },
  {
    file: "components/app/endpoints-view.tsx",
    phrase:
      "'s published manifest. An unpaid call to any of these returns a real 402 carrying a USDC quote.`\n            : \"Read live from your deployed agent's published manifest.\"",
    evidence:
      "The endpoint list is read live from the deployed agent's own manifest " +
      "(useWorkspace / AGENT_ORIGIN in lib/real-data.ts) — these are real, " +
      "publicly reachable routes. The curl command in the same view lets the " +
      "reader issue the unpaid call themselves and see the 402 first-hand.",
  },
  {
    file: "components/app/endpoints-view.tsx",
    phrase:
      ". Deploy an agent with the Ripar SDK and this fills in from its own manifest — nothing is listed here that is not actually serving.`",
    evidence:
      "The empty-state copy for when no manifest can be read — the list is " +
      "populated exclusively from data.manifest (a live fetch through AGENT_ORIGIN), " +
      "so there is no path that puts an unserved route on the page.",
  },
  {
    file: "components/app/endpoints-view.tsx",
    phrase:
      "Nothing has been paid yet, and it stays at zero until somebody actually pays — try it\n                yourself with",
    evidence:
      "data.mine.calls comes from the same real-settlement read as the Agents " +
      "view (lib/real-data.ts) — this count only increments from a chain-observed " +
      "settlement to this agent's payout address, never from a timer or a seed.",
  },
  {
    file: "components/app/endpoints-view.tsx",
    phrase: "Unpaid, that returns a real",
    evidence:
      "Immediately followed, in the same view, by a curl command against the " +
      "live AGENT_ORIGIN URL — the reader can run it and see the 402 themselves. " +
      "The endpoint is public and its manifest is read live (lib/real-data.ts).",
  },
  {
    file: "components/app/overview-view.tsx",
    phrase:
      "This is a young protocol and quiet stretches are normal. Rows appear here when payments actually happen — none are invented to fill the gap.",
    evidence:
      "Same lib/real-data.ts / useWorkspace() read as Agents and Endpoints — " +
      "this table has no generated-data fallback, so an empty window is empty " +
      "because the chain read found nothing, not because rows were omitted.",
  },
  {
    file: "components/app/receipts-view.tsx",
    phrase:
      "”.`\n              : scope === \"mine\"\n                ? \"Your endpoint is live and quoting, but no payment has landed. A row appears here the moment a real one does — there is no sample to look at in the meantime.\"\n                : \"No x402 settlement has been seen on the recent rounds we can read. Quiet stretches are normal on a young protocol, and no rows are invented to fill the gap.\"",
    evidence:
      "On this branch receipts-view.tsx reads RealRun rows from lib/real-data.ts's " +
      "useWorkspace() (see its imports) — the same chain-observed settlement feed " +
      "as Agents/Endpoints/Overview, not a generated sample. No row in this table " +
      "can appear without a matching on-chain settlement.",
  },
  {
    file: "components/app/board-view.tsx",
    phrase:
      "Every job in the ERC-8004 Validation Registry on Algorand TestNet, with what is actually escrowed against it and which call the contract will accept next.",
    evidence:
      "useBoard() (lib/registry-client.ts) reads job (jb_) and escrow (es_) boxes " +
      "straight from the ERC-8004 Validation Registry app on Algorand TestNet via " +
      "lib/registry-chain.ts — no seeded or generated jobs; the empty/error states " +
      "on this same view say outright that nothing is cached when the read fails.",
  },
  {
    file: "components/app/board-view.tsx",
    phrase: "Actually escrowed",
    evidence:
      "The Tile's value (unitsFmt(data.totals.escrowedMicro)) is summed from the " +
      "same live es_ box reads as the subtitle above — a number the contract " +
      "itself holds, not a UI estimate.",
  },
  {
    file: "components/app/directory-view.tsx",
    phrase:
      "is registration: an id, a domain and\n          the address that signed for it, self-attested into the Identity Registry. Being listed proves someone\n          registered, not that anyone paid them.",
    evidence:
      "useDirectory() (lib/registry-client.ts) decodes ag_ boxes read live off the " +
      "ERC-8004 Identity Registry on Algorand TestNet (lib/registry-chain.ts) — " +
      "the sentence's own point is that self-attestation is weak evidence (proves " +
      "registration, not payment), which is exactly the honest boundary I-007 asks " +
      "for, not an overclaim.",
  },
  {
    file: "components/app/register-view.tsx",
    phrase:
      "Recorded, not verified. The registry stores the string; it does not fetch anything from it,\n                  and nothing here publishes an agent card for you.",
    evidence:
      "Not a claim of verification — the opposite: it explicitly disclaims that " +
      "the domain field is checked or resolved. The sentence itself is the " +
      "evidence: it says exactly what does and does not happen to the string the " +
      "reader types, in the same view as the input.",
  },
  {
    file: "components/app/settings-view.tsx",
    phrase: "Moves real USDC",
    evidence:
      "Describes the consequence of choosing \"Live\" over \"Test\" for a new API " +
      "key: Live keys govern endpoints settling on Algorand MainNet, the same " +
      "network lib/real-data.ts reads settlements from and whose USDC asset id " +
      "is enforced elsewhere in the settlement filter. \"Test\" is the paired " +
      "TestNet-only option in the same control, so the distinction is real and " +
      "load-bearing, not decorative.",
  },
  {
    file: "components/app/settings-view.tsx",
    phrase:
      "characters of base32 (A–Z, 2–7). The last four encode a SHA-512/256 checksum\n            over the public key, and it is verified here in the browser — a transposed character is caught\n            before it is ever saved.",
    evidence:
      "The SHA-512/256 checksum over the address's public key is computed " +
      "client-side in this same component (lib/algorand-address.ts's checkAddress), " +
      "and its pass/fail result is the very next element on screen — the " +
      "verification and its visible result are in the same view.",
  },
  {
    file: "components/app/settings-view.tsx",
    phrase: "Valid address · checksum verified",
    evidence:
      "Same in-browser checksum computation as above — this string only renders " +
      "when the computation just ran and passed.",
  },
  {
    file: "components/app/workflows-view.tsx",
    phrase:
      "A workflow chains triggers, paid calls and onchain actions. Press Run and every paid call in the chain is issued for real, against the deployed agent's published manifest — the price each step reports is decoded from the 402 that endpoint just returned, not from the template. Nothing is scheduled: there is no trigger service behind it yet, so no workflow fires on its own. And no USDC moves — the calls carry no payment, which is exactly why the answer is 402.",
    evidence:
      "lib/workflow-run.ts's runWorkflow() issues a real fetch(ep.url, …) against " +
      "each step's live endpoint and reads the price from the actual 402 response " +
      "(quoteFromChallenge) rather than the template's stored price — the same " +
      "sentence also discloses, correctly, that no USDC moves and nothing is " +
      "scheduled, so the claim is scoped to exactly what the code does.",
  },
  {
    file: "components/app/chat-view.tsx",
    // The scanner's extracted candidate for this hit is a messy multi-line
    // splice (it spans a stripped JSDoc comment between the import block and
    // this const), so the phrase registered here is deliberately just the
    // load-bearing substring — "How much has actually settled?" — which is
    // both a literal substring of that candidate (satisfying the allowlist
    // match) and verbatim in the raw file (satisfying the allowlist's own
    // self-check below).
    phrase: "How much has actually settled?",
    evidence:
      "A suggestion chip that asks the router about settled amounts — the router " +
      "(this same view, see the next allowlist entry) answers it from " +
      "useWorkspace()'s real settlement data (lib/real-data.ts), never a canned " +
      "or generated figure.",
  },
  {
    file: "components/app/chat-view.tsx",
    phrase:
      "This is a router over four live sources, not a language model: pricing a paid call,\n        the job board, the agent registry and settled transfers. Where a reply carries a\n        request line, that is the call that actually went out and the figures under it are\n        decoded from what came back. Ask it anything outside those four and it will say so\n        rather than answer.",
    evidence:
      "The disclosure paragraph itself names its four data sources — the live " +
      "manifest/settlement read (lib/real-data.ts), the job board " +
      "(lib/registry-client.ts), and the agent registry — and states plainly that " +
      "a shown request line is the actual network call that produced the figures " +
      "below it, which is what the routing code in this same file does.",
  },
  {
    file: "components/app/mcp-connect.tsx",
    phrase: "Attaching runs a real",
    evidence:
      "introspect() (lib/mcp-tools.ts) performs a genuine tools/list JSON-RPC " +
      "call against the URL the reader supplies — this file's own top-of-file " +
      "comment says introspection \"now performs the real tools/list JSON-RPC " +
      "call\" rather than fabricating a tool list, and a server that refuses the " +
      "origin fails visibly instead of appearing to work.",
  },
  {
    file: "components/app/mcp-connect.tsx",
    phrase:
      "call against the URL\n          you give, so the tools above are whatever that server actually reported. A server that has not\n          allowed this origin will fail here rather than appear to work. Enabled tools are stored on this\n          device only.",
    evidence:
      "Same introspect() call as above — the tool list rendered above this " +
      "sentence is exactly the server's own JSON-RPC response, and the sentence " +
      "states the failure mode (a disallowed origin fails visibly) that proves " +
      "there is no synthetic fallback.",
  },
];

/**
 * KNOWN ISSUE — UNRESOLVED. Left OUT of the allowlist above on purpose: no
 * evidence for this claim exists anywhere in this codebase, and inventing
 * some would defeat the point of I-007.
 *
 *   file: components/dashboard-preview.tsx (rendered from app/login/page.tsx)
 *   - "Let agents bid, pay on a verified result." — "verified" by what? There
 *     is no job-bidding or result-verification feature anywhere in this repo;
 *     the marketplace/job-posting concept this card advertises does not exist
 *     in the app the rest of this codebase ships. DESIGN_PLAN.md's P-10 packet
 *     deletes this file's mockup entirely and replaces it with the real
 *     settlement stream (`<Stream readOnly />`).
 *
 * claims.test.ts is written to FAIL on this until that happens — the failing
 * test is the guard that proves P-10 actually removed it, rather than a
 * design-review step that could be skipped.
 */
