"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialogStack } from "./dialog-stack";

// Centered modal with a dimmed scrim (dismiss on backdrop click / Escape).
// Portaled to <body> so ancestors with backdrop-filter/transform (which trap
// fixed-position descendants) can't clip it.
export function Modal({
  open,
  onClose,
  children,
  title,
  description,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
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

  // First focusable element gets focus on open; focus returns to whatever
  // triggered the dialog once it closes (§2.10).
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-[520px] overflow-hidden rounded-[10px] border border-white/[0.12] bg-white/[0.09] p-6 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md",
              className
            )}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-haze transition-colors hover:bg-white/[0.08] hover:text-frost"
            >
              <X className="h-4 w-4" />
            </button>
            {title && <h2 className="pr-8 text-[15px] font-semibold text-frost">{title}</h2>}
            {description && <p className="mt-1 pr-8 text-[13.5px] leading-relaxed text-mist">{description}</p>}
            <div className={cn(title && "mt-5")}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
