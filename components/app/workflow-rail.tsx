"use client";

import { cn } from "@/lib/utils";
import { costOfSteps, type Workflow } from "@/lib/app-data";
import { usd } from "@/lib/format";

/** The builder's left rail: every workflow in the workspace, so switching does
 *  not mean going back to the list first. It shares its column with the tool
 *  palette — `stacked` says the palette is under it and owes it a rule. */
export function WorkflowRail({
  workflows,
  currentId,
  stacked,
  onOpen,
}: {
  workflows: Workflow[];
  currentId: string;
  stacked?: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-b border-white/[0.08] md:border-r",
        stacked ? "md:border-b" : "md:border-b-0"
      )}
    >
      <div className="flex items-baseline gap-2 px-3 pb-1.5 pt-3">
        <h3 className="text-[12.5px] font-semibold text-frost">Workflows</h3>
        <span className="tnum text-[11.5px] text-haze">{workflows.length}</span>
      </div>

      <div
        className={cn(
          "max-h-[200px] min-h-0 flex-1 overflow-y-auto px-1.5 pb-2",
          stacked ? "md:max-h-[184px]" : "md:max-h-none"
        )}
      >
        {workflows.length <= 1 ? (
          <p className="px-2 py-2 text-[11.5px] leading-relaxed text-mist">
            {workflows.length === 1
              ? "This is the only workflow in the workspace. Start another from a template to switch between them here."
              : "No workflows yet."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {workflows.map((w) => {
              const on = w.id === currentId;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(w.id)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "relative block w-full rounded-lg px-2 py-1.5 text-left transition-colors",
                      on ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    {/* The active bar is frost, not gold — gold means money
                        (D-002), and this is only "you are here." */}
                    {on && <span className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-full bg-frost" />}
                    <span
                      className={cn(
                        "block truncate text-[12.5px] font-medium",
                        on ? "text-frost" : "text-mist"
                      )}
                    >
                      {w.name}
                    </span>
                    {/* No status pill: a workflow here is never armed or live,
                        so what the chain costs is the fact worth carrying. */}
                    <span className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="tnum text-[11px] text-haze">
                        {w.steps.length} {w.steps.length === 1 ? "step" : "steps"}
                      </span>
                      <span className="tnum ml-auto text-[11px] text-haze">
                        {usd(costOfSteps(w.steps), 3)} USDC
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
