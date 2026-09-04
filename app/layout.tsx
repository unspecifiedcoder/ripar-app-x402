import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { StoreSync } from "@/components/store-sync";
import { AppMotionConfig } from "@/components/motion-config";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Evidence — addresses, amounts, ids, timestamps — is always Plex Mono, app-wide
// (DESIGN_SYSTEM.md §1.1). Loaded once here, not per-route.
const plex = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  // Workspace, not marketing — keep it out of search results entirely.
  robots: { index: false, follow: false, nocache: true },
  title: {
    default: "Ripar",
    template: "%s · Ripar",
  },
  description: "The end-to-end AI ecosystem — build and ship AI apps, agents, and workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plex.variable}`}>
      <body className="antialiased">
        <AppMotionConfig>
          <ToastProvider>
            {children}
            <StoreSync />
          </ToastProvider>
        </AppMotionConfig>
      </body>
    </html>
  );
}
