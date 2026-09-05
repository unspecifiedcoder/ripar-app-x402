"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Glass } from "@/components/mission/bits";
import { STATUS_TONE, type AgentStatus, type Status } from "@/lib/app-data";
import type { JobStatusName } from "@/lib/registry-chain";

/** Status never rides on colour alone — the dot is paired with its label. */
export function StatusPill({
  status,
  className,
}: {
  status: Status | AgentStatus | JobStatusName;
  className?: string;
}) {
  const t = STATUS_TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12.5px]", t.text, className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} />
      {t.label}
    </span>
  );
}

/** §2.8 — a real chain, no real money. Text, not aria-hidden: it must be announced. */
export function Testnet({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-white/[0.10] bg-white/[0.06] px-2 py-[3px] text-[11px] leading-[14px] font-medium text-mist",
        className
      )}
    >
      TestNet
    </span>
  );
}

/** §2.8 — an endpoint serving now. Mint dot + word, no fill, no border. */
export function Live() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-mint">
      <span className="h-1.5 w-1.5 rounded-full bg-mint" />
      Live
    </span>
  );
}

/** §2.8 — generated in this browser, touched no chain. The loudest badge, on purpose. */
export function Simulated({ className }: { className?: string }) {
  return (
    <span
      title="Generated in this browser. Nothing here touched a chain."
      className={cn(
        "rounded-full border border-gold/25 bg-gold/[0.07] px-2 py-[3px] text-[11px] leading-[14px] font-medium text-gold/85",
        className
      )}
    >
      Simulated
    </span>
  );
}

export function PageHead({
  title,
  subtitle,
  actions,
  simulated,
  network,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  simulated?: boolean;
  network?: "mainnet" | "testnet";
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        <div className="flex items-center gap-[10px]">
          <h1 className="text-[20px] leading-[26px] font-semibold tracking-[-0.02em] text-frost">{title}</h1>
          {network === "testnet" && <Testnet />}
          {simulated && <Simulated />}
        </div>
        {subtitle && <p className="mt-1 max-w-[68ch] text-[13.5px] leading-5 text-mist">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  evidence,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** An address, a tx id — anything a reader might copy or compare. */
  evidence?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-haze" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-[6px] border border-white/[0.08] bg-black/30 py-1.5 pl-8 pr-8 text-[13.5px] text-frost outline-none transition-colors placeholder:text-haze focus:border-mint/50",
          evidence && "font-plex tnum"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-haze transition-colors hover:text-frost"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.06] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full px-2.5 py-1 text-[12.5px] transition-colors",
            value === o.value ? "bg-white/[0.09] text-frost" : "text-mist hover:text-frost"
          )}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 font-plex tnum text-haze">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** A figure with its unit and label — the instrument panel (§2.6). Kept small — the app is not a billboard. */
export function Metric({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  /** "settled" sets the figure gold — MainNet money that actually moved (D-002). */
  tone?: "settled";
}) {
  return (
    <div>
      <div className="text-[11px] leading-[14px] font-medium text-haze">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={cn(
            "font-plex tnum text-[22px] leading-[26px] tracking-[-0.01em]",
            tone === "settled" ? "text-gold" : "text-frost"
          )}
        >
          {value}
        </span>
        {unit && <span className="text-[12.5px] text-mist">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] leading-4 text-mist">{hint}</div>}
    </div>
  );
}

/** §2.14 / D-009 — zero is a result, not an absence. The figure that would
 *  have been there comes first, reading zero, then the sentence saying why. */
export function EmptyState({
  title,
  body,
  action,
  figure,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  figure?: string;
}) {
  return (
    <Sheet>
      <div className="px-6 py-14 text-center">
        {figure && <div className="font-plex tnum text-[22px] text-frost">{figure}</div>}
        <p className={cn("text-[13.5px] font-medium text-frost", figure && "mt-2")}>{title}</p>
        <p className="mx-auto mt-1.5 max-w-[52ch] text-[13px] text-mist">{body}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </Sheet>
  );
}

/** Column header that sorts. Direction is announced, not just drawn. */
export function SortHeader<K extends string>({
  label,
  field,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  field: K;
  sort: { field: K; dir: "asc" | "desc" };
  onSort: (f: K) => void;
  align?: "left" | "right";
}) {
  const active = sort.field === field;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-2", align === "right" ? "text-right" : "text-left")}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] leading-[14px] font-medium transition-colors hover:text-frost",
          active ? "text-frost" : "text-haze"
        )}
      >
        {label}
        <span aria-hidden className={cn("text-[9px]", active ? "text-frost opacity-100" : "text-haze opacity-0")}>
          {sort.dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

/** The glass surface (§1.2). Kept as `Sheet` so call sites do not change. */
export function Sheet({ children }: { children: ReactNode }) {
  return <Glass className="overflow-hidden rounded-[10px]">{children}</Glass>;
}

/** Copies `text` and says so. A blocked clipboard is reported rather than
 *  swallowed, because the user is otherwise left believing they have the value. */
export function CopyButton({
  text,
  label = "Copy",
  what,
  className,
}: {
  text: string;
  label?: string;
  /** Named in the screen-reader label, e.g. "Copy fly.toml". */
  what?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Insecure origin or a denied permission — the text is on screen to select.
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={what ? `${label} ${what}` : label}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[6px] border border-white/[0.10] px-2.5 text-[12.5px] transition-colors",
        state === "failed" ? "text-[#f28b82]" : state === "copied" ? "text-mint" : "text-mist hover:bg-white/[0.04] hover:text-frost",
        className
      )}
    >
      {state === "copied" ? <Check size={12} /> : <Copy size={12} />}
      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Select it instead" : label}
      </span>
    </button>
  );
}

/** A named block of code or config with its own copy button. */
export function CodeBlock({
  title,
  filename,
  body,
  note,
  maxHeight = "none",
}: {
  title: string;
  filename?: string;
  body: string;
  note?: ReactNode;
  maxHeight?: string;
}) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-black/30">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <h4 className="text-[11px] text-haze">{title}</h4>
        {filename && <span className="font-plex text-[11px] text-mist">{filename}</span>}
        <CopyButton text={body} what={filename ?? title} className="ml-auto" />
      </div>
      <pre
        style={{ maxHeight }}
        className="overflow-auto px-3 pb-3 font-plex text-[12px] leading-[18px] text-frost/90"
      >
        {body}
      </pre>
      {note && <p className="px-3 pb-3 text-[11.5px] text-mist">{note}</p>}
    </div>
  );
}

/** §2.15 — a chain read that failed. It says what could not be read and from
 *  where, verbatim, and offers a retry. It never apologises (§2.6a). */
export function ErrorPanel({
  what,
  host,
  message,
  onRetry,
}: {
  what: string;
  host: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Sheet>
      <div className="border-l-[3px] border-l-[#f28b82] px-4 py-4">
        <p className="text-[13.5px] text-frost">
          Could not read {what} from {host}.
        </p>
        <p className="mt-1 font-plex text-[12px] text-mist">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 h-8 rounded-[6px] bg-white/[0.08] px-3 text-[13px] font-medium text-frost transition-colors hover:bg-white/[0.12]"
          >
            Retry
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** §2.13 — a panel that is loading shows its label and this line, nothing else. */
export function Loading({ label }: { label: string }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="ripar-sweep h-full w-1/3 bg-mint/60" />
      </div>
      <p className="pt-4 text-[12.5px] text-mist">{label}</p>
    </div>
  );
}
