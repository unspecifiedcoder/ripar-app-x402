"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { SlideOver } from "@/components/ui/slide-over";
import { useDialogStack } from "@/components/ui/dialog-stack";
import { cn } from "@/lib/utils";
import { WorkspaceProvider, shortAddr, useWorkspace } from "@/lib/real-data";
import { shortAddress } from "@/lib/algorand-address";
import { useSettings } from "@/lib/settings";
import { useDirectory } from "@/lib/registry-client";
import { NAV, Sidebar, type View } from "./sidebar";
import { OverviewView } from "./overview-view";
import { ChatView, type Turn } from "./chat-view";
import { EndpointsView } from "./endpoints-view";
import { WorkflowsView } from "./workflows-view";
import { AgentsView } from "./agents-view";
import { ReceiptsView } from "./receipts-view";
import { SettingsView } from "./settings-view";
import { DirectoryView } from "./directory-view";
import { BoardView } from "./board-view";
import { RegisterView } from "./register-view";
import { ChordHint, ShortcutsOverlay, VIEW_LABEL, useShortcuts } from "./shortcuts";

/**
 * Which views exist as far as the URL is concerned.
 *
 * This was built from NAV alone, which quietly dropped `settings`: it is
 * reached from the sidebar footer rather than the nav list, so `?view=settings`
 * failed the membership test and fell back to overview. The page still answered
 * 200 — it rendered, just not the view that was asked for — which is precisely
 * the kind of failure a status-code check cannot see.
 *
 * Listed against the `View` union instead, so a view that exists but is not in
 * the nav is still addressable, and TypeScript fails the build if a new view is
 * added to the union and forgotten here.
 */
const VIEW_IDS: ReadonlySet<View> = new Set<View>([
  "overview",
  "chat",
  "endpoints",
  "workflows",
  "agents",
  "receipts",
  "settings",
  "directory",
  "board",
  "register",
]);

export function AppShell() {
  const [view, setViewState] = useState<View>("overview");

  /**
   * The view lived only in React state, so every nav item was a button with no
   * href: nothing could be linked to, the browser's back button walked out of
   * the app entirely, and a refresh mid-flow dropped you back on Overview with
   * whatever you were reading gone. For a workspace people are asked to compare
   * against a chain explorer in another tab, not being able to send someone the
   * tab you are looking at is a real cost.
   *
   * `pushState` on a view change, so back walks the views someone actually
   * visited. The first cut used `replaceState` to avoid "stacking up history",
   * which got the trade backwards: leaving the workspace entirely on the first
   * press of back is worse than having entries to walk, and stacking entries is
   * what history is for. `popstate` then restores the view from the URL.
   */
  useEffect(() => {
    const fromUrl = () => {
      const v = new URLSearchParams(window.location.search).get("view");
      return v && VIEW_IDS.has(v as View) ? (v as View) : "overview";
    };
    setViewState(fromUrl());
    const onPop = () => setViewState(fromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setView = useCallback((next: View) => {
    setViewState(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    // Re-selecting the view you are already on is not a navigation, so it must
    // not leave a duplicate entry that back has to step through twice.
    if (url.href === window.location.href) return;
    window.history.pushState(null, "", url);
  }, []);
  // Held here so the conversation survives leaving Chat and coming back.
  const [turns, setTurns] = useState<Turn[]>([]);
  const [nav, setNav] = useState(false);
  const [palette, setPalette] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [help, setHelp] = useState(false);
  // A sentence typed into the Overview composer opens Chat with it already in
  // the box. Leaving Chat drops it so it can't reappear on a later visit.
  const [seed, setSeed] = useState("");
  const { payout } = useSettings();

  const go = useCallback((v: View) => {
    setView(v);
    setNav(false);
    if (v !== "chat") setSeed("");
  }, [setView]);

  const ask = useCallback((text: string) => {
    setSeed(text);
    setView("chat");
  }, [setView]);

  const { chord } = useShortcuts({
    onGo: go,
    onPalette: useCallback(() => setPalette((v) => !v), []),
    onHelp: useCallback(() => setHelp((v) => !v), []),
  });

  return (
    <WorkspaceProvider>
    <div className="flex min-h-dvh">
      {/* desktop rail — §2.4: chrome, not a card, so no radius and no shadow */}
      <nav
        aria-label="Workspace"
        className="sticky top-0 hidden h-dvh w-[228px] shrink-0 border-r border-white/[0.08] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(255,255,255,0.014))] backdrop-blur-2xl lg:block"
      >
        <Sidebar
          view={view}
          onSelect={go}
          onSearch={() => setPalette(true)}
          onWithdraw={() => setWithdraw(true)}
          onSettings={() => go("settings")}
          onShortcuts={() => setHelp(true)}
        />
      </nav>

      {/* mobile drawer */}
      <SlideOver
        open={nav}
        onClose={() => setNav(false)}
        title="Workspace"
        side="left"
        width="w-[280px] max-w-[280px]"
      >
        <div className="-m-5 h-[calc(100%+2.5rem)]">
          <Sidebar
            view={view}
            onSelect={go}
            onSearch={() => { setNav(false); setPalette(true); }}
            onWithdraw={() => { setNav(false); setWithdraw(true); }}
            onSettings={() => go("settings")}
            onShortcuts={() => { setNav(false); setHelp(true); }}
            itemHeight="touch"
          />
        </div>
      </SlideOver>

      <div className="min-w-0 flex-1">
        <header className="flex h-[52px] items-center gap-2 border-b border-white/[0.08] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(255,255,255,0.014))] px-4 backdrop-blur-2xl lg:hidden">
          <button
            type="button"
            onClick={() => setNav((v) => !v)}
            aria-label={nav ? "Close navigation" : "Open navigation"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-mist transition-colors hover:text-frost"
          >
            {nav ? <X size={18} /> : <MenuIcon size={18} />}
          </button>
          <span className="text-[15px] font-semibold text-frost">{VIEW_LABEL[view]}</span>
        </header>

        <main className="mx-auto max-w-[1280px] px-5 py-7 sm:px-6 lg:px-8">
          {view === "overview" && <OverviewView onAsk={ask} />}
          {view === "chat" && <ChatView seed={seed} turns={turns} setTurns={setTurns} />}
          {view === "endpoints" && <EndpointsView />}
          {view === "workflows" && <WorkflowsView />}
          {view === "agents" && <AgentsView />}
          {view === "receipts" && <ReceiptsView />}
          {view === "settings" && <SettingsView />}
          {view === "directory" && <DirectoryView />}
          {view === "board" && <BoardView />}
          {view === "register" && <RegisterView />}
        </main>
      </div>

      {palette && <Palette onClose={() => setPalette(false)} onGo={go} />}

      <ShortcutsOverlay open={help} onClose={() => setHelp(false)} />
      <ChordHint show={chord} />

      <Modal
        open={withdraw}
        onClose={() => setWithdraw(false)}
        title="Withdraw to wallet"
        description="Settlement already lands in your own Algorand address — Ripar never holds the balance."
      >
        <p className="text-[13.5px] leading-relaxed text-mist">
            {/* With no payout set this interpolated an empty span, so the sentence
                read "settles directly from the caller to , so the funds are already
                yours". Signed out there is no address to name, and the point stands
                without one. */}
            There is nothing to withdraw from Ripar. Each paid call settles directly from the
            caller to{" "}
            {payout ? (
              <>
                <span className="font-plex text-[12.5px] text-frost">{shortAddress(payout)}</span>, so the
                funds are already yours.
              </>
            ) : (
              <>the payout address on the endpoint, never through Ripar.</>
            )}{" "}
            This button exists to say so.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setWithdraw(false)}
            className="h-8 rounded-[6px] bg-frost px-3 text-[13px] font-medium text-ink transition-colors hover:bg-frost/90"
          >
            Got it
          </button>
        </div>
      </Modal>
    </div>
    </WorkspaceProvider>
  );
}

type Entry = { label: string; hint: string; kind: string; run: () => void };
type Group = { name: string; entries: Entry[] };

/** ⌘K across every surface, its entries built from the real workspace. Mounted
 *  only while it is open, so closing it drops the query and the highlight
 *  without an effect having to reach back in and reset them. */
function Palette({
  onClose,
  onGo,
}: {
  onClose: () => void;
  onGo: (v: View) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  // Mounted only while open, so it is always a live surface. Counted like any
  // other dialog: without this, a `g`-chord fired while the box has focus
  // anywhere but the field navigates the page behind it. ⌘K still closes it —
  // that branch runs ahead of the dialog check.
  useDialogStack(true);
  const { data, status } = useWorkspace();
  // Directory reads go through this app's own routes (lib/registry-client),
  // which means a round trip: views appear immediately, directory results
  // join once that fetch resolves rather than blocking the palette on open.
  const { data: directory } = useDirectory();
  // Whatever had focus when ⌘K (or the search trigger) opened this — the
  // search button in the sidebar in the common case. Captured once, on mount,
  // so Escape and selecting a result both return focus to it.
  const trigger = useRef<HTMLElement | null>(
    typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const close = () => {
    onClose();
    trigger.current?.focus();
  };

  const views: Entry[] = [
    // Driven off NAV so a new surface reaches the palette by being navigable.
    ...NAV.map((n) => ({ label: n.label, hint: "view", kind: "view", run: () => onGo(n.id) })),
    // Settings lives in the account menu rather than the rail, so it is listed here.
    { label: "Settings", hint: "view", kind: "view", run: () => onGo("settings") },
  ];

  // Only things this workspace actually has. Endpoints come from the agent's
  // own manifest and agents are addresses that have really been paid, so
  // selecting one lands on a row that is there.
  const agents: Entry[] = (data?.agents ?? []).map((a) => ({
    label: shortAddr(a.address, 10, 6),
    hint: a.mine ? "yours" : `paid ${a.calls}×`,
    kind: "agent",
    run: () => onGo("agents"),
  }));

  const endpoints: Entry[] = (data?.endpoints ?? []).map((e) => ({
    label: e.name,
    hint: e.path,
    kind: "endpoint",
    run: () => onGo("endpoints"),
  }));

  const registry: Entry[] = (directory?.agents ?? []).map((a) => ({
    label: a.domain || shortAddr(a.address, 10, 6),
    hint: `agent ${a.agentId}`,
    kind: "registry",
    run: () => onGo("directory"),
  }));

  const groups: Group[] = [
    { name: "Views", entries: views },
    { name: "Agents", entries: agents },
    { name: "Endpoints", entries: endpoints },
    { name: "Directory", entries: registry },
  ].filter((g) => g.entries.length > 0);

  const entries = groups.flatMap((g) => g.entries);
  const term = q.trim().toLowerCase();
  const results = (term ? entries.filter((e) => `${e.label} ${e.hint}`.toLowerCase().includes(term)) : entries).slice(0, 9);

  // Rebuild the visible groups from the (possibly filtered, capped) results so
  // the group eyebrows only show for rows actually on screen.
  const resultGroups: Group[] = groups
    .map((g) => ({ name: g.name, entries: g.entries.filter((e) => results.includes(e)) }))
    .filter((g) => g.entries.length > 0);

  const note =
    status === "loading" && entries.length === views.length
      ? "Reading the agent manifest and the chain…"
      : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[560px] overflow-hidden rounded-[10px] border border-white/[0.12] bg-white/[0.09] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === "Escape") { close(); }
            if (e.key === "Enter" && results[sel]) { results[sel].run(); close(); }
          }}
          placeholder="Jump to anything…"
          className="h-10 w-full border-b border-white/[0.08] bg-transparent px-4 text-[13.5px] text-frost outline-none placeholder:text-haze"
        />
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-[13px] text-mist">
              {term ? `No matches for "${q}"` : "No matches"}
            </li>
          )}
          {resultGroups.map((g) => (
            <li key={g.name}>
              <div className="px-3 py-1.5 text-[11px] text-haze">{g.name}</div>
              <ul>
                {g.entries.map((r) => {
                  const i = results.indexOf(r);
                  return (
                    <li key={`${g.name}-${r.label}-${i}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setSel(i)}
                        onClick={() => { r.run(); close(); }}
                        className={cn(
                          "flex w-full items-baseline gap-2 rounded-[6px] px-3 py-2 text-left transition-colors",
                          i === sel ? "bg-white/[0.09]" : "hover:bg-white/[0.04]"
                        )}
                      >
                        <span className="text-[13.5px] text-frost">{r.label}</span>
                        <span className="ml-auto truncate font-plex text-[11px] text-haze">{r.hint}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        {note && !term && (
          <p className="border-t border-white/[0.08] px-4 py-2.5 text-[12px] leading-relaxed text-mist">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
