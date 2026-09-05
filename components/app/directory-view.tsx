"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortAddr } from "@/lib/format";
import { accountUrl } from "@/lib/explorer";
import { unitsFmt, useDirectory, whenIso, type DirectoryAgent } from "@/lib/registry-client";
import { EmptyState, Metric, PageHead, SearchInput, Sheet, SortHeader } from "./bits";
import { Address, Table, Td, Th, Tr } from "./table";

const peraApp = (id: number) => `https://testnet.explorer.perawallet.app/application/${id}/`;

type Field = "agentId" | "domain" | "registeredAt" | "jobsPaid" | "volume";

/**
 * The Identity Registry's directory.
 *
 * This is a different question from the one the Agents view answers, and the
 * difference is worth stating plainly rather than leaving for someone to
 * discover from two lists that disagree:
 *
 *   Agents    — addresses that have RECEIVED x402 settlements. Derived from the
 *               indexer. Nobody declares themselves into it; you get in by
 *               being paid. It knows no names, no domains and no ids.
 *   Directory — `ag_` boxes in IdentityRegistry 770382913. A self-attested
 *               registration: an id, a domain and the address that signed for
 *               it. Being here proves somebody registered, not that anybody
 *               ever paid them.
 *
 * Neither is a subset of the other. An agent can register and never earn, and
 * an address can earn without ever registering.
 */
export function DirectoryView() {
  const { data, status, error } = useDirectory();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ field: Field; dir: "asc" | "desc" }>({ field: "agentId", dir: "asc" });

  const agents = useMemo(() => data?.agents ?? [], [data]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const found = term
      ? agents.filter(
          (a) =>
            a.domain.toLowerCase().includes(term) ||
            a.address.toLowerCase().includes(term) ||
            String(a.agentId) === term
        )
      : agents;
    const dir = sort.dir === "asc" ? 1 : -1;
    const key = (a: DirectoryAgent): number | string =>
      sort.field === "domain"
        ? a.domain
        : sort.field === "registeredAt"
          ? a.registeredAt
          : sort.field === "jobsPaid"
            ? (a.score?.jobsPaid ?? -1)
            : sort.field === "volume"
              ? (a.score?.volumeMicro ?? -1)
              : a.agentId;
    return [...found].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      if (typeof x === "string" || typeof y === "string") return String(x).localeCompare(String(y)) * dir;
      return ((x as number) - (y as number)) * dir || a.agentId - b.agentId;
    });
  }, [agents, q, sort]);

  const toggleSort = (field: Field) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" }));

  const scored = agents.filter((a) => a.score != null).length;

  return (
    <>
      <PageHead
        title="Agent directory"
        subtitle="Every agent registered in the ERC-8004 Identity Registry on Algorand TestNet — one ag_ box each, decoded from its ARC-4 struct."
        network="testnet"
      />

      <Sheet>
        <div className="px-4 py-3.5 text-[13.5px] leading-relaxed text-frost">
          <span className="font-semibold">
            This is not the same list as Agents, and neither one contains the other.
          </span>{" "}
          <span className="font-semibold">Directory</span> is registration: an id, a domain and
          the address that signed for it, self-attested into the Identity Registry. Being listed proves someone
          registered, not that anyone paid them.{" "}
          <span className="font-semibold">Agents</span> is settlement: an address observed
          receiving x402 payments on the chain. It knows no ids and no domains, and nobody can list themselves
          into it. An agent can register and never earn; an address can earn and never register.
        </div>
      </Sheet>

      {status === "error" ? (
        <div className="mt-4">
          <EmptyState
            title="Could not read the Identity Registry"
            body={`${error ?? "algod did not answer."} Nothing here is cached, so the directory shows nothing rather than a plausible empty list.`}
          />
        </div>
      ) : status === "loading" || !data ? (
        <Sheet>
          <p className="px-4 py-12 text-center text-[13px] text-mist">Reading box storage…</p>
        </Sheet>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-3">
            <div className="bg-ink px-4 py-4">
              <Metric
                label="Agents registered"
                value={String(agents.length)}
                hint="ag_ boxes that exist right now"
              />
            </div>
            <div className="bg-ink px-4 py-4">
              <Metric
                label="agent_count"
                value={data.agentCount == null ? "—" : String(data.agentCount)}
                hint="highest id ever issued — ids are never reused, so this is not a live count"
              />
            </div>
            <div className="bg-ink px-4 py-4">
              <Metric
                label="With a reputation record"
                value={String(scored)}
                hint={
                  scored === agents.length
                    ? "every agent has an sc_ box"
                    : `${agents.length - scored} ${agents.length - scored === 1 ? "has" : "have"} no sc_ box, which means never paid — not paid zero`
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search by domain, address or id…"
              className="w-full sm:w-[320px]"
            />
            <span className="tnum ml-auto text-[12.5px] text-mist">
              {rows.length} of {agents.length}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title={q ? "No agent matches" : "The registry is empty"}
                body={
                  q
                    ? `Nothing in the Identity Registry matches “${q}”. Matching is exact on id and address and a substring on domain — an agent picked by a near-miss is an agent paid by mistake.`
                    : "The Identity Registry is deployed and readable and holds no ag_ boxes. An empty registry is a true answer."
                }
              />
            </div>
          ) : (
            <div className="mt-3">
              <Sheet>
                <Table<DirectoryAgent>
                  minWidth={900}
                  rows={rows}
                  list={(a) => ({
                    primary: a.domain,
                    amount: a.score ? unitsFmt(a.score.volumeMicro) : "—",
                    settled: (a.score?.volumeMicro ?? 0) > 0,
                    secondary: `#${a.agentId}, ${shortAddr(a.address)}, registered ${whenIso(a.registeredAt).slice(0, 10)}`,
                    proof: { href: accountUrl(a.address, "testnet") },
                  })}
                >
                  <thead>
                    <tr>
                      <SortHeader label="Id" field="agentId" sort={sort} onSort={toggleSort} />
                      <SortHeader label="Domain" field="domain" sort={sort} onSort={toggleSort} />
                      <Th>Controlling address</Th>
                      <SortHeader label="Registered" field="registeredAt" sort={sort} onSort={toggleSort} />
                      <SortHeader
                        label="Jobs paid"
                        field="jobsPaid"
                        sort={sort}
                        onSort={toggleSort}
                        align="right"
                      />
                      <SortHeader label="Settled" field="volume" sort={sort} onSort={toggleSort} align="right" />
                      <Th align="right">Validated / disputed</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <Row key={a.agentId} a={a} />
                    ))}
                  </tbody>
                </Table>
              </Sheet>
            </div>
          )}

          <p className="mt-2.5 text-[12px] leading-relaxed text-mist">
            Decoded from box storage in app{" "}
            <a
              href={peraApp(data.identityApp)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-frost"
            >
              {data.identityApp}
            </a>
            , with scores from app{" "}
            <a
              href={peraApp(data.reputationApp)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-frost"
            >
              {data.reputationApp}
            </a>
            {data.round ? `, read at round ${data.round.toLocaleString("en-US")}` : ""}. Jobs paid counts
            distinct settlements the Reputation Registry credited; validated and disputed are verdicts the
            Validation Registry wrote. Neither is a rating anybody typed.
          </p>
        </>
      )}
    </>
  );
}

function Row({ a }: { a: DirectoryAgent }) {
  const settled = (a.score?.volumeMicro ?? 0) > 0;
  return (
    <Tr>
      <Td kind="mono">#{a.agentId}</Td>
      <Td kind="mono" className="text-frost">
        <span className="inline-flex items-center gap-1.5">
          <BadgeCheck size={13} className="shrink-0 text-haze" />
          {/* Not a link: the registry records a domain, it does not check that
              anything is served there, and a dead link would imply it had. */}
          {a.domain}
        </span>
      </Td>
      <Td>
        <span className="inline-flex items-center gap-1">
          <Address value={a.address} />
          <a
            href={accountUrl(a.address, "testnet")}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${a.address} in the explorer`}
            className="text-mist transition-colors hover:text-frost"
          >
            <ArrowUpRight size={11} />
          </a>
        </span>
      </Td>
      <Td kind="mist" title={whenIso(a.registeredAt)}>
        {whenIso(a.registeredAt).slice(0, 10)}
      </Td>
      {/* No record and a record of zero are different facts. */}
      <Td kind="mono" align="right">
        {a.score ? a.score.jobsPaid : <span className="text-haze">no record</span>}
      </Td>
      <Td kind={settled ? "settled" : "amount"}>
        {a.score ? unitsFmt(a.score.volumeMicro) : <span className="text-haze">—</span>}
      </Td>
      <Td align="right">
        {a.score ? (
          <span className="font-plex tnum">
            <span className="text-mint">{a.score.validated}</span>
            <span className="text-haze"> / </span>
            <span className={cn(a.score.disputed ? "text-[#f28b82]" : "text-haze")}>{a.score.disputed}</span>
          </span>
        ) : (
          <span className="text-haze">—</span>
        )}
      </Td>
    </Tr>
  );
}
