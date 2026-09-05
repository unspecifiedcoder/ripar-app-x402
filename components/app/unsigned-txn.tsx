"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { SlideOver } from "@/components/ui/slide-over";
import type { ComposedCall } from "@/lib/registry-client";
import { cn } from "@/lib/utils";
import { CodeBlock, CopyButton } from "./bits";

/**
 * What a composed transaction looks like before anybody signs it.
 *
 * Opens as a sheet (§2.10) so the plain-language block and the base64 sit
 * beside the form that composed them rather than replacing it. The
 * plain-language block comes first and the base64 second, deliberately. A
 * signer who reads only the top of this panel should still know exactly what
 * signing moves, who it moves it to, and what it costs — the msgpack is the
 * thing they paste into a wallet, not the thing they are expected to audit.
 */
export function UnsignedCall({ call, onClose }: { call: ComposedCall; onClose: () => void }) {
  const group = call.transactions.length > 1;
  const [titleCopied, setTitleCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Every copy button in this sheet is one of `CopyButton` from ./bits, whose
  // aria-label always starts with "Copy". Listening on the click's bubble
  // rather than threading a callback through keeps this a read of the DOM
  // event, not a change to a shared primitive other views also render.
  function onContentClick(e: MouseEvent<HTMLDivElement>) {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn?.getAttribute("aria-label")?.toLowerCase().startsWith("copy")) return;
    setTitleCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTitleCopied(false), 1500);
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-1.5">
          Unsigned transaction
          {titleCopied && <Check size={14} className="text-mint" />}
        </span>
      }
      icon={<ShieldCheck size={16} />}
    >
      <div onClick={onContentClick} className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-mint/[0.12] px-2 py-0.5 text-[11.5px] font-semibold text-mint">
            <ShieldCheck size={12} />
            Unsigned
          </span>
          <span className="font-plex text-mist">{call.method}</span>
          <span className="ml-auto font-plex text-mist">
            app {call.appId}, fee {(call.totalFee / 1e6).toFixed(4)} ALGO
          </span>
        </div>

        {/* The chain's own verdict, asked before anyone is invited to sign.
            Composing a well-formed transaction is not the same as composing
            one that works: a stale agent_count, an off-by-one box name or a
            sender who is not the owner all compose cleanly and fail on submit
            — after the signature. A null simulation means the node could not
            be asked, which is not the same as a rejection and does not claim
            to be. */}
        {call.simulation && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-[6px] border px-3 py-2.5 text-[12.5px]",
              call.simulation.ok
                ? "border-mint/20 bg-mint/[0.06] text-mint"
                : "border-[#f28b82]/20 bg-[#f28b82]/[0.06] text-[#f28b82]"
            )}
          >
            <span className="mt-[1px] font-semibold">{call.simulation.ok ? "Simulated" : "Would fail"}</span>
            <span className="leading-relaxed">
              {call.simulation.ok ? (
                <>
                  algod ran this against round {call.simulation.round?.toLocaleString()} and it succeeded
                  {call.simulation.budgetConsumed != null
                    ? `, using ${call.simulation.budgetConsumed} of its opcode budget`
                    : ""}
                  . Signing is the only step left.
                </>
              ) : (
                <>{call.simulation.failure} — signing this would spend the fee and change nothing.</>
              )}
            </span>
          </div>
        )}
        {!call.simulation && (
          <div className="rounded-[6px] border border-gold/20 bg-gold/[0.06] px-3 py-2.5 text-[12.5px] text-gold/85">
            <span className="font-semibold">Not simulated</span> — the node could not be reached, so this has
            not been checked against the chain. That is not the same as it being wrong.
          </div>
        )}

        {call.lease && (
          <div className="rounded-[6px] border border-white/[0.08] px-3 py-2.5 text-[12.5px] text-mist">
            <span className="font-semibold text-frost">Exactly once</span> — this action carries a lease derived
            from what it is, so if it confirms, Algorand refuses a second copy from the same address for the rest
            of its validity window. A double-click, a wallet retry, or a replay of these bytes cannot execute it
            twice. Nothing enforces that but consensus: there is no nonce table here.
          </div>
        )}

        <div>
          <h4 className="text-[12.5px] font-semibold text-frost">What signing this would do</h4>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-frost">{call.summary}</p>
          <ul className="mt-2.5 space-y-1.5">
            {call.effects.map((e) => (
              <li key={e} className="flex gap-2 text-[12.5px] leading-relaxed text-mist">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-haze" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
          <Fact label="Signs as" value={call.sender} mono />
          <Fact
            label="Valid for rounds"
            value={`${call.validRounds.first.toLocaleString("en-US")} – ${call.validRounds.last.toLocaleString("en-US")}`}
          />
          {group && call.groupId && <Fact label="Group id" value={call.groupId} mono />}
          <Fact
            label="Boxes referenced"
            value={call.transactions.flatMap((t) => t.boxes).join(", ") || "none"}
            mono
          />
        </div>

        {call.transactions.map((t) => (
          <CodeBlock
            key={t.txId}
            title={
              group
                ? `Transaction ${t.index + 1} of ${call.transactions.length} — ${t.kind}`
                : `Unsigned transaction — ${t.kind}`
            }
            filename={`${t.txId.slice(0, 10)}…`}
            body={t.unsignedTxnBase64}
            maxHeight="180px"
            note={
              <>
                {t.summary} The id above is what this transaction will have once signed — signing does not
                change it, so you can look it up after submitting.
              </>
            }
          />
        ))}

        <div className="rounded-[6px] border border-white/[0.08] bg-black/30 px-3.5 py-3">
          <h4 className="text-[12.5px] font-semibold text-frost">Next steps</h4>
          <ol className="mt-1.5 space-y-1">
            {call.nextSteps.map((s, i) => (
              <li key={s} className="flex gap-2 text-[12.5px] leading-relaxed text-mist">
                <span className="tnum shrink-0 text-haze">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton
              text={call.transactions.map((t) => t.unsignedTxnBase64).join("\n")}
              label={group ? "Copy both" : "Copy base64"}
              what="unsigned transaction"
            />
            <span className="text-[11.5px] text-mist">Ripar holds no key. Nothing here has been signed or submitted.</span>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-haze">{label}</div>
      <div className={cn("mt-0.5 break-all text-[12.5px] text-frost", mono && "font-plex text-[12px]")}>{value}</div>
    </div>
  );
}

/** A compose that was refused, with the contract's reason in the user's words. */
export function ComposeRefused({ message }: { message: string }) {
  return (
    <div className="rounded-[10px] border border-[#f28b82]/25 bg-[#f28b82]/[0.06] px-4 py-3.5">
      <p className="text-[12.5px] font-semibold text-[#f28b82]">Not composed</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-frost">{message}</p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-mist">
        Nothing was built. Handing back a transaction the chain will reject costs a fee and reports only which
        assert tripped, so the check happens here instead.
      </p>
    </div>
  );
}
