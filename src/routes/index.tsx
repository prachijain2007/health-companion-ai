import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "TECHCARE AI — Clinical Patient Care & Instant Help" },
      {
        name: "description",
        content:
          "TECHCARE AI: AI-assisted patient intake, clinical case review, doctor matching and instant emergency first-aid guidance.",
      },
      { property: "og:title", content: "TECHCARE AI — Clinical Patient Care & Instant Help" },
      {
        property: "og:description",
        content:
          "AI-assisted patient intake, clinical review, doctor matching and instant first-aid guidance for emergencies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function sendSession() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const frame = frameRef.current;
      if (!session || !frame?.contentWindow) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const role = roles?.find((item) => item.role === "doctor" || item.role === "patient")?.role;
      frame.contentWindow.postMessage(
        {
          type: "techcare-session",
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          user_id: session.user.id,
          email: session.user.email,
          role,
          supabaseUrl: import.meta.env["VITE_SUPABASE_URL"],
          supabaseKey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
        },
        window.location.origin,
      );
    }

    async function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string };
      if (data?.type === "techcare-ready") void sendSession();
      if (data?.type === "techcare-signout") {
        await supabase.auth.signOut();
        navigate({ to: "/login", replace: true });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  return (
    <iframe
      ref={frameRef}
      src="/techcare.html"
      title="TECHCARE AI clinical workspace"
      className="fixed inset-0 h-full w-full border-0"
    />
  );
}
