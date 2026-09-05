"use client";

import { Activity, BadgePlus, Bot, BookUser, ClipboardList, Keyboard, LayoutGrid, MessageSquare, Plug, Receipt, Search, Settings, Wallet } from "lucide-react";
import { Mark } from "@/components/ui/mark";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Testnet } from "./bits";
import { cn } from "@/lib/utils";
import { usd } from "@/lib/format";
import { useWorkspace } from "@/lib/real-data";
import { shortAddress } from "@/lib/algorand-address";
import { useSettings } from "@/lib/settings";

// No "logs": the deployed agent is a Next.js app that writes nowhere we can
// read — it serves no run or log route — so the surface was showing lines
// generated in the browser. Removed rather than left as a convincing fiction.
export type View =
  | "overview" | "chat" | "endpoints" | "workflows" | "agents" | "receipts" | "settings"
  // The three registry surfaces. They read the ERC-8004 apps on TestNet rather
  // than settlement history, which is a different definition of "agent" — see
  // the note at the top of directory-view.tsx.
  | "directory" | "board" | "register";

export const NAV: { id: View; label: string; Icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", Icon: LayoutGrid },
  { id: "chat", label: "Chat", Icon: MessageSquare },
  { id: "endpoints", label: "Endpoints", Icon: Plug },
  { id: "workflows", label: "Workflows", Icon: Activity },
  { id: "agents", label: "Agents", Icon: Bot },
  { id: "receipts", label: "Receipts", Icon: Receipt },
  { id: "directory", label: "Directory", Icon: BookUser },
  { id: "board", label: "Job board", Icon: ClipboardList },
  { id: "register", label: "Register", Icon: BadgePlus },
];

export function Sidebar({
  view,
  onSelect,
  onSearch,
  onWithdraw,
  onSettings,
  onShortcuts,
  itemHeight,
}: {
  view: View;
  onSelect: (v: View) => void;
  onSearch: () => void;
  onWithdraw: () => void;
  onSettings: () => void;
  onShortcuts: () => void;
  /** 44px in the mobile drawer so every item clears the touch target floor;
   *  36px on the desktop rail (§2.4). */
  itemHeight?: "desktop" | "touch";
}) {
  const { name, payout } = useSettings();
  // Real earnings, from settlements to the deployed agent's payout address.
  // It reads 0.00 until somebody actually pays, and that is the honest number.
  const { data: ws, status } = useWorkspace();
  const network = ws?.chain.network;
  const earned = ws?.mine.earnedUsdc ?? 0;
  const calls = ws?.mine.calls ?? 0;
  // Signed out is a real state here, not a placeholder to paper over: the auth
  // backend for this deployment is unreachable, so nobody is signed in. Saying
  // so is better than the persona this used to render, which showed every
  // visitor an account they had never created.
  const signedIn = name.trim().length > 0;
  const initials = signedIn
    ? name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "—";
  const touch = itemHeight === "touch";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2.5 px-3 py-3.5">
        <Mark size={26} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold text-frost">Ripar</span>
          <span className="flex items-center gap-1.5 font-plex text-[11px] text-haze">
            {status === "loading" ? (
              "Algorand"
            ) : network === "testnet" ? (
              <>
                Algorand <Testnet />
              </>
            ) : (
              "Algorand MainNet"
            )}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className={cn(
          "mx-2.5 flex items-center gap-2 rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 text-[12.5px] text-mist transition-colors hover:border-white/[0.14]",
          touch ? "min-h-11" : "h-9"
        )}
      >
        <Search size={13} />
        Search
        <kbd className="ml-auto rounded border border-white/[0.10] px-1 font-plex text-[10.5px] text-haze">
          ⌘K
        </kbd>
      </button>

      {/* Not a <nav> here — the sidebar's own landmark is the wrapper this
          component is mounted into (shell.tsx). A nested nav would be a
          second, redundant landmark. */}
      <div className="mt-3 space-y-0.5 px-2">
        {NAV.map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex w-full items-center gap-2.5 rounded-[6px] px-2.5 text-[13.5px] font-medium transition-colors",
                touch ? "min-h-11" : "h-9",
                active ? "bg-white/[0.06] text-frost" : "text-mist hover:bg-white/[0.04] hover:text-frost"
              )}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-frost" />}
              <Icon size={16} className="shrink-0" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-2 p-2.5">
        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.06] p-3">
          <div className="text-[11px] font-medium leading-[14px] text-haze">Settled to your address</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "font-plex tnum text-[22px] leading-[26px] tracking-[-0.01em]",
                status === "loading" ? "text-mist" : earned > 0 ? "text-gold" : "text-frost"
              )}
            >
              {status === "loading" ? "—" : usd(earned)}
            </span>
            <span className="text-[12.5px] text-mist">USDC</span>
          </div>
          <div className="mt-0.5 text-[11.5px] leading-4 text-mist">
            {calls === 0 ? "no paid calls yet" : `${calls} paid ${calls === 1 ? "call" : "calls"}`}
          </div>
          <button
            type="button"
            onClick={onWithdraw}
            className={cn(
              "mt-2.5 w-full rounded-[6px] bg-white/[0.08] text-[13px] font-medium text-frost transition-colors hover:bg-white/[0.14]",
              touch ? "min-h-11" : "h-8"
            )}
          >
            Withdraw to wallet
          </button>
        </div>

        <Menu
          align="start"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className={cn(
                "flex w-full items-center gap-2 rounded-[6px] px-1.5 text-left transition-colors hover:bg-white/[0.04]",
                touch ? "min-h-11" : "py-1.5"
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[9px] font-bold text-mist">
                {initials}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] text-frost">{signedIn ? name : "Not signed in"}</span>
                <span className="block truncate font-plex text-[11px] text-haze">{payout ? shortAddress(payout) : "browsing read-only"}</span>
              </span>
            </button>
          )}
        >
          <MenuItem icon={<Wallet size={14} />} onClick={onWithdraw}>Withdraw</MenuItem>
          <MenuItem icon={<Settings size={14} />} onClick={onSettings}>Settings</MenuItem>
          <MenuItem icon={<Keyboard size={14} />} shortcut="?" onClick={onShortcuts}>Keyboard shortcuts</MenuItem>
        </Menu>
      </div>
    </div>
  );
}
