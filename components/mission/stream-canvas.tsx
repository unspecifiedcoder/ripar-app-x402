"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StreamRenderer, type Ceremony } from "@/lib/mission/renderer";
import { useAnimationFrame, usePrefersReducedMotion } from "@/lib/mission/use-animation-frame";
import { CLUSTERS } from "@/lib/mission/economy";
import { useEconomy } from "@/lib/mission/use-economy";
import { usdMicro } from "@/lib/mission/format";
import type { Agent, Settlement } from "@/lib/mission/types";
import { Dna, Glass, Label } from "./bits";

/**
 * The stream itself.
 *
 * This component owns the only animation loop on the page. It steps the economy,
 * hands the new settlements to the renderer, and re-renders React exactly twice
 * per hover change and once per ceremony — never per frame.
 */
export function StreamCanvas({ onCeremony }: { onCeremony?: (c: Ceremony | null) => void }) {
  const economy = useEconomy();
  const renderer = useMemo(() => new StreamRenderer(economy.agents), [economy]);
  const reduced = usePrefersReducedMotion();

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const rect = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const buffer = useRef<Settlement[]>([]);
  const hoverId = useRef(-1);
  const applied = useRef({ w: -1, h: -1, dpr: -1 });

  const [hover, setHover] = useState<{ agent: Agent; x: number; y: number; flip: boolean } | null>(
    null
  );

  useEffect(() => {
    renderer.onCeremony = onCeremony ?? null;
    return () => {
      renderer.onCeremony = null;
    };
  }, [renderer, onCeremony]);

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    if (!el || !cv) return;

    // A scroll moves the canvas on the page; it does not change the drawing
    // surface. Keeping the two apart matters on iOS, where rubber-band scroll
    // fires continuously.
    const syncRect = () => {
      const r = el.getBoundingClientRect();
      rect.current = { ...rect.current, left: r.left, top: r.top };
    };

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      // Past 2× the extra pixels cost real frames and buy nothing visible.
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      // Reassigning cv.width reallocates the backing store — tens of megabytes
      // at DPR 2 — and renderer.resize rebuilds the whole sky. Neither is worth
      // doing to arrive at the size we already have.
      const a = applied.current;
      if (w === a.w && h === a.h && dpr === a.dpr) {
        rect.current = { left: r.left, top: r.top, width: w, height: h };
        return;
      }

      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;

      // Opaque context: the field repaints every pixel every frame, so there is
      // nothing to composite against and the compositor can skip a whole step.
      const c = cv.getContext("2d", { alpha: false });
      if (!c) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.current = c;

      // Canvas needs a real family name; next/font ships a hashed one, so read
      // it back off the element the class is already on.
      renderer.fontFamily = getComputedStyle(cv).fontFamily || renderer.fontFamily;
      renderer.resize(w, h);
      rect.current = { left: r.left, top: r.top, width: w, height: h };
      applied.current = { w, h, dpr };
    };

    measure();

    // Dragging a window edge fires the observer far faster than we can rebuild
    // a sky, so a run of them costs one rebuild rather than dozens.
    let pending = 0;
    const ro = new ResizeObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        measure();
      });
    });
    ro.observe(el);
    window.addEventListener("scroll", syncRect, { passive: true });
    return () => {
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
      window.removeEventListener("scroll", syncRect);
    };
  }, [renderer]);

  useEffect(() => {
    renderer.reducedMotion = reduced;
  }, [renderer, reduced]);

  useAnimationFrame((dt, now) => {
    const c = ctx.current;
    if (!c) return;

    const buf = buffer.current;
    buf.length = 0;
    economy.tick(dt, buf);
    renderer.frame(c, dt, now, buf);

    const a = renderer.hovered();
    const id = a ? a.id : -1;
    if (id !== hoverId.current) {
      hoverId.current = id;
      const p = renderer.hoveredPoint();
      // Which side the card opens on is decided here, with the hover, rather
      // than during render: a resize between the two leaves it pinned to a side
      // that no longer has room for it.
      setHover(
        a && p ? { agent: a, x: p.x, y: p.y, flip: p.x > rect.current.width - 250 } : null
      );
    }
  });

  const move = (e: React.PointerEvent) => {
    renderer.setPointer(e.clientX - rect.current.left, e.clientY - rect.current.top);
  };

  return (
    <div ref={wrap} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvas}
        onPointerMove={move}
        onPointerLeave={() => renderer.clearPointer()}
        className="font-plex block h-full w-full"
        role="img"
        aria-label="Live map of settlements between agents. Each point of light is one payment travelling from the agent that paid to the agent that earned."
      />

      {hover && (
        <div
          className="pointer-events-none absolute z-20 hidden md:block"
          style={{
            left: hover.x,
            top: hover.y,
            transform: `translate(${hover.flip ? "calc(-100% - 22px)" : "22px"}, -50%)`,
          }}
        >
          <Glass className="w-[236px] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-plex truncate text-[12.5px] text-frost">{hover.agent.handle}</div>
                <div className="mt-0.5 truncate text-[11px] text-haze">{hover.agent.service}</div>
              </div>
              <Dna agent={hover.agent} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-2.5">
              <Field label="Price" value={usdMicro(hover.agent.price)} />
              <Field label="Calls" value={hover.agent.calls.toLocaleString("en-US")} />
              <Field label="Earned" value={usdMicro(hover.agent.earned)} />
            </div>
            {/* Where the ceremonies go to live afterwards. A moment you were not
                watching for still leaves a record, and this is where you find
                it — otherwise Graduation is a ring you cannot ask about. */}
            <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
              <Label className="text-[8.5px]">Reach</Label>
              <span
                className={`font-plex tnum text-[10.5px] ${
                  hover.agent.graduatedAt !== null ? "text-gold/90" : "text-frost/70"
                }`}
              >
                {standing(hover.agent)}
              </span>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}

/** An agent's ceremony record, in the fewest words that still say it. */
function standing(a: Agent): string {
  if (a.graduatedAt !== null) return "every cluster";
  if (a.firstLightAt === null) return "never earned";
  return `${a.patrons.size} / ${CLUSTERS} clusters`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-[8.5px]">{label}</Label>
      <div className="font-plex tnum mt-1 text-[11.5px] text-frost/90">{value}</div>
    </div>
  );
}
