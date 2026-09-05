import Image from "next/image";
import { cn } from "@/lib/utils";

export function AppIcon({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[24%] bg-white/[0.08] ring-1 ring-white/[0.10]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/ripar-mark.png"
        alt=""
        width={size}
        height={size}
        priority
        className="object-contain"
        style={{ width: size * 0.62, height: size * 0.62 }}
      />
    </div>
  );
}
