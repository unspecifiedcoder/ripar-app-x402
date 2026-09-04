"use client";

import { MotionConfig } from "motion/react";

/**
 * `MotionConfig` needs a client boundary; the root layout stays a server
 * component, so this thin wrapper carries the boundary instead. `reducedMotion="user"`
 * makes every Motion animation respect `prefers-reduced-motion` app-wide, per
 * DESIGN_SYSTEM.md §1.7 / D-015.
 */
export function AppMotionConfig({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
