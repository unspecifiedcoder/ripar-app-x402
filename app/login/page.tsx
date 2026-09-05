import { AuthPanel } from "@/components/auth-panel";
import { DashboardPreview } from "@/components/dashboard-preview";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-ink p-3 sm:p-4">
      <div className="grid min-h-[calc(100dvh-24px)] gap-8 lg:grid-cols-2">
        {/* left — auth */}
        <div className="relative">
          <AuthPanel />
        </div>

        {/* right — the real stream, read-only, before you sign in (D-006) */}
        <div className="relative">
          <DashboardPreview />
        </div>
      </div>
    </main>
  );
}
