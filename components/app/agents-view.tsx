"use client";

import { useMemo, useState } from "react";
import { Bot, ExternalLink } from "lucide-react";
import { SlideOver } from "@/components/ui/slide-over";
import { ago, shortAddr, useWorkspace, type RealAgent } from "@/lib/real-data";
import { accountUrl, networkLabel } from "@/lib/explorer";
import { EmptyState, Metric, PageHead, SearchInput, Segmented, Sheet, SortHeader } from "./bits";
import { Table, Td, Th, Tr } from "./table";

type Scope = "all" | "mine";
type Field = "address" | "calls" | "earnedUsdc" | "payers" | "medianUsdc";

const usd = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * An agent HERE is defined by behaviour: an address that has actually received
 * x402 settlements, read off the indexer. Nobody can list themselves into this
 * table — you get in by being paid.
 *
 * There IS now a registry, and it answers a different question. The Directory
 * view reads `ag_` boxes out of IdentityRegistry 769444119: a self-attested id,
 * domain and controlling address. Being there proves someone registered; being
 * here proves someone paid. Neither list contains the other, and the note below
 * the table says so on screen rather than leaving it to be discovered.
 */
export function AgentsView() {
  const { data, status, error } = useWorkspace();
  const [scope, setScope] = useState<Scope>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ field: Field; dir: "asc" | "desc" }>({
    field: "earnedUsdc",
    dir: "desc",
  });
  const [open, setOpen] = useState<RealAgent | null>(null);

  // Memoised because `?? []` builds a fresh array on every render, which
  // changed the deps of every useMemo below it and defeated all of them.
  const agents = useMemo(() => data?.agents ?? [], [data?.agents]);
  // Named from the chain these rows were actually read off, never assumed —
  // the app follows whichever network the agent's manifest declares.
  const net = networkLabel(data?.chain.network ?? "testnet");
  const counts = useMemo(
    () => ({ all: agents.length, mine: agents.filter((a) => a.mine).length }),
    [agents]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const scoped = scope === "mine" ? agents.filter((a) => a.mine) : agents;
    const found = term ? scoped.filter((a) => a.address.toLowerCase().includes(term)) : scoped;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...found].sort((a, b) =>
      sort.field === "address"
        ? a.address.localeCompare(b.address) * dir
        : ((a[sort.field] as number) - (b[sort.field] as number)) * dir
    );
  }, [agents, scope, q, sort]);

  const toggleSort = (field: Field) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" }));

  return (
    <>
      <PageHead
        title="Agents"
        subtitle={`Every address here has actually been paid over x402 on Algorand ${net}. An agent with one payer and many calls is usually one operator testing; many distinct payers is the signal worth watching.`}
        network={data?.chain.network}
      />

      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "mine", label: "Mine", count: counts.mine },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search by address…" className="w-full sm:w-[300px]" />
        <span className="tnum ml-auto text-[12.5px] text-mist">
          {rows.length} of {counts.all}
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
          title={q ? "No agents match" : scope === "mine" ? "Nobody has paid your agent yet" : "No settlements in this window"}
          body={
            q
              ? `Nothing matches “${q}”.`
              : scope === "mine"
                ? "Your endpoint is live and quoting. This fills in the moment a real payment lands — it will not show anything before then."
                : "This is a young protocol and quiet stretches are normal. No rows are invented to fill the gap."
          }
        />
      ) : (
        <Sheet>
          <Table<RealAgent>
            minWidth={860}
            rows={rows}
            list={(a) => ({
              primary: shortAddr(a.address, 10, 6),
              amount: usd(a.earnedUsdc),
              settled: a.earnedUsdc > 0,
              secondary: `${a.calls} ${a.calls === 1 ? "call" : "calls"}, ${a.payers} ${a.payers === 1 ? "payer" : "payers"}, ${ago(a.lastSeen)}`,
            })}
          >
            <thead>
              <tr>
                <SortHeader label="Agent address" field="address" sort={sort} onSort={toggleSort} />
                <SortHeader label="Paid calls" field="calls" sort={sort} onSort={toggleSort} align="right" />
                <SortHeader label="Distinct payers" field="payers" sort={sort} onSort={toggleSort} align="right" />
                <SortHeader label="Median call" field="medianUsdc" sort={sort} onSort={toggleSort} align="right" />
                <SortHeader label="Earned" field="earnedUsdc" sort={sort} onSort={toggleSort} align="right" />
                <Th align="right">Last paid</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <Tr key={a.address} className="cursor-pointer" onClick={() => setOpen(a)}>
                  <Td kind="mono" className="text-frost">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-mist">
                        <Bot size={14} />
                      </span>
                      <span>{shortAddr(a.address, 10, 6)}</span>
                      {a.mine && (
                        <span className="rounded-md bg-gold/[0.12] px-1.5 py-0.5 text-[10.5px] font-semibold text-gold">
                          Mine
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td kind="mono" align="right">{a.calls}</Td>
                  <Td kind="mono" align="right">{a.payers}</Td>
                  <Td kind="mono" align="right">{usd(a.medianUsdc, 3)}</Td>
                  <Td kind={a.earnedUsdc > 0 ? "settled" : "amount"}>{usd(a.earnedUsdc)}</Td>
                  <Td kind="mist" align="right">{ago(a.lastSeen)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Sheet>
      )}

      <p className="mt-1.5 text-[12px] leading-relaxed text-mist">
        <span className="font-medium text-frost">This is settlement, not registration.</span> Every row
        is an address observed being paid — it carries no id, no domain and no owner, because the chain does
        not record those against a payment. <span className="font-medium text-frost">Directory</span>{" "}
        reads the other side: agents that registered an id and a domain in the Identity Registry, whether or
        not anyone has ever paid them. An agent can appear in one and not the other.
      </p>

      <SlideOver open={!!open} onClose={() => setOpen(null)} title="Agent" width="max-w-lg">
        {open && (
          <div className="space-y-7">
            <div>
              <p className="break-all font-plex text-[12.5px] text-mist">{open.address}</p>
              <a
                href={accountUrl(open.address, data?.chain.network ?? "testnet")}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-mist underline underline-offset-2 hover:text-frost"
              >
                View on the block explorer <ExternalLink size={11} />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-5 border-t border-white/[0.08] pt-5">
              <Metric label="Paid calls" value={String(open.calls)} hint="settlements received" />
              <Metric label="Distinct payers" value={String(open.payers)} />
              <Metric label="Earned" value={usd(open.earnedUsdc)} unit="USDC" tone={open.earnedUsdc > 0 ? "settled" : undefined} />
              <Metric label="Median call" value={usd(open.medianUsdc, 3)} unit="USDC" hint="a proxy for list price" />
            </div>

            <div className="border-t border-white/[0.08] pt-5">
              <h3 className="text-[13px] font-semibold text-frost">What this is, exactly</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-mist">
                An address observed receiving x402 payments in the recent window. We do not know its
                name, its endpoints or its owner — the chain does not carry that. What we do know is
                that {open.payers} distinct {open.payers === 1 ? "party has" : "parties have"} paid it{" "}
                {open.calls} {open.calls === 1 ? "time" : "times"}, which is harder to fake than a listing.
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </>
  );
}
