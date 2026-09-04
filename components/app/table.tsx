"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shortAddr } from "@/lib/format";

/** §2.7 — the workhorse. Column rules for `Td`. */
export type Kind = "text" | "mist" | "mono" | "amount" | "settled" | "proof";

/** Below 640px the table becomes a list — CSS (`hidden sm:block` /
 *  `sm:hidden`), not a JS media query, so SSR and the client render the same
 *  markup and hydration has nothing to correct. */
export function Table<T>({
  children,
  list,
  rows,
  minWidth,
}: {
  children: ReactNode;
  /** Shapes one row for the phone list. Only used when `rows` is also given. */
  list?: (row: T) => {
    primary: ReactNode;
    amount?: ReactNode;
    settled?: boolean;
    secondary?: ReactNode;
    proof?: { href: string };
  };
  rows?: T[];
  minWidth?: number;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-[12.5px] leading-[18px]" style={minWidth ? { minWidth } : undefined}>
          {children}
        </table>
      </div>
      {list && rows && (
        <ul className="sm:hidden">
          {rows.map((row, i) => {
            const r = list(row);
            return (
              <li
                key={i}
                className="flex min-h-[44px] flex-col justify-center gap-0.5 border-b border-white/[0.06] px-3 py-2 last:border-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-frost">{r.primary}</span>
                  {r.amount != null && (
                    <span className={cn("shrink-0 font-plex tnum", r.settled ? "text-gold" : "text-frost")}>
                      {r.amount}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-plex text-[11.5px] text-mist">{r.secondary}</span>
                  {r.proof && (
                    <a
                      href={r.proof.href}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-[12px] text-mist underline-offset-2 hover:text-frost hover:underline"
                    >
                      verify ↗
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function Th({
  children,
  align = "left",
  scope = "col",
}: {
  children: ReactNode;
  align?: "left" | "right";
  scope?: "col" | "row";
}) {
  return (
    <th
      scope={scope}
      className={cn(
        "px-3 py-2 text-[11px] leading-[14px] font-medium text-haze",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn("border-b border-white/[0.06] transition-colors duration-[120ms] last:border-0 hover:bg-white/[0.04]", className)}>
      {children}
    </tr>
  );
}

export function Td({
  kind = "text",
  children,
  align,
  title,
  href,
}: {
  kind?: Kind;
  children?: ReactNode;
  align?: "left" | "right";
  title?: string;
  /** Used by `kind="proof"` when `children` is not given. */
  href?: string;
}) {
  const alignClass = align === "right" || kind === "amount" || kind === "settled" || kind === "proof" ? "text-right" : "text-left";

  if (kind === "proof") {
    return (
      <td title={title} className={cn("px-3 py-[9px]", alignClass)}>
        {children ?? (
          href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-mist underline-offset-2 hover:text-frost hover:underline"
            >
              verify ↗
            </a>
          )
        )}
      </td>
    );
  }

  const toneClass =
    kind === "mist"
      ? "text-mist"
      : kind === "mono"
        ? "font-plex tnum text-mist"
        : kind === "amount"
          ? "font-plex tnum text-frost"
          : kind === "settled"
            ? "font-plex tnum text-gold"
            : "text-frost";

  return (
    <td title={title} className={cn("px-3 py-[9px]", toneClass, alignClass)}>
      {children}
    </td>
  );
}

/** §2.7 — `shortAddr` (6…4), `mono`, `mist`, full address in `title=`.
 *  Clicking copies; the value flashes `mint` for 600ms (§1.7 success). */
export function Address({
  value,
  head = 6,
  tail = 4,
  className,
}: {
  value: string;
  head?: number;
  tail?: number;
  /** Reserved for a future per-network explorer link; unused today. */
  net?: "mainnet" | "testnet";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 600);
    } catch {
      // Insecure origin or a denied permission — the full address is in `title`.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={value}
      aria-label={`Copy address ${value}`}
      className={cn("font-plex transition-colors", copied ? "text-mint" : "text-mist hover:text-frost", className)}
    >
      {shortAddr(value, head, tail)}
    </button>
  );
}
