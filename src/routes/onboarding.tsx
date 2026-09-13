import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { HeartPulse, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "Profile Setup — TECHCARE AI" },
      {
        name: "description",
        content: "Set up your TECHCARE AI health profile so your care team sees the right details.",
      },
      { property: "og:title", content: "Profile Setup — TECHCARE AI" },
      {
        property: "og:description",
        content: "Set up your TECHCARE AI health profile so your care team sees the right details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [history, setHistory] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }

    const parsedAge = age.trim() ? Number(age) : null;

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: fullName.trim(),
        email: user.email ?? null,
        age: Number.isFinite(parsedAge as number) ? parsedAge : null,
        gender: gender.trim() || null,
        phone: phone.trim() || null,
        blood_group: bloodGroup.trim() || null,
        allergies: allergies.trim() || null,
        medical_history: history.trim() || null,
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      setSaving(false);
      setError("We couldn't save your details. Please try again.");
      return;
    }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isPatient = (roles ?? []).some((r) => r.role === "patient");

    if (isPatient) {
      const { data: existing } = await supabase.from("patient_cases").select("id").limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("patient_cases").insert({
          created_by: user.id,
          patient_id: user.id,
          patient_name: fullName.trim() || (user.email ?? "New patient"),
          age: Number.isFinite(parsedAge as number) ? parsedAge : null,
          gender: gender.trim() || null,
          symptoms: symptoms.trim() || null,
          source: "onboarding",
        });
      }
    }

    setSaving(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--login-gradient)] px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="login-grid absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-[560px] rounded-2xl border border-card/70 bg-card/75 p-6 shadow-[var(--shadow-login)] backdrop-blur-xl sm:p-9">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-brand)]">
            <HeartPulse className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Complete your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            These details stay private to you and your assigned care team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Full name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="h-12 rounded-xl bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="age" className="text-foreground">Age</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="130"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 34"
                className="h-12 rounded-xl bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-foreground">Gender</Label>
              <Input
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="e.g. Female"
                className="h-12 rounded-xl bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contact number"
                className="h-12 rounded-xl bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodGroup" className="text-foreground">Blood group</Label>
              <Input
                id="bloodGroup"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. O+"
                className="h-12 rounded-xl bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies" className="text-foreground">Allergies</Label>
            <Input
              id="allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Known allergies, if any"
              className="h-12 rounded-xl bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="history" className="text-foreground">Medical history</Label>
            <textarea
              id="history"
              rows={3}
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              placeholder="Past conditions, surgeries or ongoing medication"
              className="w-full rounded-xl border border-input bg-background/70 px-3.5 py-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symptoms" className="text-foreground">Current symptoms (optional)</Label>
            <textarea
              id="symptoms"
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="What brings you in today?"
              className="w-full rounded-xl border border-input bg-background/70 px-3.5 py-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          {error ? (
            <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
            {saving ? "Saving…" : "Save and continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
