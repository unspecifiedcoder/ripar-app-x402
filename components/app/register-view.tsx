"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkAddress } from "@/lib/algorand-address";
import { useSettings } from "@/lib/settings";
import {
  checkRegistration,
  compose,
  whenIso,
  type AddressCheckResult,
  type ComposedCall,
} from "@/lib/registry-client";
import { ErrorPanel, Loading, PageHead, Sheet } from "./bits";
import { ComposeRefused, UnsignedCall } from "./unsigned-txn";

// The app id is read from the API response (`data.identityApp`) rather than
// declared here. This was `768_633_998` — a dead registry from two generations
// ago — while compose() targeted 770382913, so the page told the user they were
// registering into one app and built a transaction against another, and linked
// them to the dead one. Taking it from the response makes drift impossible.
const peraApp = (id: number) => `https://testnet.explorer.perawallet.app/application/${id}/`;
const peraAddress = (a: string) => `https://testnet.explorer.perawallet.app/address/${a}/`;

/**
 * Register an agent in the Identity Registry.
 *
 * Two things make this different from a normal form. First, the app cannot do
 * it for you: `new_agent` takes the address from `Txn.sender`, so whoever signs
 * IS the agent — which is what makes a registration self-attested and removes a
 * whole class of impersonation. Second, the contract allows exactly one
 * identity per address and rejects a second attempt with a bare `assert
 * failed`, so the check happens here, against the `ad_` box, before anything is
 * composed.
 */
export function RegisterView() {
  const { payout } = useSettings();
  const [address, setAddress] = useState(payout);
  const [domain, setDomain] = useState("");
  const [check, setCheck] = useState<{ state: "idle" | "checking" | "done" | "failed"; data: AddressCheckResult | null; error: string | null }>({
    state: "idle",
    data: null,
    error: null,
  });
  const [call, setCall] = useState<ComposedCall | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const inFlight = useRef(false);

  const addressCheck = checkAddress(address);
  const trimmedDomain = domain.trim();

  // Re-checked whenever either field settles, because both are contract asserts
  // and finding out on chain costs a fee for an error that names nothing.
  const run = useCallback(async (addr: string, dom: string) => {
    if (!checkAddress(addr).ok && !dom) {
      setCheck({ state: "idle", data: null, error: null });
      return;
    }
    setCheck((c) => ({ ...c, state: "checking" }));
    try {
      const data = await checkRegistration({
        address: checkAddress(addr).ok ? addr : undefined,
        domain: dom || undefined,
      });
      setCheck({ state: "done", data, error: null });
    } catch (e) {
      setCheck({ state: "failed", data: null, error: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void run(address, trimmedDomain), 400);
    return () => clearTimeout(t);
  }, [address, trimmedDomain, run]);

  const alreadyRegistered = (check.data?.addressAgentId ?? 0) > 0;
  const domainTaken = (check.data?.domainAgentId ?? 0) > 0;
  const ready = addressCheck.ok && trimmedDomain.length > 0 && !alreadyRegistered && !domainTaken;

  // The disabled primary's tooltip names the first failing precondition, in
  // the exact order the guard above checks them — never a generic "cannot
  // submit" that leaves the reader to guess which one it was.
  const disabledReason = !addressCheck.ok
    ? address.length === 0
      ? "Enter the signing address"
      : addressCheck.message
    : trimmedDomain.length === 0
      ? "Enter a domain"
      : alreadyRegistered
        ? "This address is already an agent"
        : domainTaken
          ? `${trimmedDomain} is already registered`
          : null;

  // Guarded on a ref, not on the state flag below it. setState schedules a
  // re-render, so clicks dispatched before React commits all read the old value
  // and every one proceeds — three fast clicks on this button put three
  // identical requests on the wire. The ref flips on the same tick.
  async function build() {
    if (inFlight.current) return;
    inFlight.current = true;
    setComposing(true);
    setCall(null);
    setRefused(null);
    try {
      setCall(await compose({ action: "new_agent", sender: address, domain: trimmedDomain }));
    } catch (e) {
      setRefused((e as Error).message);
    } finally {
      inFlight.current = false;
      setComposing(false);
    }
  }

  return (
    <>
      <PageHead
        title="Register an agent"
        subtitle="Claim an id in the ERC-8004 Identity Registry on Algorand TestNet. This builds the transaction; your wallet signs it. Ripar never holds a key."
        network="testnet"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Sheet>
            <div className="space-y-4 px-4 py-4">
              <div>
                <label htmlFor="reg-address" className="block text-[12.5px] font-medium text-frost">
                  Address that will sign
                </label>
                <input
                  id="reg-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value.trim())}
                  spellCheck={false}
                  placeholder="58 base32 characters"
                  aria-invalid={address.length > 0 && !addressCheck.ok ? true : undefined}
                  className={cn(
                    "mt-1.5 w-full rounded-[6px] border bg-black/30 px-3 py-2 font-plex text-[12.5px] text-frost outline-none transition-colors",
                    address.length > 0 && !addressCheck.ok
                      ? "border-[#f28b82]/50"
                      : "border-white/[0.08] focus:border-mint/50"
                  )}
                />
                <p
                  className={cn(
                    "mt-1 text-[11.5px] leading-relaxed",
                    address.length > 0 && !addressCheck.ok ? "text-[#f28b82]" : "text-mist"
                  )}
                >
                  {address.length > 0 && !addressCheck.ok
                    ? addressCheck.message
                    : "The contract reads Txn.sender, not an argument — whichever wallet signs becomes the agent. This field only decides what gets composed."}
                </p>
              </div>

              <div>
                <label htmlFor="reg-domain" className="block text-[12.5px] font-medium text-frost">
                  Domain
                </label>
                <input
                  id="reg-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  spellCheck={false}
                  placeholder="your-agent.example.com"
                  className={cn(
                    "mt-1.5 w-full rounded-[6px] border bg-black/30 px-3 py-2 font-plex text-[12.5px] text-frost outline-none transition-colors",
                    domainTaken ? "border-[#f28b82]/50" : "border-white/[0.08] focus:border-mint/50"
                  )}
                />
                <p className="mt-1 text-[11.5px] leading-relaxed text-mist">
                  Recorded, not verified. The registry stores the string; it does not fetch anything from it,
                  and nothing here publishes an agent card for you.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void build()}
                disabled={!ready || composing}
                title={!ready ? (disabledReason ?? undefined) : undefined}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-[6px] text-[13px] font-medium transition-colors",
                  ready && !composing ? "bg-frost text-ink hover:bg-frost/90" : "cursor-not-allowed bg-white/[0.08] text-mist opacity-40"
                )}
              >
                {composing && <Loader2 size={13} className="animate-spin" />}
                Build the unsigned transaction
              </button>
            </div>
          </Sheet>

          <PrecheckPanel
            state={check.state}
            error={check.error}
            data={check.data}
            addressOk={addressCheck.ok}
            domain={trimmedDomain}
          />
        </div>

        <div className="space-y-4">
          {refused && <ComposeRefused message={refused} />}
          {!call && !refused && (
            <Sheet>
              <div className="px-5 py-8">
                <h3 className="text-[13.5px] font-semibold text-frost">
                  What this will hand you, and what it will not
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mist">
                  A base64 msgpack transaction and a sentence for every consequence of signing it. Paste it
                  into Pera, Defly, Lute or any signing service that takes an unsigned Algorand transaction.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-mist">
                  It will never hand you a signature. There is no key in this app, no mnemonic field, and no
                  code path that produces a signed transaction — which is checkable rather than promised:{" "}
                  <span className="font-plex text-[12px]">lib/registry-compose.ts</span> imports no signing
                  function at all.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-mist">
                  Signing costs one transaction fee. No asset moves and{" "}
                  {check.data ? (
                    <>
                      app{" "}
                      <a
                        href={peraApp(check.data.identityApp)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-frost"
                      >
                        {check.data.identityApp} <ArrowUpRight size={11} />
                      </a>
                    </>
                  ) : (
                    "the Identity Registry"
                  )}{" "}
                  takes custody of nothing.
                </p>
              </div>
            </Sheet>
          )}
        </div>
      </div>

      {call && <UnsignedCall call={call} onClose={() => setCall(null)} />}
    </>
  );
}

/**
 * The pre-flight, shown whether or not it found a problem. A check that only
 * appears when it fails leaves the user unsure it ran.
 */
function PrecheckPanel({
  state,
  error,
  data,
  addressOk,
  domain,
}: {
  state: "idle" | "checking" | "done" | "failed";
  error: string | null;
  data: AddressCheckResult | null;
  addressOk: boolean;
  domain: string;
}) {
  if (state === "idle") {
    return (
      <Sheet>
        <p className="px-4 py-4 text-[12.5px] leading-relaxed text-mist">
          Enter an address and the registry is checked before anything is composed — one box read against{" "}
          <span className="font-plex text-[12px]">ad_&lt;public key&gt;</span> and one against{" "}
          <span className="font-plex text-[12px]">dm_&lt;domain&gt;</span>.
        </p>
      </Sheet>
    );
  }

  if (state === "checking") {
    return (
      <Sheet>
        <div className="px-4 py-4">
          <Loading label="Reading the Identity Registry…" />
        </div>
      </Sheet>
    );
  }

  if (state === "failed") {
    return (
      <ErrorPanel what="the Identity Registry" host="algod" message={error ?? "algod did not answer."} />
    );
  }

  const registered = (data?.addressAgentId ?? 0) > 0;
  const taken = (data?.domainAgentId ?? 0) > 0;

  return (
    <Sheet>
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[12.5px] font-semibold text-frost">Checked against the chain</h3>
          {data?.expectedAgentId != null && !registered && (
            <span className="ml-auto text-[11.5px] text-mist">would become agent #{data.expectedAgentId}</span>
          )}
        </div>

        {addressOk && (
          <Row
            ok={!registered}
            title={registered ? "This address is already an agent" : "This address is not registered"}
            body={
              registered && data?.addressAgent ? (
                <>
                  It is agent #{data.addressAgentId},{" "}
                  <span className="font-plex text-[11.5px]">{data.addressAgent.domain}</span>, registered{" "}
                  {whenIso(data.addressAgent.registeredAt)}. The contract asserts one identity per address, so a
                  second <span className="font-plex text-[11.5px]">new_agent</span> from it fails with a bare
                  assert that names nothing. Sign from a different address, or use{" "}
                  <span className="font-plex text-[11.5px]">update_agent</span> to move that id to a new domain.{" "}
                  <a
                    href={peraAddress(data.addressAgent.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-frost"
                  >
                    Check it <ArrowUpRight size={10} />
                  </a>
                </>
              ) : (
                <>
                  No <span className="font-plex text-[11.5px]">ad_</span> box holds its public key, so the
                  one-identity-per-address assert would pass.
                </>
              )
            }
          />
        )}

        {domain && (
          <Row
            ok={!taken}
            title={taken ? `${domain} is already registered` : `${domain} is free`}
            body={
              taken ? (
                <>It belongs to agent #{data?.domainAgentId}. One identity per domain is also a contract assert.</>
              ) : (
                <>
                  No <span className="font-plex text-[11.5px]">dm_</span> box exists for it.
                </>
              )
            }
          />
        )}
      </div>
    </Sheet>
  );
}

function Row({ ok, title, body }: { ok: boolean; title: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          ok ? "bg-mint/[0.12] text-mint" : "bg-gold/[0.12] text-gold"
        )}
      >
        {ok ? <Check size={12} /> : <AlertTriangle size={12} />}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-frost">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-mist">{body}</p>
      </div>
    </div>
  );
}
