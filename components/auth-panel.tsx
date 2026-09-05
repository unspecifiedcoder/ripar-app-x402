"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { GitHubLogo, GoogleLogo, MicrosoftLogo, RiparWordmark } from "@/components/brand-logos";
import { useToast } from "@/components/ui/toast";

type Provider = "google" | "azure" | "github";

export function AuthPanel() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<Provider | "email" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which OAuth providers this project actually has enabled.
  //
  // Rendering all three unconditionally meant showing buttons that could not
  // work: only `email` is enabled here, so Google, Microsoft and GitHub each
  // returned "Unsupported provider: provider is not enabled" the moment anyone
  // clicked. A control that cannot do the thing it names is the same class of
  // problem as inventing a person on this page — it promises something that is
  // not there.
  //
  // Asking the project means this corrects itself: enable Google in the
  // Supabase dashboard and the button appears, with no code change here.
  // `null` means we have not heard back yet, and we render nothing rather than
  // flashing buttons that may vanish.
  //
  // The "no keys configured" answer is known before the first render, so it is
  // the initial state rather than a setState inside the effect — calling
  // setState synchronously in an effect body cascades an extra render, which
  // the react-hooks rule flags and which is avoidable here.
  const [enabled, setEnabled] = useState<Set<Provider> | null>(() =>
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? null
      : new Set<Provider>()
  );

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    let live = true;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { external?: Record<string, boolean> } | null) => {
        if (!live) return;
        const ext = d?.external ?? {};
        setEnabled(
          new Set((["google", "azure", "github"] as Provider[]).filter((p) => ext[p]))
        );
      })
      // A failure here must not hide email sign-in, which does not depend on it.
      .catch(() => live && setEnabled(new Set()));
    return () => {
      live = false;
    };
  }, []);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  const oauth = async (provider: Provider) => {
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Add your Supabase keys to .env.local to enable sign-in.");
      return;
    }
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  };

  const emailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) return;
    const supabase = createClient();
    if (!supabase) {
      setError("Add your Supabase keys to .env.local to enable sign-in.");
      return;
    }
    setLoading("email");

    // Reach the auth host before asking the client library to. When the project
    // behind NEXT_PUBLIC_SUPABASE_URL is gone, `signInWithOtp` throws a bare
    // `TypeError: Failed to fetch` — which supabase-js also logs to the console,
    // and which we then rendered verbatim. "Failed to fetch" tells a user
    // nothing they can act on: it reads identically whether their wifi dropped,
    // the site is broken, or the backend no longer exists.
    const reachable = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
    })
      .then(() => true)
      .catch(() => false);

    if (!reachable) {
      setLoading(null);
      setError(
        "Cannot reach the sign-in service. This is not your connection — the " +
          "authentication backend for this deployment is not responding. " +
          "Everything else on Ripar reads the chain directly and still works."
      );
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch {
      // A throw here is transport, not a rejected credential — the library only
      // returns `{ error }` for answers it actually received.
      setError(
        "The sign-in service did not respond. Nothing was sent, and no account was changed."
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
      <div className="absolute left-8 top-8">
        <RiparWordmark />
      </div>

      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-frost">Welcome to Ripar</h1>
        <p className="mt-2 text-[15px] text-mist">The execution layer for Algorand agents</p>

        {sent ? (
          <div className="mt-8 rounded-[10px] border border-white/[0.08] bg-white/[0.06] p-5 text-sm text-frost">
            <p className="font-medium text-frost">Check your inbox</p>
            <p className="mt-1 text-mist">
              We sent a magic sign-in link to <span className="font-medium text-frost">{email}</span>.
            </p>
          </div>
        ) : (
          <>
            {enabled && enabled.size > 0 ? (
              <div className="mt-8 space-y-3">
                {enabled.has("google") ? (
                  <OAuthButton onClick={() => oauth("google")} loading={loading === "google"} icon={<GoogleLogo />}>
                    Continue with Google
                  </OAuthButton>
                ) : null}
                {enabled.has("azure") ? (
                  <OAuthButton onClick={() => oauth("azure")} loading={loading === "azure"} icon={<MicrosoftLogo />}>
                    Continue with Microsoft
                  </OAuthButton>
                ) : null}
                {enabled.has("github") ? (
                  <OAuthButton onClick={() => oauth("github")} loading={loading === "github"} icon={<GitHubLogo />}>
                    Continue with GitHub
                  </OAuthButton>
                ) : null}
              </div>
            ) : null}

            <div className={cn("flex items-center gap-4", enabled && enabled.size > 0 ? "my-6" : "sr-only")}>
              <span className="h-px flex-1 bg-white/[0.10]" />
              <span className="text-sm text-haze">or</span>
              <span className="h-px flex-1 bg-white/[0.10]" />
            </div>

            <form onSubmit={emailSignIn} className="space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="h-9 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-3 text-sm text-frost outline-none transition-colors placeholder:text-haze focus:border-mint/50"
              />
              <button
                type="submit"
                disabled={loading === "email"}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-frost text-sm font-medium text-ink transition-colors hover:bg-frost/90 disabled:opacity-40"
              >
                {loading === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue with email
              </button>
            </form>
          </>
        )}

        {error && <p className="mt-4 text-sm text-[#f28b82]">{error}</p>}

        <p className="mt-8 text-xs leading-relaxed text-mist">
          By signing in, you agree to the{" "}
          <button onClick={() => toast("Terms of Use")} className="text-mist underline underline-offset-2 hover:text-frost">Terms of Use</button>,{" "}
          <button onClick={() => toast("Fair Usage Policy")} className="text-mist underline underline-offset-2 hover:text-frost">Fair Usage Policy</button>, and{" "}
          <button onClick={() => toast("Privacy Notice")} className="text-mist underline underline-offset-2 hover:text-frost">Privacy Notice</button>.
        </p>
      </div>
    </div>
  );
}

function OAuthButton({
  children,
  icon,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-[6px] border border-white/[0.10] bg-white/[0.08] text-sm font-medium text-frost transition-colors hover:bg-white/[0.12] disabled:opacity-40"
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin text-haze" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-frost">{icon}</span>
      )}
      {children}
    </button>
  );
}
