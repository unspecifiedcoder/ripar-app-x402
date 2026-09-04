import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { StoreSync } from "@/components/store-sync";
import { AppMotionConfig } from "@/components/motion-config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className={`${inter.variable} ${plex.variable}`}>
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
