"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/mission/use-animation-frame";
import { ago, indexerHost, useWorkspace, type RealRun } from "@/lib/real-data";
import { txUrl } from "@/lib/explorer";
import { shortAddr, usd } from "@/lib/format";
import { EmptyState, ErrorPanel, Loading, Sheet } from "./bits";
import { Address, Table, Td, Th, Tr } from "./table";

/**
 * The live settlement stream (D-004) — the thing the Overview leads with.
 *
 * `readOnly` is for P-10's login card: no "Load 20 more" (there is nowhere
 * to grow into on a page nobody is signed into yet) and no explorer link.
 */
export function Stream({ readOnly = false, rows = 20 }: { readOnly?: boolean; rows?: number }) {
  const { data, status, error } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const reduced = usePrefersReducedMotion();

  const net = data?.chain.network ?? "testnet";
  const round = data?.chain.round ?? null;
  const blockTime = data?.chain.blockTime ?? null;
  const allRuns = data?.runs ?? [];
  const shown = allRuns.slice(0, expanded ? allRuns.length : rows);
  const canLoadMore = !readOnly && !expanded && allRuns.length > rows;

  // A sentence, not a dot-joined string (§2.6a): "Round 66,982,883, 2.7s
  // between blocks", or the round alone while there is not yet enough spread
  // to measure block time.
  const statusSentence =
    round == null
      ? null
      : blockTime == null
        ? `Round ${round.toLocaleString("en-US")}`
        : `Round ${round.toLocaleString("en-US")}, ${blockTime.toFixed(1)}s between blocks`;

  let body: ReactNode;

  if (status === "loading" && !data) {
    body = (
      <div className="px-4 pb-4 sm:px-5">
        <Loading label="reading the indexer" />
      </div>
    );
  } else if (status === "error" && allRuns.length === 0) {
    body = (
      <div className="px-4 pb-4 sm:px-5">
        <ErrorPanel what="settlements" host={indexerHost(net)} message={error ?? "unknown"} />
      </div>
    );
  } else if (allRuns.length === 0) {
    body = (
      <EmptyState
        figure="0"
        title="No settlements in the current window"
        body="This is a young protocol and quiet stretches are normal. Rows appear here when payments actually happen — none are invented to fill the gap."
      />
    );
  } else {
    body = (
      <>
        {status === "error" && (
          <div className="px-4 pt-1 pb-3 sm:px-5">
            <ErrorPanel what="settlements" host={indexerHost(net)} message={error ?? "unknown"} />
          </div>
        )}
        <Table
          rows={shown}
          list={(r) => ({
            primary: `${usd(r.amountUsdc, 3)} USDC`,
            amount: ago(r.when),
            settled: r.amountUsdc > 0,
            secondary: `${shortAddr(r.from)} to ${shortAddr(r.to)}`,
            proof: { href: txUrl(r.id, net) },
          })}
        >
          <thead>
            <Tr>
              <Th align="right">Amount</Th>
              <Th>Payer</Th>
              <Th>Paid to</Th>
              <Th align="right">Round</Th>
              <Th align="right">When</Th>
              <Th align="right">Proof</Th>
            </Tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {shown.map((r) => (
                <Row key={r.id} r={r} net={net} reduced={reduced} />
              ))}
            </AnimatePresence>
          </tbody>
        </Table>
        {canLoadMore && (
          <div className="px-4 py-3 sm:px-5">
            <Button variant="ghost" onClick={() => setExpanded(true)}>
              Load 20 more
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <Sheet>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-4 pb-3 sm:px-5">
        <h2 className="text-[15px] leading-5 font-semibold tracking-[-0.01em] text-frost">
          Live x402 settlements
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {statusSentence && <span className="font-plex text-[11px] text-haze">{statusSentence}</span>}
          {!readOnly && (
            <a
              href="https://explorer.ripar.io/live"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center justify-center rounded-[6px] border border-white/[0.10] px-2.5 text-[12.5px] font-medium text-mist transition-colors duration-150 hover:text-frost"
            >
              Open the explorer
            </a>
          )}
        </div>
      </div>
      {body}
    </Sheet>
  );
}

function Row({ r, net, reduced }: { r: RealRun; net: "mainnet" | "testnet"; reduced: boolean }) {
  // Reduced motion drops the glow entirely (§1.7) — `glowDone` only ever
  // matters on the non-reduced path, and re-derived from `reduced` on every
  // render rather than baked into `useState`'s initial value, so a hook that
  // starts `false` and settles a beat later cannot let one frame of glow slip
  // through under reduced motion.
  const [glowDone, setGlowDone] = useState(false);
  const showGlow = r.arrived && !reduced && !glowDone;
  const cells = (
    <>
      <Td kind={r.amountUsdc > 0 ? "settled" : "amount"}>{`${usd(r.amountUsdc, 3)} USDC`}</Td>
      <Td>
        <Address value={r.from} />
      </Td>
      <Td>
        <Address value={r.to} />
      </Td>
      <Td kind="mono" align="right">
        {r.round.toLocaleString("en-US")}
      </Td>
      <Td kind="mist" align="right">
        {ago(r.when)}
      </Td>
      <Td kind="proof" href={txUrl(r.id, net)} />
    </>
  );

  // D-005/D-014/§1.7 — the bloom is the product's one orchestrated moment,
  // and it fires only when the data layer says this row is new. A row that
  // is not `arrived` gets no motion props at all.
  if (!r.arrived) {
    return <Tr className="relative">{cells}</Tr>;
  }

  return (
    <motion.tr
      className="relative border-b border-white/[0.06] transition-colors duration-[120ms] last:border-0 hover:bg-white/[0.04]"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.2 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {showGlow && (
        <motion.td
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[-1] bg-[radial-gradient(60%_120%_at_20%_50%,rgba(232,182,90,0.18),transparent)]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => setGlowDone(true)}
        />
      )}
      {cells}
    </motion.tr>
  );
}
