"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function SiteHeader() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="logo-gradient" href="/">
          PATHPILOT
        </Link>

        {email ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "0.82rem", color: "rgba(245, 245, 255, 0.78)" }}>{email}</span>
            <Link className="nav-pill-cta" href="/dashboard">
              Dashboard
            </Link>
            <Link className="nav-pill-cta" href="/intake">
              New Report
            </Link>
            <button className="nav-pill-cta" type="button" onClick={signOut}>
              Sign Out
            </button>
          </div>
        ) : (
          <Link className="nav-pill-cta" href="/auth">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
