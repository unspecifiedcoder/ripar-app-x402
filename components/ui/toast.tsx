"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Info, X } from "lucide-react";

type Tone = "default" | "success" | "error";
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; tone: Tone; action?: ToastAction };
type ToastApi = { toast: (message: string, tone?: Tone, action?: ToastAction) => void };

const ToastContext = createContext<ToastApi | null>(null);

// Safe to call outside a provider (returns a no-op) so components never crash.
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { toast: () => {} };
}

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Tone = "default", action?: ToastAction) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, tone, action }]);
    // Errors persist until dismissed (§2.12); everything else auto-dismisses,
    // and toasts with an action linger a bit longer so the user can reach them.
    if (tone !== "error") {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 5000 : 3200);
    }
  }, []);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Bottom-right, never more than two stacked (§2.12). */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2">
        <AnimatePresence>
          {toasts.slice(-2).map((t) => (
            <motion.div
              key={t.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex w-[360px] items-center gap-2 rounded-[10px] border border-white/[0.12] bg-white/[0.09] py-2.5 pl-3 pr-3 text-[13.5px] font-medium text-frost shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md"
            >
              {t.tone === "success" && <Check className="h-4 w-4 shrink-0 text-mint" />}
              {t.tone === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-[#f28b82]" />}
              {t.tone === "default" && <Info className="h-4 w-4 shrink-0 text-haze" />}
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="shrink-0 rounded-[6px] bg-white/[0.08] px-2.5 py-1 text-[12px] font-semibold text-frost transition-colors hover:bg-white/[0.14]"
                >
                  {t.action.label}
                </button>
              )}
              {t.tone === "error" && (
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-[6px] p-0.5 text-haze transition-colors hover:text-frost"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
