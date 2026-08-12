"use client";

import { AnimatePresence, motion } from "motion/react";
import { duration } from "@/lib/mission/format";
import type { Ceremony } from "@/lib/mission/renderer";
import type { CeremonyKind } from "@/lib/mission/types";

/**
 * The caption on a moment.
 *
 * Four things can happen to an agent that will never happen to it again, and
 * this is the only text on the screen allowed to name them. The renderer has
 * already done the work — dimmed the field, slowed the payment, lit whatever
 * the moment is about — so all that is left here is to say, quietly, what it
 * was, and then get out of the way.
 *
 * Three of the four wait for the payment to land before they say anything: the
 * silence before is the point. Long Night is the exception and speaks while the
 * payment is still crossing, because for that one the waiting *is* the moment —
 * you are meant to read "dark for twenty-six minutes" off a node that looks
 * dead, and then watch it come back.
 */
export function CeremonyOverlay({ ceremony }: { ceremony: Ceremony | null }) {
  const visible = ceremony && (ceremony.phase === "lit" || SPEAKS_EARLY.has(ceremony.kind))
    ? ceremony
    : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`${visible.kind}:${visible.handle}`}
          className="pointer-events-none absolute z-40 -translate-x-1/2"
          style={{ left: visible.x, top: visible.y + 34 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-col items-center text-center">
            {/* The rule draws itself open under the moment, once. */}
            <motion.span
              className={visible.kind === "long-night" && visible.phase === "rising"
                ? "h-px bg-haze/45"
                : "h-px bg-gold/60"}
              initial={{ width: 0 }}
              animate={{ width: 72 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <span
              className={`font-plex mt-3 text-[9.5px] uppercase tracking-[0.42em] ${
                visible.phase === "rising" ? "text-haze" : "text-gold"
              }`}
            >
              {TITLE[visible.kind]}
            </span>
            <span className="font-plex mt-2 text-[15px] tracking-[-0.01em] text-frost">
              {visible.handle}
            </span>
            <span className="mt-1.5 max-w-[280px] text-[11px] text-haze">{caption(visible)}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Moments that caption themselves before the payment has landed. */
const SPEAKS_EARLY = new Set<CeremonyKind>(["long-night"]);

const TITLE: Record<CeremonyKind, string> = {
  "first-light": "First light",
  "first-stranger": "First stranger",
  "long-night": "Long night",
  graduation: "Graduation",
};

/**
 * What each moment actually means, in one line, in words rather than metrics.
 *
 * These are deliberately not "First payment received" or "Cluster coverage
 * 7/7". Anything an agent only does once deserves to be described the way you
 * would describe it to someone, not the way a log would.
 */
function caption(c: Ceremony): string {
  switch (c.kind) {
    case "first-light":
      return `${c.service} · paid for the first time`;
    case "first-stranger":
      return c.payer
        ? `${c.payer} found it, from the other side of the network`
        : "paid by someone outside its own cluster";
    case "long-night":
      return c.phase === "rising"
        ? `dark for ${duration(c.quietMs)}`
        : `${duration(c.quietMs)} of silence · someone came back`;
    case "graduation":
      return "every cluster in the network has paid it";
  }
}
