import { createFileRoute } from "@tanstack/react-router";

const PAIRS = [
  {
    patient: { email: "patient1@techcare.ai", password: "Patient@123", name: "Patient One" },
    doctor: { email: "doctor1@techcare.ai", password: "Doctor@123", name: "Dr. Anita Rao" },
  },
  {
    patient: { email: "patient2@techcare.ai", password: "Patient@456", name: "Patient Two" },
    doctor: { email: "doctor2@techcare.ai", password: "Doctor@456", name: "Dr. Vikram Shah" },
  },
  {
    patient: { email: "patient3@techcare.ai", password: "Patient@789", name: "Patient Three" },
    doctor: { email: "doctor3@techcare.ai", password: "Doctor@789", name: "Dr. Meera Nair" },
  },
];

export const Route = createFileRoute("/api/public/seed-accounts")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: string[] = [];
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });

        async function ensure(
          acct: { email: string; password: string; name: string },
          role: "doctor" | "patient",
        ): Promise<string | null> {
          let user = list?.users.find((u) => u.email === acct.email) ?? null;
          if (!user) {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: acct.email,
              password: acct.password,
              email_confirm: true,
              user_metadata: { full_name: acct.name },
            });
            if (error) {
              results.push(`${acct.email}: ${error.message}`);
              return null;
            }
            user = data.user;
          } else {
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              password: acct.password,
              email_confirm: true,
            });
          }
          if (!user) return null;
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
          await supabaseAdmin
            .from("profiles")
            .upsert(
              { user_id: user.id, full_name: acct.name, email: acct.email },
              { onConflict: "user_id" },
            );
          results.push(`${acct.email}: ok`);
          return user.id;
        }

        for (const pair of PAIRS) {
          const patientId = await ensure(pair.patient, "patient");
          const doctorId = await ensure(pair.doctor, "doctor");
          if (!patientId || !doctorId) continue;
          await supabaseAdmin
            .from("care_assignments")
            .upsert({ patient_id: patientId, doctor_id: doctorId }, { onConflict: "patient_id" });
          results.push(`${pair.patient.email} <-> ${pair.doctor.email}: assigned`);
        }

        return Response.json({ results });
      },
    },
  },
});
