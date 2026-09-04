"use client";

import { AnimatePresence, motion } from "motion/react";
import { age, usdMicro } from "@/lib/mission/format";
import { useEconomy, useEconomySnapshot } from "@/lib/mission/use-economy";
import { usePrefersReducedMotion } from "@/lib/mission/use-animation-frame";
import type { Settlement } from "@/lib/mission/types";
import { Glass, Label } from "./bits";

const VISIBLE = 12;

/**
 * The right panel: what just happened, newest first.
 *
 * Rows animate their own height open, which is what pushes the list down
 * smoothly instead of making everything below jump by one row. The earning
 * agent is on the first line because it is the subject of the sentence — this
 * is a record of who got paid, not of who spent.
 */
export function SettlementFeed({ flat = false }: { flat?: boolean }) {
  const economy = useEconomy();
  const s = useEconomySnapshot();
  const rows = s.recent.slice(0, VISIBLE);
  // Read once here, at the panel that mounts for the life of the page — not
  // inside Row, which remounts fresh for every incoming settlement. The hook
  // starts false and only settles to the real value after an effect commits;
  // reading it per-row would let each newly arrived settlement's first render
  // slip through with a false reading and animate anyway.
  const reduced = usePrefersReducedMotion();

  const body = (
    <>
      {/* The top rail already carries one live indicator. A second one here was
          just a second thing blinking at you. */}
      <div className="px-5 pt-5 pb-3">
        <Label>Settlements</Label>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 sm:px-3 sm:pb-3">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <Row key={r.id} settlement={r} now={economy.now()} agents={economy.agents} reduced={reduced} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );

  // Flat: nested inside a surface (the phone bottom sheet) that already
  // supplies the glass, border and blur — see MissionSummary's `flat`.
  if (flat) {
    return <div className="flex h-full w-full flex-col overflow-hidden">{body}</div>;
  }

  return <Glass className="flex h-full w-full flex-col overflow-hidden">{body}</Glass>;
}

function Row({
  settlement,
  now,
  agents,
  reduced,
}: {
  settlement: Settlement;
  now: number;
  agents: { handle: string }[];
  reduced: boolean;
}) {
  const refunded = settlement.state === "refunded";
  // Reduced motion: the row is present, not animated in (DESIGN_SYSTEM.md
  // §1.7 — settlement arrival's reduced-motion row reads "row is present, no
  // glow"). MotionConfig's reducedMotion="user" only neutralises "unsafe"
  // transform values (x/y/scale/rotate); it does not touch height/opacity,
  // so a zero-duration transition is what actually stops this row's own
  // enter/exit animation from registering under reduced motion.
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 44, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden"
    >
      {/* The flash. Fires once, on the frame the row is born. Gated on the
          hook (not just the CSS guard below) so it never mounts at all under
          reduced motion — belt and braces. */}
      {!refunded && !reduced && (
        <span className="pointer-events-none absolute inset-0 animate-[missionFlash_1s_ease-out_forwards] rounded-[7px] bg-mint" />
      )}

      <div className="relative flex h-[44px] items-center gap-2.5 rounded-[7px] px-2">
        <span
          className={`h-[5px] w-[5px] shrink-0 rounded-full ${
            refunded ? "bg-haze/60" : "bg-gold shadow-[0_0_8px_rgba(232,182,90,0.85)]"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="font-plex truncate text-[11.5px] leading-[15px] text-frost/95">
            {agents[settlement.to]?.handle}
          </div>
          <div className="font-plex truncate text-[10px] leading-[14px] text-haze">
            <span className="text-haze/70">from </span>
            {agents[settlement.from]?.handle}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`font-plex tnum text-[11.5px] leading-[15px] ${
              refunded ? "text-haze/80" : "text-gold"
            }`}
          >
            {refunded ? "refunded" : usdMicro(settlement.amount)}
          </div>
          <div className="font-plex tnum text-[10px] leading-[14px] text-haze/70">
            {age(now - settlement.at)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
