"use client";

import { Stream } from "@/components/app/stream";
import { Testnet } from "@/components/app/bits";
import { useWorkspace } from "@/lib/real-data";

/**
 * The login page's right panel (D-006). This used to be a fabricated
 * screenshot of a product that does not exist — a workspace with views
 * this product has never shipped, and a "Post a job" card making a claim
 * about outcomes it could not back up. Both were untrue at the one place a
 * stranger decides whether to keep reading.
 *
 * The replacement is the real thing: the same live settlement stream the
 * Overview shows (`components/app/stream.tsx`), read-only, before you sign
 * in. Nothing here is invented; every row is a payment the chain actually
 * recorded.
 *
 * Kept as `DashboardPreview` so `app/login/page.tsx`'s import keeps
 * working — `tests/invariants/claims.test.ts` asserts this file path is
 * scanned.
 */
export function DashboardPreview() {
  const { data } = useWorkspace();
  const net = data?.chain.network ?? "testnet";

  return (
    <div className="h-full w-full rounded-[10px] border border-white/[0.08] bg-white/[0.06] p-5 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[11px] text-haze">
        Settling now on Algorand
        {net === "testnet" ? <Testnet /> : <span className="font-plex">MainNet</span>}
      </div>

      <div className="mt-3">
        <Stream readOnly rows={8} />
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-mist">
        A caller with no account gets a 402 carrying your price, attaches USDC and retries.
        Settlement lands in your own Algorand address — Ripar never holds it.
      </p>
    </div>
  );
}
