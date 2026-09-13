import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { HeartPulse, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign In — TECHCARE AI" },
      {
        name: "description",
        content: "Secure sign in for patients and doctors on the TECHCARE AI clinical workspace.",
      },
      { property: "og:title", content: "Sign In — TECHCARE AI" },
      {
        property: "og:description",
        content: "Secure sign in for patients and doctors on the TECHCARE AI clinical workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

type Role = "patient" | "doctor";

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError("Those login details didn't work. Please check the email and password.");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const hasRole = (roles ?? []).some((r) => r.role === role);
    if (!hasRole) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        role === "doctor"
          ? "This account is not registered as a doctor."
          : "This account is not registered as a patient.",
      );
      return;
    }

    setLoading(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--login-gradient)] px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="login-grid absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-[460px] rounded-2xl border border-card/70 bg-card/75 p-6 shadow-[var(--shadow-login)] backdrop-blur-xl sm:p-9">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-brand)]">
            <HeartPulse className="h-8 w-8" strokeWidth={2.25} />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-foreground">TechCare AI Health</h1>
          <p className="mt-2 text-sm text-muted-foreground">Secure clinical care, connected to you.</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/80 p-1" aria-label="Choose account type">
          {(["patient", "doctor"] as Role[]).map((r) => (
            <Button
              key={r}
              type="button"
              variant="ghost"
              onClick={() => {
                setRole(r);
                setError(null);
              }}
              aria-pressed={role === r}
              className={`h-11 rounded-lg text-xs font-semibold transition-all duration-200 sm:text-sm ${
                role === r
                  ? "bg-card text-foreground shadow-sm hover:bg-card"
                  : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
              }`}
            >
              {r === "patient" ? <HeartPulse /> : <Stethoscope />}
              {r === "patient" ? "Log in as Patient" : "Log in as Doctor"}
            </Button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <div className="group relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-background/70 pl-10 placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <div className="group relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-background/70 pl-10 placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          {error ? (
            <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            {loading ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
            {loading ? "Signing in…" : "Submit"}
          </Button>
        </form>

        <div className="mt-7 flex items-center justify-center gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Protected health workspace
        </div>
      </div>
    </main>
  );
}
