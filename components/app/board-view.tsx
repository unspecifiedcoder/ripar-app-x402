"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkAddress } from "@/lib/algorand-address";
import { useSettings } from "@/lib/settings";
import {
  compose,
  unitsFmt,
  useBoard,
  whenIso,
  type BoardJob,
  type ComposedCall,
} from "@/lib/registry-client";
import type { ActionId, LegalAction } from "@/lib/registry-actions";
import { EmptyState, Metric, PageHead, Sheet, StatusPill } from "./bits";
import { ComposeRefused, UnsignedCall } from "./unsigned-txn";
import { Table, Td, Th, Tr } from "./table";

const peraApp = (id: number) => `https://testnet.explorer.perawallet.app/application/${id}/`;
const peraAddress = (a: string) => `https://testnet.explorer.perawallet.app/address/${a}/`;
const loraAsset = (id: number) => `https://lora.algokit.io/testnet/asset/${id}`;

const shortAddr = (a: string) => (a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);
const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

/**
 * The onchain job board, with escrow and the next legal move on every row.
 *
 * A BUDGET is a number the client wrote into the job struct; posting a job
 * moves nothing. An ESCROW is what app 770382915 actually holds in an `es_`
 * box. A row showing a budget and no escrow is unfunded, and that distinction
 * is not cosmetic — it is the difference between an intention and a promise
 * held.
 *
 * Every action offered here is composed as an unsigned transaction. The board
 * refuses to build one the contract would reject, so what you see on a row is
 * what the chain will actually accept next, and from whom.
 */
export function BoardView() {
  const { data, status, error } = useBoard();
  const [open, setOpen] = useState<number | null>(null);

  const jobs = data?.jobs ?? [];

  return (
    <>
      <PageHead
        title="Job board"
        subtitle="Every job in the ERC-8004 Validation Registry on Algorand TestNet, with what is actually escrowed against it and which call the contract will accept next."
        network="testnet"
      />

      {status === "error" ? (
        <EmptyState
          title="Could not read the Validation Registry"
          body={`${error ?? "algod did not answer."} Nothing here is cached or seeded, so the board shows nothing rather than something stale.`}
        />
      ) : status === "loading" || !data ? (
        <Sheet>
          <p className="px-4 py-12 text-center text-[13px] text-mist">Reading box storage…</p>
        </Sheet>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-4">
            <Tile
              label="Jobs on the board"
              value={String(data.totals.jobs)}
              hint={`jb_ boxes, job_count has reached ${data.terms.jobCount}`}
            />
            <Tile
              label="Budget stated"
              value={unitsFmt(data.totals.budgetStatedMicro)}
              unit={data.terms.assetName}
              hint="what the jobs say they are worth, cancelled ones excluded"
            />
            <Tile
              label="Actually escrowed"
              value={unitsFmt(data.totals.escrowedMicro)}
              unit={data.terms.assetName}
              tone={data.totals.escrowedMicro > 0 ? "settled" : undefined}
              hint={
                data.totals.fundedJobs > 0
                  ? `held against ${data.totals.fundedJobs} job${data.totals.fundedJobs === 1 ? "" : "s"}`
                  : "no es_ box exists, so the contract holds nothing"
              }
            />
            <Tile
              label="Dispute window"
              value={String(data.terms.disputeWindowSecs)}
              unit="seconds"
              hint="after a passing verdict, anyone may release"
            />
          </div>

          {jobs.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No jobs have been posted"
                body="The Validation Registry is deployed and readable and holds no jb_ boxes. An empty board is a true answer — the first post_job call appears here."
              />
            </div>
          ) : (
            <div className="mt-4">
              <Sheet>
                <Table<BoardJob>
                  minWidth={760}
                  rows={jobs}
                  list={(job) => ({
                    primary: `Job #${job.jobId}`,
                    amount: unitsFmt(job.budgetMicro),
                    settled: job.escrowMicro > 0,
                    secondary: `${job.status}, escrow ${job.funded ? `${unitsFmt(job.escrowMicro)} ${data.terms.assetName}` : "none"}`,
                  })}
                >
                  <thead>
                    <tr>
                      <Th>Id</Th>
                      <Th>Status</Th>
                      <Th align="right">Budget</Th>
                      <Th align="right">Escrow</Th>
                      <Th align="right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <JobRows
                        key={job.jobId}
                        job={job}
                        assetName={data.terms.assetName}
                        assetId={data.terms.assetId}
                        appAddress={data.terms.appAddress}
                        expanded={open === job.jobId}
                        onToggle={() => setOpen(open === job.jobId ? null : job.jobId)}
                      />
                    ))}
                  </tbody>
                </Table>
              </Sheet>
            </div>
          )}

          <p className="mt-3 text-[12px] leading-relaxed text-mist">
            Read from box storage on Algorand TestNet at request time — app{" "}
            <a href={peraApp(data.validationApp)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-frost">
              {data.validationApp}
            </a>
            {data.round ? `, at round ${data.round.toLocaleString("en-US")}` : ""}. Escrow is denominated in{" "}
            <a href={loraAsset(data.terms.assetId)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-frost">
              asset {data.terms.assetId}
            </a>{" "}
            and is held by the app&rsquo;s own account{" "}
            <span className="font-plex text-[11.5px] text-mist">{shortAddr(data.terms.appAddress)}</span>.
          </p>
        </>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  tone?: "settled";
}) {
  return (
    <div className="bg-ink px-4 py-4">
      <Metric label={label} value={value} unit={unit} hint={hint} tone={tone} />
    </div>
  );
}

/** The job's summary row, plus (when expanded) a second row spanning every
 *  column that holds the job's detail and its legal actions. */
function JobRows({
  job,
  assetName,
  assetId,
  appAddress,
  expanded,
  onToggle,
}: {
  job: BoardJob;
  assetName: string;
  assetId: number;
  appAddress: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <Tr className="cursor-pointer" onClick={onToggle}>
        <Td kind="mono" className="text-frost">
          #{job.jobId}
        </Td>
        <Td>
          <StatusPill status={job.status} />
        </Td>
        <Td kind="mono">{unitsFmt(job.budgetMicro)}</Td>
        <Td kind={job.escrowMicro > 0 ? "settled" : "amount"}>
          {job.escrowMicro > 0 ? unitsFmt(job.escrowMicro) : <span className="text-haze">none</span>}
        </Td>
        <Td kind="mist" align="right">
          {job.actions.length ? `${job.actions.length} legal action${job.actions.length === 1 ? "" : "s"}` : "nothing legal"}
        </Td>
      </Tr>

      {expanded && (
        <tr className="border-b border-white/[0.06] last:border-0">
          <td colSpan={5} className="bg-white/[0.02] px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Client" value={job.client} link={peraAddress(job.client)} mono />
              <Field
                label="Assigned to"
                value={
                  job.serverAgentId === 0
                    ? "unassigned"
                    : `agent #${job.serverAgentId}, ${job.assignee ? job.assignee.domain : "no ag_ box"}`
                }
              />
              <Field
                label="Validator"
                value={
                  job.validatorAgentId === 0
                    ? "none named — the client judges"
                    : `agent #${job.validatorAgentId}, ${job.validator ? job.validator.domain : "no ag_ box"}`
                }
              />
              <Field label="Posted" value={whenIso(job.createdAt)} />
              <Field label="Spec hash" value={shortHash(job.specHash)} title={job.specHash} mono />
              <Field
                label="Result hash"
                value={job.resultHash ? shortHash(job.resultHash) : "not submitted"}
                title={job.resultHash ?? undefined}
                mono
              />
              <Field label="Last change" value={whenIso(job.updatedAt)} />
              <Field
                label="Unfunded balance"
                value={
                  job.unfundedMicro > 0
                    ? `${unitsFmt(job.unfundedMicro)} ${assetName} of the budget is not backed`
                    : "the escrow covers the stated budget"
                }
              />
            </div>

            {job.status === "validated" && job.disputeWindowClosesAt != null && (
              <p className="mt-3 text-[12px] leading-relaxed text-mist">
                The verdict landed at {whenIso(job.updatedAt)}, so the dispute window closed at{" "}
                {whenIso(job.disputeWindowClosesAt)}. Before that only the client could release; after it, anyone
                can — a validator who never returns would otherwise freeze the worker&rsquo;s money for good.
              </p>
            )}

            <div className="mt-4 border-t border-white/[0.06] pt-4">
              {job.actions.length === 0 ? (
                <p className="text-[12.5px] leading-relaxed text-mist">
                  {job.nothingLegal ?? "No call is legal on this job in its current state."}
                </p>
              ) : (
                <div className="space-y-3">
                  {job.actions.map((action) => (
                    <ActionRow
                      key={action.id}
                      job={job}
                      action={action}
                      assetName={assetName}
                      assetId={assetId}
                      appAddress={appAddress}
                    />
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * One legal call, with whatever the contract needs supplied alongside it, and a
 * sender field that defaults to the address the contract will actually accept.
 */
function ActionRow({
  job,
  action,
  assetName,
  assetId,
  appAddress,
}: {
  job: BoardJob;
  action: LegalAction;
  assetName: string;
  assetId: number;
  appAddress: string;
}) {
  const { payout } = useSettings();
  const [sender, setSender] = useState(action.whoAddress ?? payout);
  const [agentId, setAgentId] = useState("");
  const [resultHash, setResultHash] = useState("");
  const [amount, setAmount] = useState(() => String(job.unfundedMicro || job.budgetMicro));
  const [call, setCall] = useState<ComposedCall | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const senderOk = checkAddress(sender).ok;

  // Guarded on a ref, not on the state flag below it. setState schedules a
  // re-render, so clicks dispatched before React commits all read the old value
  // and every one proceeds — three fast clicks on this button put three
  // identical requests on the wire. The ref flips on the same tick.
  async function build() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setCall(null);
    setRefused(null);
    try {
      const body: Record<string, unknown> = { action: action.id as ActionId, sender, jobId: job.jobId };
      if (action.id === "assign_job" || action.id === "set_validator") body.agentId = Number(agentId);
      if (action.id === "submit_result") body.resultHash = resultHash;
      if (action.id === "fund_job") body.amountMicro = Number(amount);
      setCall(await compose(body));
    } catch (e) {
      setRefused((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const needsAgent = action.id === "assign_job" || action.id === "set_validator";
  const needsHash = action.id === "submit_result";
  const needsAmount = action.id === "fund_job";
  const isVerdict = action.id === "validation_response";
  const ready =
    senderOk &&
    (!needsAgent || Number(agentId) > 0 || action.id === "set_validator") &&
    (!needsHash || /^(0x)?[0-9a-fA-F]{64}$/.test(resultHash.trim())) &&
    (!needsAmount || Number(amount) > 0);

  return (
    <div className="rounded-lg border border-white/[0.08] px-3.5 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold text-frost">{action.label}</span>
        <span className="font-plex text-[11.5px] text-haze">{action.signature}</span>
        {action.movesMoney && (
          <span className="rounded bg-white/[0.08] px-1.5 py-px text-[10.5px] font-medium text-mist">
            moves {assetName}
          </span>
        )}
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-mist">{action.what}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-mist">
        <span className="font-medium text-frost">Who may call it:</span> {action.who}
        {action.whoAddress && (
          <>
            {" — "}
            <a
              href={peraAddress(action.whoAddress)}
              target="_blank"
              rel="noreferrer"
              className="font-plex text-[11.5px] underline underline-offset-2 hover:text-frost"
            >
              {shortAddr(action.whoAddress)}
            </a>
          </>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-haze">Sender</span>
          <input
            value={sender}
            onChange={(e) => setSender(e.target.value.trim())}
            spellCheck={false}
            className={cn(
              "mt-1 w-full rounded-[6px] border bg-black/30 px-2 py-1.5 font-plex text-[11.5px] text-frost outline-none transition-colors",
              sender && !senderOk ? "border-[#f28b82]/50" : "border-white/[0.08] focus:border-mint/50"
            )}
          />
        </label>

        {needsAgent && (
          <label>
            <span className="block text-[11px] font-medium text-haze">Agent id</span>
            <input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={action.id === "set_validator" ? "0 clears it" : "1"}
              className="tnum mt-1 w-24 rounded-[6px] border border-white/[0.08] bg-black/30 px-2 py-1.5 font-plex text-[12px] text-frost outline-none focus:border-mint/50"
            />
          </label>
        )}

        {needsAmount && (
          <label>
            <span className="block text-[11px] font-medium text-haze">Base units of asset {assetId}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="tnum mt-1 w-40 rounded-[6px] border border-white/[0.08] bg-black/30 px-2 py-1.5 font-plex text-[12px] text-frost outline-none focus:border-mint/50"
            />
          </label>
        )}

        {needsHash && (
          <label className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-haze">Result sha256, 64 hex characters</span>
            <input
              value={resultHash}
              onChange={(e) => setResultHash(e.target.value.trim())}
              spellCheck={false}
              className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2 py-1.5 font-plex text-[11.5px] text-frost outline-none focus:border-mint/50"
            />
          </label>
        )}
      </div>

      {needsAmount && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-mist">
          Base units, six decimals — {unitsFmt(Number(amount) || 0)} {assetName}. The transfer goes to the
          app&rsquo;s own account <span className="font-plex">{shortAddr(appAddress)}</span> as transaction 0 of
          a two-transaction group, and the contract reads the amount off it rather than off an argument.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isVerdict ? (
          <>
            <VerdictButton
              label="Compose: passed"
              busy={busy}
              disabled={!senderOk}
              onClick={() => void buildVerdict(true)}
            />
            <VerdictButton
              label="Compose: failed"
              busy={busy}
              disabled={!senderOk}
              tone="bad"
              onClick={() => void buildVerdict(false)}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => void build()}
            disabled={!ready || busy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
              ready && !busy ? "bg-frost text-ink hover:bg-frost/90" : "cursor-not-allowed bg-white/[0.08] text-mist opacity-40"
            )}
          >
            {busy && <Loader2 size={11} className="animate-spin" />}
            Build the unsigned transaction
          </button>
        )}
        <span className="text-[11.5px] text-mist">Composed only. Nothing is signed or submitted.</span>
      </div>

      {refused && (
        <div className="mt-3">
          <ComposeRefused message={refused} />
        </div>
      )}
      {call && <UnsignedCall call={call} onClose={() => setCall(null)} />}
    </div>
  );

  async function buildVerdict(passed: boolean) {
    // Same guard as build(): a double-clicked verdict must not compose twice.
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setCall(null);
    setRefused(null);
    try {
      setCall(
        await compose({ action: "validation_response", sender, jobId: job.jobId, passed })
      );
    } catch (e) {
      setRefused((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
}

function VerdictButton({
  label,
  onClick,
  busy,
  disabled,
  tone = "ok",
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
  tone?: "ok" | "bad";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
        disabled || busy
          ? "cursor-not-allowed bg-white/[0.08] text-mist opacity-40"
          : tone === "bad"
            ? "bg-[#f28b82]/[0.12] text-[#f28b82] hover:bg-[#f28b82]/[0.18]"
            : "bg-frost text-ink hover:bg-frost/90"
      )}
    >
      {busy && <Loader2 size={11} className="animate-spin" />}
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  title,
  mono,
  link,
}: {
  label: string;
  value: string;
  title?: string;
  mono?: boolean;
  link?: string;
}) {
  const body = (
    <span className={cn("break-all", mono && "font-plex text-[11.5px]")} title={title}>
      {mono && value.length > 24 ? shortAddr(value) : value}
    </span>
  );
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-haze">{label}</div>
      <div className="mt-0.5 text-[12.5px] text-frost">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-frost">
            {body}
            <ArrowUpRight size={10} />
          </a>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
