"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialogStack } from "./dialog-stack";

// Drawer for secondary panels (version history, run history, activity,
// notifications) and the mobile navigation drawer. Slides in from an edge;
// dismiss on scrim click or Escape. Portaled to <body> so ancestors with
// backdrop-filter/transform (which trap fixed-position descendants) can't
// clip it.
export function SlideOver({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  width = "max-w-md",
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  width?: string;
  /** Which edge the panel slides in from. Default right (dialogs); the
   *  mobile nav drawer opens from the left. */
  side?: "left" | "right";
}) {
  useDialogStack(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // First focusable element gets focus on open; focus returns to the trigger
  // (the hamburger, for the mobile drawer) once it closes.
  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      const t = setTimeout(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
    restoreFocus.current?.focus();
    restoreFocus.current = null;
  }, [open]);

  // A simple focus trap: Tab wrapping stays inside the panel while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // AnimatePresence identifies its children by key.
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-[70] flex bg-black/50 backdrop-blur-sm",
            side === "left" ? "justify-start" : "justify-end"
          )}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            initial={{ x: side === "left" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "left" ? "-100%" : "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex h-full w-full flex-col border-white/[0.12] bg-white/[0.09] backdrop-blur-md",
              side === "left" ? "border-r" : "border-l",
              width
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-start gap-3">
                {icon && <span className="mt-0.5 text-haze">{icon}</span>}
                <div>
                  <h2 className="text-[15px] font-semibold text-frost">{title}</h2>
                  {description && <p className="mt-0.5 text-[13.5px] leading-relaxed text-mist">{description}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-haze transition-colors hover:bg-white/[0.08] hover:text-frost"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
