"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ago, useWorkspace, type ChainNetwork, type RealRun } from "@/lib/real-data";
import { txUrl } from "@/lib/explorer";
import { EmptyState, Metric, PageHead, SearchInput, Segmented, Sheet, SortHeader } from "./bits";
import { Address, Table, Td, Th, Tr } from "./table";

type Scope = "mine" | "all";
type Field = "when" | "amountUsdc" | "round";

const usd = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC, written out rather than localised, so a receipt reads the same wherever
 *  it is opened and the CSV matches the table exactly. Empty when the settlement
 *  carries no round-time — the indexer always sends one, but printing 1970 if it
 *  ever does not would be worse than saying nothing. */
function utc(at: number): string {
  if (!at) return "";
  const d = new Date(at);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** No endpoint or status column, because the chain carries neither — see the
 *  note under the table. Every field here is one the settlement really states. */
function toCsv(rows: RealRun[]): string {
  const head = ["tx_id", "settled_at_utc", "round", "payer", "paid_to", "amount_usdc"];
  const body = rows.map((r) =>
    [r.id, utc(r.when), r.round, r.from, r.to, r.amountUsdc.toFixed(6)].map(cell).join(",")
  );
  // A trailing newline keeps `wc -l` and most parsers happy.
  return [head.join(","), ...body].join("\n") + "\n";
}

/** Hands the browser a real file. Returns false when the download was blocked. */
function downloadCsv(filename: string, csv: string): boolean {
  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

/**
 * A receipt here is a settlement read off Algorand: a USDC transfer that really
 * moved. Nothing is stored on our side, so the table is exactly what the chain
 * will tell anybody who looks, and each row links the transaction to prove it.
 */
export function ReceiptsView() {
  const { data, status, error } = useWorkspace();
  // "Mine" first: this page is about what the deployed agent has been paid. The
  // network-wide list is one tab away, so a quiet address is not a dead end.
  const [scope, setScope] = useState<Scope>("mine");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ field: Field; dir: "asc" | "desc" }>({ field: "when", dir: "desc" });
  const { toast } = useToast();

  // Memoised because `?? []` builds a fresh array on every render, which
  // changed the deps of every useMemo below it and defeated all of them.
  const runs = useMemo(() => data?.runs ?? [], [data?.runs]);
  const payTo = data?.manifest?.payTo;
  // The chain these rows were actually read from. The fallback is never on
  // screen — a row only exists once `data` is in hand, and so has a network.
  const net = data?.chain.network ?? "testnet";

  const counts = useMemo(
    () => ({ all: runs.length, mine: payTo ? runs.filter((r) => r.to === payTo).length : 0 }),
    [runs, payTo]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const scoped = scope === "mine" ? (payTo ? runs.filter((r) => r.to === payTo) : []) : runs;
    const found = term
      ? scoped.filter((r) => `${r.id} ${r.from} ${r.to}`.toLowerCase().includes(term))
      : scoped;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...found].sort((a, b) => (a[sort.field] - b[sort.field]) * dir);
  }, [runs, payTo, scope, q, sort]);

  const totals = useMemo(() => {
    const gross = rows.reduce((n, r) => n + r.amountUsdc, 0);
    return {
      gross,
      average: rows.length ? gross / rows.length : 0,
      payers: new Set(rows.map((r) => r.from)).size,
    };
  }, [rows]);

  const toggleSort = (field: Field) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" }));

  function exportCsv() {
    if (rows.length === 0) return;
    const name = `ripar-receipts-${scope}-${utc(Date.now()).slice(0, 10)}.csv`;
    const ok = downloadCsv(name, toCsv(rows));
    toast(
      ok ? `Exported ${rows.length} receipts to ${name}` : "The browser blocked the download",
      ok ? "success" : "error"
    );
  }

  return (
    <>
      <PageHead
        title="Receipts"
        subtitle="One row per settlement read off Algorand — a USDC transfer that really moved. Payment goes straight from the caller to your payout address, Ripar is never in the path, so these are chain records rather than an account balance."
        network={data?.chain.network}
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            title={rows.length === 0 ? "No rows in view to export" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] border border-white/[0.10] px-3 py-1.5 text-[13px] font-medium text-mist transition-colors",
              rows.length === 0 ? "cursor-not-allowed opacity-40" : "hover:bg-white/[0.04] hover:text-frost"
            )}
          >
            <Download size={14} /> Export {rows.length} rows as CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-4">
        {[
          { label: "Settled in view", value: usd(totals.gross), unit: "USDC", hint: `${rows.length} ${rows.length === 1 ? "row" : "rows"}`, settled: totals.gross > 0 },
          { label: "Average settlement", value: usd(totals.average, 3), unit: "USDC", hint: "rows in view" },
          { label: "Distinct payers", value: String(totals.payers), hint: "addresses in view" },
          {
            label: "Paid to your address",
            value: data ? usd(data.mine.earnedUsdc) : "—",
            unit: "USDC",
            hint: data ? `${data.mine.calls} settlements, all scopes` : "reading the chain…",
            settled: (data?.mine.earnedUsdc ?? 0) > 0,
          },
        ].map((m) => (
          <div key={m.label} className="bg-ink px-4 py-4">
            <Metric label={m.label} value={m.value} unit={m.unit} hint={m.hint} tone={m.settled ? "settled" : undefined} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 py-4">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: "mine", label: "Mine", count: counts.mine },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search address or tx…" className="w-full sm:w-[300px]" />
        <span className="tnum ml-auto text-[12.5px] text-mist">
          {rows.length} {rows.length === 1 ? "receipt" : "receipts"}
        </span>
      </div>

      {status === "loading" ? (
        <Sheet>
          <p className="px-4 py-12 text-center text-[13px] text-mist">reading the chain…</p>
        </Sheet>
      ) : status === "error" ? (
        <EmptyState
          title="Could not read the chain"
          body={`${error ?? "The indexer did not answer."} Nothing here is cached, so the table stays empty rather than showing something stale.`}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={q ? "No receipts match" : scope === "mine" ? "Nobody has paid your agent yet" : "No settlements in this window"}
          body={
            q
              ? `Nothing matches “${q}”.`
              : scope === "mine"
                ? "Your endpoint is live and quoting, but no payment has landed. A row appears here the moment a real one does — there is no sample to look at in the meantime."
                : "No x402 settlement has been seen on the recent rounds we can read. Quiet stretches are normal on a young protocol, and no rows are invented to fill the gap."
          }
          action={
            q ? (
              <button type="button" onClick={() => setQ("")} className="rounded-[6px] border border-white/[0.10] px-3 py-1.5 text-[13px] font-medium text-mist hover:text-frost">
                Clear search
              </button>
            ) : scope === "mine" && counts.all > 0 ? (
              <button type="button" onClick={() => setScope("all")} className="rounded-[6px] border border-white/[0.10] px-3 py-1.5 text-[13px] font-medium text-mist hover:text-frost">
                See all {counts.all} network settlements
              </button>
            ) : undefined
          }
        />
      ) : (
        <Sheet>
          <Table<RealRun>
            minWidth={900}
            rows={rows}
            list={(r) => ({
              primary: (
                <span>
                  {utc(r.when) || "—"}
                  {r.to === payTo && <span className="ml-2 rounded bg-gold/[0.12] px-1.5 py-px text-[10.5px] font-semibold text-gold">you</span>}
                </span>
              ),
              amount: usd(r.amountUsdc, 3),
              settled: r.amountUsdc > 0,
              secondary: `${r.from.slice(0, 6)}…${r.from.slice(-4)} to ${r.to.slice(0, 6)}…${r.to.slice(-4)}, round ${r.round.toLocaleString("en-US")}, ${ago(r.when)}`,
              proof: { href: txUrl(r.id, net) },
            })}
          >
            <thead>
              <tr>
                <SortHeader label="Settled (UTC)" field="when" sort={sort} onSort={toggleSort} />
                <Th>Payer</Th>
                <Th>Paid to</Th>
                <SortHeader label="Round" field="round" sort={sort} onSort={toggleSort} align="right" />
                <Th align="right">Age</Th>
                <SortHeader label="Amount" field="amountUsdc" sort={sort} onSort={toggleSort} align="right" />
                <Th align="right">Tx</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row key={r.id} r={r} net={net} mine={r.to === payTo} />
              ))}
            </tbody>
          </Table>
        </Sheet>
      )}

      {/* One template literal rather than JSX text with holes in it: a chunk that
          follows an expression and wraps onto the next line loses its leading
          space, and this note read "Algorand testnetindexer" until it did not. */}
      <p className="mt-2.5 text-[12px] leading-relaxed text-mist">
        {`Read from the Algorand ${net} indexer by walking the x402 facilitator’s recent transactions — these are the settlements we can see, not a complete ledger. There is no endpoint column because the payment does not carry one: it credits a payout address, and the chain never records which route was called.`}
        {rows.length > 0 &&
          ` The CSV downloads exactly the ${rows.length} rows shown, in the order shown.`}
      </p>
    </>
  );
}

function Row({ r, net, mine }: { r: RealRun; net: ChainNetwork; mine: boolean }) {
  return (
    <Tr>
      <Td kind="mono">{utc(r.when) || "—"}</Td>
      <Td>
        <Address value={r.from} />
      </Td>
      <Td>
        <Address value={r.to} />
        {mine && (
          <span className="ml-2 rounded bg-gold/[0.12] px-1.5 py-px font-sans text-[10.5px] font-semibold text-gold">
            you
          </span>
        )}
      </Td>
      <Td kind="mono" align="right">{r.round.toLocaleString("en-US")}</Td>
      <Td kind="mist" align="right">{ago(r.when)}</Td>
      <Td kind={r.amountUsdc > 0 ? "settled" : "amount"}>{usd(r.amountUsdc, 3)}</Td>
      <Td kind="proof" href={txUrl(r.id, net)} />
    </Tr>
  );
}
