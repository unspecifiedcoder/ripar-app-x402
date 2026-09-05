"use client";

import { useState } from "react";
import { ExternalLink, Rocket } from "lucide-react";
import { SlideOver } from "@/components/ui/slide-over";
import { MANIFEST_PATH } from "@/lib/agent-origin";
import type { DeployEndpoint } from "@/lib/deploy-targets";
import { AGENT_ORIGIN, useWorkspace, type RealEndpoint } from "@/lib/real-data";
import { CodeBlock, EmptyState, Metric, PageHead, Sheet, StatusPill } from "./bits";
import { Table, Td, Th, Tr } from "./table";
import { DeployModal } from "./deploy-modal";

const usd = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Endpoints come from the deployed agent's own `/.well-known/ripar.json`, so
 * this table cannot drift from what is actually serving: if the agent changes
 * its price, this changes with it.
 */
export function EndpointsView() {
  const { data, status, error } = useWorkspace();
  const [open, setOpen] = useState<RealEndpoint | null>(null);
  const [deploying, setDeploying] = useState<RealEndpoint | null>(null);

  const endpoints = data?.endpoints ?? [];
  // The snippet quotes a route the agent actually publishes rather than a path
  // we assume it has.
  const sample = endpoints[0];

  return (
    <>
      <PageHead
        title="Endpoints"
        subtitle={
          data?.manifest
            ? `Read live from ${data.manifest.handle}'s published manifest. An unpaid call to any of these returns a real 402 carrying a USDC quote.`
            : "Read live from your deployed agent's published manifest."
        }
        network={data?.chain.network}
        actions={
          <a
            href={`${AGENT_ORIGIN}${MANIFEST_PATH}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-3 py-1.5 text-[13px] font-medium text-mist transition-colors hover:border-white/[0.18] hover:text-frost"
          >
            View manifest <ExternalLink size={13} />
          </a>
        }
      />

      {status === "loading" ? (
        <Sheet>
          <p className="px-4 py-12 text-center text-[13px] text-mist">
            reading {AGENT_ORIGIN.replace("https://", "")}…
          </p>
        </Sheet>
      ) : !data?.manifest ? (
        <EmptyState
          title="No agent reachable"
          body={`Could not read a manifest from ${AGENT_ORIGIN}${error ? ` (${error})` : ""}. Deploy an agent with the Ripar SDK and this fills in from its own manifest — nothing is listed here that is not actually serving.`}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-4">
            <div className="bg-ink px-4 py-4">
              <Metric label="Agent" value={data.manifest.handle} hint={AGENT_ORIGIN.replace("https://", "")} />
            </div>
            <div className="bg-ink px-4 py-4">
              <Metric label="Endpoints live" value={String(endpoints.length)} />
            </div>
            <div className="bg-ink px-4 py-4">
              <Metric label="Paid calls received" value={String(data.mine.calls)} hint="across every endpoint" />
            </div>
            <div className="bg-ink px-4 py-4">
              <Metric
                label="Earned"
                value={usd(data.mine.earnedUsdc)}
                unit="USDC"
                hint="across every endpoint"
                tone={data.mine.earnedUsdc > 0 ? "settled" : undefined}
              />
            </div>
          </div>

          {/* No per-endpoint call count or revenue column. A settlement names the
              address it paid, not the route that earned it, so the only honest
              place for those figures is the agent-wide row above. */}
          <Sheet>
            <Table<RealEndpoint>
              minWidth={620}
              rows={endpoints}
              list={(e) => ({
                primary: e.name,
                amount: e.price,
                secondary: `${e.path}, ${e.method}`,
              })}
            >
              <thead>
                <tr>
                  <Th>Endpoint</Th>
                  <Th>Status</Th>
                  <Th>Method</Th>
                  <Th align="right">Price</Th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((e) => (
                  <Tr key={e.name} className="cursor-pointer" onClick={() => setOpen(e)}>
                    <Td>
                      <span className="block text-frost">{e.name}</span>
                      <span className="block truncate font-plex text-[11.5px] text-mist">{e.path}</span>
                    </Td>
                    <Td><StatusPill status="live" /></Td>
                    <Td kind="mono">{e.method}</Td>
                    <Td kind="mono" align="right">{e.price}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Sheet>

          <p className="mt-2.5 text-[12px] leading-relaxed text-mist">
            Paid calls and earnings are counted per agent, not per endpoint: an x402 settlement is a
            USDC transfer to the payout address, and the transfer does not carry the name of the route
            that was called. A per-endpoint figure would be a guess, so there is not one here.
            {data.mine.calls === 0 && sample && (
              <>
                {" "}
                Nothing has been paid yet, and it stays at zero until somebody actually pays — try it
                yourself with{" "}
                <code className="rounded bg-white/[0.06] px-1 py-px font-plex text-[11.5px] text-frost">
                  curl -X POST {AGENT_ORIGIN}
                  {sample.path} -d &apos;&#123;&quot;text&quot;:&quot;…&quot;&#125;&apos;
                </code>
                .
              </>
            )}
          </p>
        </>
      )}

      <SlideOver open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} width="max-w-lg">
        {open && <Detail e={open} onDeploy={() => { setDeploying(open); setOpen(null); }} />}
      </SlideOver>

      {/* No cast: the modal asks for the three things a deploy plan needs, and a
          manifest endpoint carries all three. */}
      {deploying && (
        <DeployModal endpoint={deployShape(deploying)} open onClose={() => setDeploying(null)} />
      )}
    </>
  );
}

/**
 * A manifest endpoint, as the deploy plan needs it. The slug is the published
 * route without its leading slash — the identifier the handler is configured
 * with, taken from what the agent actually serves rather than invented here.
 */
const deployShape = (e: RealEndpoint): DeployEndpoint => ({
  name: e.name,
  slug: e.path.replace(/^\/+/, ""),
  price: e.priceUsdc,
});

function Detail({ e, onDeploy }: { e: RealEndpoint; onDeploy: () => void }) {
  const snippet = `curl -X POST ${e.url} \\\n  -H 'content-type: application/json' \\\n  -d '{"text":"…"}'`;

  return (
    <div className="space-y-7">
      <div>
        <StatusPill status="live" />
        {e.description && <p className="mt-3 text-[13.5px] leading-relaxed text-mist">{e.description}</p>}
        <a
          href={e.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 break-all font-plex text-[12px] text-mist hover:text-frost"
        >
          {e.url} <ExternalLink size={11} />
        </a>
      </div>

      {/* Price and method are what the manifest states about this route. What it
          has earned is not here because it is not knowable per route — see the
          note under the table. */}
      <div className="grid grid-cols-2 gap-5 border-t border-white/[0.08] pt-5">
        <Metric label="Price" value={e.price} unit="per request" />
        <Metric label="Method" value={e.method} />
      </div>

      <div className="border-t border-white/[0.08] pt-5">
        <h3 className="mb-2.5 text-[13px] font-semibold text-frost">Call it</h3>
        <CodeBlock
          title="Request"
          body={snippet}
          note={
            <>
              Unpaid, that returns a real <span className="font-plex">402</span> with a USDC quote. This
              is not a simulation, the endpoint is public.
            </>
          }
        />
      </div>

      <div className="flex gap-2 border-t border-white/[0.08] pt-5">
        <button type="button" onClick={onDeploy} className="inline-flex items-center gap-1.5 rounded-lg bg-frost px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-frost/90">
          <Rocket size={13} /> Deploy another
        </button>
      </div>
    </div>
  );
}
