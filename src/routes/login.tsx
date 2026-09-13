import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
      { title: "Sign In or Sign Up — TECHCARE AI" },
      {
        name: "description",
        content:
          "Secure sign in and sign up for patients and doctors on the TECHCARE AI clinical workspace.",
      },
      { property: "og:title", content: "Sign In or Sign Up — TECHCARE AI" },
      {
        property: "og:description",
        content:
          "Secure sign in and sign up for patients and doctors on the TECHCARE AI clinical workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Role = "patient" | "doctor";
type Mode = "signin" | "signup";

const SEEDED_EMAILS = [
  "patient1@techcare.ai",
  "patient2@techcare.ai",
  "patient3@techcare.ai",
  "doctor1@techcare.ai",
  "doctor2@techcare.ai",
  "doctor3@techcare.ai",
];

const SEED_HINT =
  "This test account is not yet registered in your Supabase Auth table. Please switch to the 'Sign Up' tab once to create/sync its Auth password (e.g., using Patient@123), and it will instantly map to its pre-seeded clinical case data.";

function isSeeded(email: string) {
  return SEEDED_EMAILS.includes(email.trim().toLowerCase());
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function routeAfterAuth(userId: string, expectedRole?: Role) {
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle(),
    ]);

    const roleList = (roles ?? []).map((r) => r.role);

    if (roleList.length === 0 || !profile) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    if (expectedRole && !roleList.includes(expectedRole)) {
      await supabase.auth.signOut();
      setError(
        expectedRole === "doctor"
          ? "This account is not registered as a doctor. Try the Patient tab instead."
          : "This account is not registered as a patient. Try the Doctor tab instead.",
      );
      return;
    }

    navigate({ to: "/", replace: true });
  }

  async function handleSignIn() {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      const invalid = /invalid login credentials/i.test(signInError?.message ?? "");
      if (invalid && isSeeded(email)) {
        setNotice(SEED_HINT);
        toast.info("Test account needs a one-time sign up", { description: SEED_HINT });
      } else {
        setError("Those login details didn't work. Please check the email and password.");
      }
      return;
    }

    await routeAfterAuth(data.user.id, role);
  }

  async function handleSignUp() {
    const cleanEmail = email.trim();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: displayName.trim() || cleanEmail },
      },
    });

    if (signUpError) {
      if (/already registered|already been registered|user already exists/i.test(signUpError.message)) {
        const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signedIn?.user && !signInError) {
          toast.success("Welcome back — this account already existed, so we signed you in.");
          await routeAfterAuth(signedIn.user.id);
          return;
        }
        setError(
          "This email already has an account, but that password doesn't match it. Try signing in with the correct password.",
        );
        return;
      }
      setError(signUpError.message);
      return;
    }

    if (data.session && data.user) {
      toast.success("Account created. Let's set up your profile.");
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    const { data: signedIn } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signedIn?.user) {
      toast.success("Account created. Let's set up your profile.");
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    setNotice("Account created. Please check your email to confirm it, then sign in.");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") await handleSignIn();
      else await handleSignUp();
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 rounded-xl bg-background/70 pl-10 placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

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

        {/* Sign In / Sign Up tabs */}
        <div
          role="tablist"
          aria-label="Sign in or sign up"
          className="mt-8 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/80 p-1"
        >
          {(["signin", "signup"] as Mode[]).map((m) => (
            <Button
              key={m}
              type="button"
              role="tab"
              id={`tab-${m}`}
              aria-selected={mode === m}
              aria-controls="auth-panel"
              variant="ghost"
              onClick={() => switchMode(m)}
              className={`h-11 rounded-lg text-xs font-semibold transition-all duration-200 sm:text-sm ${
                mode === m
                  ? "bg-card text-foreground shadow-sm hover:bg-card"
                  : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
              }`}
            >
              {m === "signin" ? <ShieldCheck /> : <UserPlus />}
              {m === "signin" ? "Sign In" : "Sign Up"}
            </Button>
          ))}
        </div>

        <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
          {mode === "signin" ? (
            <div
              className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/60 p-1"
              aria-label="Choose account type"
            >
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
                  className={`h-10 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    role === r
                      ? "bg-card text-foreground shadow-sm hover:bg-card"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                  }`}
                >
                  {r === "patient" ? <HeartPulse /> : <Stethoscope />}
                  {r === "patient" ? "Patient" : "Doctor"}
                </Button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground">
                  User ID / Name
                </Label>
                <div className="group relative">
                  <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="displayName"
                    required
                    autoComplete="name"
                    placeholder="How should we address you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
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
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="group relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={mode === "signin" ? "Enter your password" : "Create a password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}

            {notice ? (
              <div
                role="status"
                className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground"
              >
                {notice}
                {mode === "signin" ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 pl-1 text-sm font-semibold"
                    onClick={() => switchMode("signup")}
                  >
                    Go to Sign Up
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {loading ? <LoaderCircle className="animate-spin" /> : mode === "signin" ? <ShieldCheck /> : <UserPlus />}
              {loading
                ? mode === "signin"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "signin"
                  ? "Sign In"
                  : "Create account"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "signin" ? "New to TechCare AI? " : "Already have an account? "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs font-semibold"
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Create one now" : "Sign in instead"}
              </Button>
            </p>
          </form>
        </div>

        <div className="mt-7 flex items-center justify-center gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Protected health workspace
        </div>
      </div>
    </main>
  );
}
