import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase-server";

type ReportRow = {
  id: string;
  created_at: string;
  risk_score: number | null;
  plan: string;
  profile: {
    branch?: string;
  } | null;
};

const riskTone = (score: number) => {
  if (score < 40) return "good";
  if (score < 70) return "warn";
  return "bad";
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data, error } = await supabase
    .from("reports")
    .select("id,created_at,risk_score,plan,profile")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="page">
        <main className="container">
          <div className="card">
            <h1>Dashboard unavailable</h1>
            <p className="error">{error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  const reports = (data ?? []) as ReportRow[];

  return (
    <div className="page">
      <main className="container">
        <section className="section">
          <p className="hero-eyebrow">Dashboard</p>
          <h1>Your Saved Reports</h1>
          <p>Track your roadmap history, risk trend, and unlock status.</p>
        </section>

        <section className="section" style={{ paddingTop: "0" }}>
          {reports.length === 0 ? (
            <div className="card">
              <h2>No reports yet</h2>
              <p className="helper">Generate your first report to start your history timeline.</p>
              <div className="hero-actions">
                <Link href="/intake" className="button primary">
                  Start Intake
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {reports.map((report) => {
                const riskScore = report.risk_score ?? 0;
                const tone = riskTone(riskScore);
                const planLabel = report.plan === "free" ? "Free" : report.plan;

                return (
                  <article key={report.id} className="card" style={{ display: "grid", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                      <strong>{new Date(report.created_at).toLocaleString()}</strong>
                      <span className={`risk-badge ${tone}`}>Risk Score {riskScore}</span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span className="tag">Branch: {report.profile?.branch || "Unknown"}</span>
                      <span className="tag selected">Plan: {planLabel}</span>
                    </div>

                    <div className="hero-actions" style={{ marginTop: "4px" }}>
                      <Link href={`/report?reportId=${report.id}`} className="button primary">
                        View Report
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
