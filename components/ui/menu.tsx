"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Lightweight dropdown menu: a trigger + a floating panel that closes on
// outside-click or Escape. No external dependency — used for every menu in the
// app (org switcher, user menu, model selector, project menu, etc.).

// Picking an item dismisses the menu. Passed down rather than left to each call
// site: outside-click cannot do it (the item is inside the panel), so a menu
// whose item opened a dialog would otherwise stay up behind it. The default is a
// no-op so a <MenuItem> rendered outside a <Menu> still works.
const MenuClose = createContext<() => void>(() => {});

export function Menu({
  trigger,
  children,
  align = "start",
  side = "bottom",
  panelClassName,
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  side?: "bottom" | "top";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 min-w-[220px] rounded-[6px] border border-white/[0.12] bg-white/[0.09] p-1 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md",
            side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
            align === "end" ? "right-0" : "left-0",
            "origin-top motion-safe:animate-[menuIn_120ms_ease-out]",
            panelClassName
          )}
        >
          <MenuClose.Provider value={close}>
            {typeof children === "function" ? children(close) : children}
          </MenuClose.Provider>
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
  danger,
  shortcut,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  shortcut?: string;
}) {
  const close = useContext(MenuClose);
  return (
    <button
      role="menuitem"
      onClick={() => {
        // Closed first, so an item that opens a dialog does not leave the panel
        // hanging behind the scrim.
        close();
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] transition-colors",
        danger
          ? "text-[#f28b82] hover:bg-[#f28b82]/[0.12]"
          : "text-mist hover:bg-white/[0.06] hover:text-frost"
      )}
    >
      {icon && <span className={cn("shrink-0", danger ? "text-[#f28b82]" : "text-haze")}>{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="text-[11px] text-haze">{shortcut}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 py-1.5 text-[11px] text-haze">{children}</div>;
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-white/[0.08]" />;
}
