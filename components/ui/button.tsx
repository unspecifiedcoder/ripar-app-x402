import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// §2.1 — four variants, three heights. No shadow, no shine: the surface is
// the signal, not a gloss.
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "default" | "sm" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-frost text-ink",
  secondary: "bg-white/[0.08] text-frost hover:bg-white/[0.12]",
  ghost: "border border-white/[0.10] text-mist hover:text-frost",
  danger: "bg-[#f28b82]/[0.12] text-[#f28b82]",
};

const SIZE: Record<Size, string> = {
  default: "h-8 px-3 text-[13px]",
  sm: "h-7 px-2.5 text-[12.5px]",
  lg: "h-10 px-4 text-[13.5px]",
};

export function Button({
  children,
  variant = "primary",
  size = "default",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
} & ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[6px] font-medium transition-colors duration-150 focus-visible:outline-none active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        variant === "primary" && "hover:bg-frost/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
