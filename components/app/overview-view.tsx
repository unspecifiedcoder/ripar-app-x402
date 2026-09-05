"use client";

import { Button } from "@/components/ui/button";
import { AGENT_ORIGIN, useWorkspace } from "@/lib/real-data";
import { networkLabel } from "@/lib/explorer";
import { usd } from "@/lib/format";
import { EmptyState, Live, Metric, PageHead, Sheet } from "./bits";
import { Stream } from "./stream";

/**
 * The Overview (D-004): the screen that answers "is this real?" with its
 * proof. The old prompt-box hero is gone — nothing replaces it at the top.
 * The instrument strip reads the same chain the stream below shows, and
 * "Ship an endpoint" is now a secondary action in the page head rather than
 * the first thing on screen.
 */
export function OverviewView({
  onAsk,
  onGo,
}: {
  onAsk: (t: string) => void;
  /**
   * Optional: the shell does not yet thread a view-navigation callback into
   * this view. Falling back to the same `?view=` + `popstate` convention
   * `shell.tsx` already listens for (its `useEffect` re-reads the URL on any
   * popstate) means "Endpoints" really navigates without this view reaching
   * into the shell to add a prop it does not otherwise need.
   */
  onGo?: (v: "endpoints") => void;
}) {
  const { data, status } = useWorkspace();
  // The chain these figures were actually read from. Naming a network the app
  // is not reading turns every "verify" link into a 404 on a real transaction.
  const net = networkLabel(data?.chain.network ?? "testnet");
  const loading = status === "loading" && !data;

  function goEndpoints() {
    if (onGo) {
      onGo("endpoints");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("view", "endpoints");
    window.history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  const endpoints = data?.endpoints ?? [];
  const manifest = data?.manifest ?? null;

  return (
    <>
      <PageHead
        title="Overview"
        subtitle={`Read live from Algorand ${net} and from your deployed agent's own manifest.`}
        network={data?.chain.network}
        actions={
          <Button variant="ghost" size="sm" onClick={() => onAsk("")}>
            Ship an endpoint
          </Button>
        }
      />

      {/* The instrument strip (§2.6): four panels separated by rules, not
          gaps — one row on desktop, 2x2 on tablet, stacked on phone (§3). */}
      <Sheet>
        <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y lg:grid-cols-4 lg:divide-y-0">
          <div className="px-4 py-4 sm:px-5">
            <Metric
              label="Settled to you"
              value={loading ? "—" : usd(data!.mine.earnedUsdc)}
              unit="USDC"
              tone={!loading && data!.mine.earnedUsdc > 0 ? "settled" : undefined}
              hint={loading ? "reading the chain" : `${data!.mine.calls} paid calls to your address`}
            />
          </div>
          <div className="px-4 py-4 sm:px-5">
            <Metric
              label="Endpoints live"
              value={loading ? "—" : String(endpoints.length)}
              hint={loading ? "reading the chain" : (manifest?.handle ?? undefined)}
            />
          </div>
          <div className="px-4 py-4 sm:px-5">
            <Metric
              label="Network settlements"
              value={loading ? "—" : String(data!.runs.length)}
              hint={loading ? "reading the chain" : "recent x402 payments, all agents"}
            />
          </div>
          <div className="px-4 py-4 sm:px-5">
            <Metric
              label="Round"
              value={loading || !data?.chain.round ? "—" : data.chain.round.toLocaleString("en-US")}
              hint={
                loading
                  ? "reading the chain"
                  : data?.chain.blockTime
                    ? `${data.chain.blockTime.toFixed(1)}s between blocks`
                    : "measuring"
              }
            />
          </div>
        </div>
      </Sheet>

      {/* The stream leads (D-004); the endpoints summary sits beside it. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Stream />
        </div>

        <div className="lg:col-span-4">
          {!manifest && !loading ? (
            <EmptyState
              figure="0"
              title="No endpoints published"
              body={`Could not read a manifest from ${AGENT_ORIGIN.replace("https://", "")}. Deploy an agent with the Ripar SDK and this fills in from its own manifest — nothing is listed here that is not actually serving.`}
            />
          ) : (
            <Sheet>
              <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-1 sm:px-5">
                <h2 className="text-[15px] leading-5 font-semibold tracking-[-0.01em] text-frost">
                  Your endpoints
                </h2>
                <Button variant="ghost" size="sm" onClick={goEndpoints}>
                  Endpoints
                </Button>
              </div>
              {loading ? (
                <p className="px-4 py-8 text-[12.5px] text-mist sm:px-5">reading the chain</p>
              ) : endpoints.length === 0 ? (
                <p className="px-4 pb-4 text-[12.5px] text-mist sm:px-5">
                  {manifest?.handle ?? "This agent"} has published a manifest with no endpoints on it yet.
                </p>
              ) : (
                <ul className="px-4 pb-3 sm:px-5">
                  {endpoints.map((e) => (
                    <li
                      key={e.name}
                      className="flex items-center justify-between gap-3 border-t border-white/[0.06] py-2.5 first:border-0"
                    >
                      <span className="truncate text-[13.5px] text-frost">{e.name}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-plex tnum text-[12.5px] text-mist">
                          {e.priceUsdc != null ? `${usd(e.priceUsdc, 2)} USDC` : e.price}
                        </span>
                        {e.live && <Live />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Sheet>
          )}
        </div>
      </div>
    </>
  );
}
