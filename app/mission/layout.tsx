import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "The autonomous agent economy, settling live.",
};

export default function MissionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-ink" data-mission>
      {children}
    </div>
  );
}
