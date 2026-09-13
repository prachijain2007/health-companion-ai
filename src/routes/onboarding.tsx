import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { HeartPulse, LoaderCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

type Role = "patient" | "doctor";

function generateMedicalId(role: Role) {
  const prefix = role === "doctor" ? "TC-DOC" : "TC-PAT";
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("patient");
  const [fullName, setFullName] = useState("");
  const [medicalId, setMedicalId] = useState("");
  const [dob, setDob] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [history, setHistory] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function ageFromDob(value: string): number | null {
    if (!value) return null;
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1;
    return years >= 0 && years < 130 ? years : null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roleList = (existingRoles ?? []).map((r) => r.role);
      const effectiveRole: Role =
        roleList.includes("doctor") ? "doctor" : roleList.includes("patient") ? "patient" : role;

      if (roleList.length === 0) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: effectiveRole });
        if (roleError) {
          setError("We couldn't save your role. Please try again.");
          return;
        }
      }

      const finalMedicalId = medicalId.trim() || generateMedicalId(effectiveRole);
      const derivedAge = ageFromDob(dob);

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          full_name: fullName.trim(),
          email: user.email ?? null,
          age: derivedAge,
          date_of_birth: dob || null,
          medical_id: finalMedicalId,
          specialization: effectiveRole === "doctor" ? specialization.trim() || null : null,
          gender: gender.trim() || null,
          phone: phone.trim() || null,
          blood_group: bloodGroup.trim() || null,
          allergies: allergies.trim() || null,
          medical_history: history.trim() || null,
          onboarding_completed: true,
        },
        { onConflict: "user_id" },
      );

      if (profileError) {
        setError("We couldn't save your details. Please try again.");
        return;
      }

      if (effectiveRole === "patient") {
        const { data: existing } = await supabase
          .from("patient_cases")
          .select("id")
          .eq("patient_id", user.id)
          .limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from("patient_cases").insert({
            created_by: user.id,
            patient_id: user.id,
            patient_name: fullName.trim() || (user.email ?? "New patient"),
            age: derivedAge,
            gender: gender.trim() || null,
            symptoms: symptoms.trim() || null,
            source: "onboarding",
          });
        }
      }

      toast.success(
        effectiveRole === "doctor"
          ? "Profile saved. Opening your doctor dashboard."
          : "Profile saved. Opening your patient dashboard.",
      );
      navigate({ to: "/", replace: true });
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "h-12 rounded-xl bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

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
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-foreground">I am joining as</legend>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/70 p-1">
              {(["patient", "doctor"] as Role[]).map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant="ghost"
                  aria-pressed={role === r}
                  onClick={() => setRole(r)}
                  className={`h-11 rounded-lg text-xs font-semibold transition-all duration-200 sm:text-sm ${
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
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Full name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className={fieldClass}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="medicalId" className="text-foreground">
                {role === "doctor" ? "License number" : "Medical ID"}
              </Label>
              <Input
                id="medicalId"
                value={medicalId}
                onChange={(e) => setMedicalId(e.target.value)}
                placeholder="Leave blank to generate one"
                className={fieldClass}
              />
              <p className="text-xs text-muted-foreground">
                We'll create an ID automatically if you leave this empty.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-foreground">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {role === "doctor" ? (
            <div className="space-y-2">
              <Label htmlFor="specialization" className="text-foreground">Specialization</Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Cardiology"
                className={fieldClass}
              />
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-foreground">Gender</Label>
              <Input
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="e.g. Female"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contact number"
                className={fieldClass}
              />
            </div>
          </div>

          {role === "patient" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup" className="text-foreground">Blood group</Label>
                <Input
                  id="bloodGroup"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g. O+"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies" className="text-foreground">Allergies</Label>
                <Input
                  id="allergies"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Known allergies, if any"
                  className={fieldClass}
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
            </>
          ) : null}

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
            {saving ? "Saving…" : "Save and open my dashboard"}
          </Button>
        </form>
      </div>
    </main>
  );
}
