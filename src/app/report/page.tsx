"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import toast from "react-hot-toast";
import AnimatedNumber from "@/components/AnimatedNumber";
import RiskBreakdownChart from "@/components/RiskBreakdownChart";
import RiskImpactGraph from "@/components/RiskImpactGraph";
import { trackEvent } from "@/lib/analytics";
import { startPayment } from "@/lib/payments";
import { sampleReport } from "@/lib/reportDefaults";
import type { FormPayload, ReportData, WeekPlanItem } from "@/lib/types";

const getRiskTone = (score: number) => {
  if (score < 40) return "good";
  if (score < 70) return "warn";
  return "bad";
};

const deadSkillContext = (skill: string) => {
  const normalized = skill.toLowerCase();

  if (normalized.includes("java")) {
    return "Java is still active in enterprise hiring. Risk is in junior CRUD-only tracks. Ongoing demand: Spring Boot microservices, distributed systems, Kafka, and cloud-native backend work.";
  }

  if (normalized.includes("sql")) {
    return "SQL remains valuable. Risk is in query-only work without analytics depth, automation, or business impact ownership.";
  }

  return "Demand for this exact profile is weakening. Reposition into higher-leverage execution before the next hiring cycle.";
};

const reportUnlockKeyFor = (reportId: string) => `pathpilot_unlock_report_full_${reportId}`;

const weekTitle = (weekItem: WeekPlanItem) =>
  weekItem.title && weekItem.title.trim().length > 0 ? weekItem.title : "Execution Plan";

const weekFocus = (weekItem: WeekPlanItem) =>
  weekItem.focus && weekItem.focus.trim().length > 0 ? weekItem.focus : weekItem.action;

const weekTasks = (weekItem: WeekPlanItem) =>
  Array.isArray(weekItem.tasks) && weekItem.tasks.length > 0 ? weekItem.tasks : [weekItem.action];

const weekDeliverable = (weekItem: WeekPlanItem) =>
  weekItem.deliverable && weekItem.deliverable.trim().length > 0
    ? weekItem.deliverable
    : "Ship a concrete output and publish proof of work for this week.";

const weekReview = (weekItem: WeekPlanItem) =>
  weekItem.weekly_report && weekItem.weekly_report.trim().length > 0
    ? weekItem.weekly_report
    : "Review progress, blockers, and what to improve next week.";

const weekSignal = (weekItem: WeekPlanItem) =>
  weekItem.market_signal && weekItem.market_signal.trim().length > 0
    ? weekItem.market_signal
    : "Monitor current hiring discussions and adapt your execution focus.";

const weekDifferentiation = (weekItem: WeekPlanItem) =>
  weekItem.differentiation && weekItem.differentiation.trim().length > 0
    ? weekItem.differentiation
    : "Differentiate through measurable execution, not generic claims.";

const weekResources = (weekItem: WeekPlanItem) =>
  Array.isArray(weekItem.resources) && weekItem.resources.length > 0 ? weekItem.resources : [];

const normalizeProfile = (raw: Partial<FormPayload>): FormPayload => ({
  branch: raw.branch ?? "",
  year: raw.year ?? "",
  tier: raw.tier ?? "",
  skills: Array.isArray(raw.skills) ? raw.skills : [],
  goal: raw.goal ?? "",
  city: raw.city ?? "",
  timeline: raw.timeline ?? "",
  email: raw.email ?? "student@pathpilot.local",
  projectsCount: typeof raw.projectsCount === "number" ? raw.projectsCount : 0,
  projectDomain: typeof raw.projectDomain === "string" ? raw.projectDomain : "",
  projectProblem: typeof raw.projectProblem === "string" ? raw.projectProblem : "",
});

export default function ReportPage() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [hasLiveReport, setHasLiveReport] = useState(false);
  const [isRoadmapUnlocked, setIsRoadmapUnlocked] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [profile, setProfile] = useState<FormPayload | null>(null);
  const [isRefreshingRoadmap, setIsRefreshingRoadmap] = useState(false);

  const refreshUnlockedReport = async (payload: FormPayload, token: string) => {
    setIsRefreshingRoadmap(true);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, unlockToken: token }),
      });

      const payloadData = (await response.json()) as {
        success: boolean;
        data?: {
          report: ReportData;
          reportId: string;
        };
        error?: string;
      };

      if (!response.ok || !payloadData.success || !payloadData.data) {
        throw new Error(payloadData.error || "Failed to refresh unlocked roadmap");
      }

      setReport(payloadData.data.report);
      setReportId(payloadData.data.reportId);
      setHasLiveReport(true);
      sessionStorage.setItem("pathpilot_report", JSON.stringify(payloadData.data.report));
      sessionStorage.setItem("pathpilot_report_id", payloadData.data.reportId);
      localStorage.setItem(reportUnlockKeyFor(payloadData.data.reportId), token);
    } catch {
      setPaymentMessage("Roadmap unlocked, but refreshing full report failed. Please regenerate from intake.");
    } finally {
      setIsRefreshingRoadmap(false);
    }
  };

  useEffect(() => {
    const queryReportId = searchParams.get("reportId");

    const loadReportById = async (id: string) => {
      const response = await fetch(`/api/reports/${id}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          report: ReportData;
          reportId: string;
          profile?: Partial<FormPayload>;
        };
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Unable to load report");
      }

      setReport(payload.data.report);
      setReportId(payload.data.reportId);
      setHasLiveReport(true);
      sessionStorage.setItem("pathpilot_report", JSON.stringify(payload.data.report));
      sessionStorage.setItem("pathpilot_report_id", payload.data.reportId);

      if (payload.data.profile) {
        const parsedProfile = normalizeProfile(payload.data.profile);
        setProfile(parsedProfile);
        sessionStorage.setItem("pathpilot_profile", JSON.stringify(parsedProfile));
      }
    };

    if (queryReportId) {
      loadReportById(queryReportId).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unable to load selected saved report.";
        setPaymentMessage(message);
      });
    } else {
      const raw = sessionStorage.getItem("pathpilot_report");
      const storedReportId = sessionStorage.getItem("pathpilot_report_id");

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ReportData;
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setReport(parsed);
          setHasLiveReport(true);
        } catch {
          setHasLiveReport(false);
        }
      }

      if (storedReportId) {
        setReportId(storedReportId);
      }
    }

    const rawProfile = sessionStorage.getItem("pathpilot_profile");
    if (rawProfile) {
      try {
        const parsedProfile = normalizeProfile(JSON.parse(rawProfile) as Partial<FormPayload>);
        setProfile(parsedProfile);
      } catch {
        setProfile(null);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!reportId) return;

    const unlockedToken = localStorage.getItem(reportUnlockKeyFor(reportId));
    if (!unlockedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRoadmapUnlocked(false);
      return;
    }

    fetch("/api/payments/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: unlockedToken, plan: "full-roadmap-99" }),
    })
      .then((response) => response.json())
      .then((payload: { success?: boolean; data?: { unlocked?: boolean } }) => {
        if (payload.success && payload.data?.unlocked) {
          setIsRoadmapUnlocked(true);
        } else {
          localStorage.removeItem(reportUnlockKeyFor(reportId));
          setIsRoadmapUnlocked(false);
        }
      })
      .catch(() => {
        setIsRoadmapUnlocked(false);
      });
  }, [reportId]);

  const data = report ?? sampleReport;
  const tone = getRiskTone(data.risk_score);
  const riskBreakdown = Array.isArray(data.risk_breakdown) ? data.risk_breakdown : [];
  const freeWeeks = data.week_plan.slice(0, 2);
  const lockedWeeks = data.week_plan.slice(2);

  const ensurePersistedReportForPayment = async () => {
    if (!reportId) {
      throw new Error("Generate or load a report first before payment.");
    }

    if (!reportId.startsWith("local_")) {
      return reportId;
    }

    if (!profile) {
      throw new Error(
        "This preview report is not yet saved to your account. Generate a fresh report from intake, then retry payment."
      );
    }

    setPaymentMessage("Syncing your report to your account before checkout...");

    const response = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    const payload = (await response.json()) as {
      success: boolean;
      data?: {
        report: ReportData;
        reportId: string;
        persisted?: boolean;
        warning?: string;
      };
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error || "Failed to sync report before payment");
    }

    if (payload.data.persisted === false || payload.data.reportId.startsWith("local_")) {
      throw new Error(
        payload.data.warning || "Supabase schema is not initialized for saved reports yet."
      );
    }

    setReport(payload.data.report);
    setReportId(payload.data.reportId);
    setHasLiveReport(true);
    sessionStorage.setItem("pathpilot_report", JSON.stringify(payload.data.report));
    sessionStorage.setItem("pathpilot_report_id", payload.data.reportId);
    setPaymentMessage("Report synced. Opening payment...");

    return payload.data.reportId;
  };

  const openRoadmapPayment = async () => {
    let effectiveReportId: string;

    try {
      effectiveReportId = await ensurePersistedReportForPayment();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start payment";
      setPaymentMessage(message);
      toast.error(message);
      return;
    }

    startPayment({
      plan: "full-roadmap-99",
      reportId: effectiveReportId,
      name: "PathPilot User",
      email: profile?.email ?? "student@pathpilot.local",
      onSuccess: (result) => {
        localStorage.setItem(reportUnlockKeyFor(effectiveReportId), result.unlockToken);
        setIsRoadmapUnlocked(true);
        setPaymentMessage("Payment successful. Full roadmap unlocked.");
        trackEvent("payment_completed", { plan: "full-roadmap-99", reportId: effectiveReportId });
        toast.success("Full roadmap unlocked.");

        if (profile) {
          refreshUnlockedReport(profile, result.unlockToken);
        }
      },
      onError: (message) => {
        setPaymentMessage(message);
        toast.error(message);
      },
    });

    trackEvent("payment_started", { plan: "full-roadmap-99", reportId: effectiveReportId });
  };

  const openShadowYouPayment = async () => {
    let effectiveReportId: string;

    try {
      effectiveReportId = await ensurePersistedReportForPayment();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start payment";
      setPaymentMessage(message);
      toast.error(message);
      return;
    }

    startPayment({
      plan: "shadow-you",
      reportId: effectiveReportId,
      name: "PathPilot User",
      email: profile?.email ?? "student@pathpilot.local",
      onSuccess: () => {
        setPaymentMessage("Shadow You payment successful.");
        trackEvent("payment_completed", { plan: "shadow-you", reportId: effectiveReportId });
        toast.success("Shadow You unlocked.");
      },
      onError: (message) => {
        setPaymentMessage(message);
        toast.error(message);
      },
    });

    trackEvent("payment_started", { plan: "shadow-you", reportId: effectiveReportId });
  };

  const downloadWeeklyReportsJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      reportId,
      weeklyReports: data.week_plan,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pathpilot-weekly-reports.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!reportId) {
      setPaymentMessage("No report selected for PDF export.");
      return;
    }

    const token = localStorage.getItem(reportUnlockKeyFor(reportId));
    if (!token) {
      setPaymentMessage("Unlock full roadmap before downloading PDF.");
      return;
    }

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, token }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "PDF export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pathpilot-report-${reportId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF export failed";
      setPaymentMessage(message);
    }
  };

  const lockOverlay = (
    <div className="lock-overlay">
      <p>Premium insights hidden. Unlock full weekly execution reports and complete pivot guidance.</p>
      <button className="button primary" type="button" onClick={openRoadmapPayment}>
        Unlock Full Roadmap - INR 99
      </button>
    </div>
  );

  return (
    <div className="page">
      <main className="container">
        <section className="section hero-report">
          <p className="hero-eyebrow">Career Risk Intelligence</p>
          <h1>Your PathPilot Report</h1>
          <p>{hasLiveReport ? "Live analysis from your profile." : "Preview mode. Generate a live report from intake."}</p>
          {paymentMessage && <p className="helper" style={{ marginTop: "8px" }}>{paymentMessage}</p>}
        </section>

        <section className="section" style={{ paddingTop: "0" }}>
          <div className="grid-2">
            <div className="card reveal" style={{ "--delay": "0.03s" } as CSSProperties}>
              <p className="hero-eyebrow">Risk Score</p>
              <div className="risk-meter-row">
                <strong className={`risk-badge ${tone}`}>
                  <AnimatedNumber value={data.risk_score} /> / 100
                </strong>
              </div>
              <p className="helper">{data.risk_reason}</p>
            </div>

            <div className="card reveal" style={{ "--delay": "0.06s" } as CSSProperties}>
              <p className="hero-eyebrow">Safe Skills</p>
              <div className="tag-row">
                {data.safe_skills.map((skill) => (
                  <span key={skill} className="tag selected">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {riskBreakdown.length > 0 && (
          <section className="section" style={{ paddingTop: "0" }}>
            <div className="card reveal risk-breakdown-card" style={{ "--delay": "0.105s" } as CSSProperties}>
              <h2>Risk Breakdown Chart</h2>
              <p className="helper">
                Left bars reduce risk. Right bars increase risk. This explains exactly what is moving your score.
              </p>
              <RiskBreakdownChart items={riskBreakdown} />
              <RiskImpactGraph items={riskBreakdown} riskScore={data.risk_score} />
            </div>
          </section>
        )}

        {data.market_snapshot && data.market_snapshot.length > 0 && (
          <section className="section" style={{ paddingTop: "0" }}>
            <div className="card reveal" style={{ "--delay": "0.11s" } as CSSProperties}>
              <h2>Major Company Stack Moves (Live)</h2>
              <p className="helper">Major-company moves for your selected stack, with practical signals you can map to project decisions.</p>
              <ul className="analysis-list" style={{ marginTop: "12px" }}>
                {data.market_snapshot.map((item, index) => (
                  <li key={`market-snapshot-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="section" style={{ paddingTop: "0" }}>
          <Link className="card battle-banner liquid-glass-cta reveal" href="/battle" style={{ "--delay": "0.12s" } as CSSProperties}>
            <p className="battle-banner-text">
              <span>Think you beat your friends? Find out.</span>
              <strong>Challenge a Friend</strong>
            </p>
          </Link>
        </section>

        <section className="section">
          <h2>Dead Skills</h2>
          <div className="grid-3 section">
            {data.dead_skills.length === 0 && <div className="card subtle">No critical skills flagged yet.</div>}
            {data.dead_skills.map((skill, index) => (
              <div
                key={`${skill}-${index}`}
                className="card reveal danger"
                style={{ "--delay": `${0.12 + index * 0.05}s` } as CSSProperties}
              >
                <h3>{skill}</h3>
                <p>{deadSkillContext(skill)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Your Pivot</h2>
          <div className="grid-2 section">
            <div className="card reveal" style={{ "--delay": "0.15s" } as CSSProperties}>
              <p className="hero-eyebrow">Pivot Direction 1</p>
              <h3>{data.pivot_1.title}</h3>
              <p>{data.pivot_1.why}</p>
              <p className="helper">First move: {data.pivot_1.first_step}</p>
            </div>
            {isRoadmapUnlocked ? (
              <div className="card reveal" style={{ "--delay": "0.22s" } as CSSProperties}>
                <p className="hero-eyebrow">Pivot Direction 2</p>
                <h3>{data.pivot_2.title}</h3>
                <p>{data.pivot_2.why}</p>
                <p className="helper">First move: {data.pivot_2.first_step}</p>
              </div>
            ) : (
              <div className="lock-wrap reveal" style={{ "--delay": "0.22s" } as CSSProperties}>
                <div className="lock-blur">
                  <div className="card">
                    <p className="hero-eyebrow">Pivot Direction 2</p>
                    <h3>{data.pivot_2.title}</h3>
                    <p>{data.pivot_2.why}</p>
                    <p className="helper">First move: {data.pivot_2.first_step}</p>
                  </div>
                </div>
                {lockOverlay}
              </div>
            )}
          </div>
        </section>

        <section className="section">
          <h2>Weekly Execution Reports</h2>
          <div className="hero-actions" style={{ marginTop: "14px" }}>
            <button className="button ghost" type="button" onClick={downloadWeeklyReportsJson}>
              Download Weekly Reports JSON
            </button>
            {isRoadmapUnlocked && (
              <button className="button primary" type="button" onClick={downloadPdf}>
                Download PDF
              </button>
            )}
            {isRefreshingRoadmap && (
              <span className="helper" style={{ marginTop: "0" }}>
                Syncing full unlocked roadmap...
              </span>
            )}
          </div>
          <div className="section" style={{ display: "grid", gap: "12px" }}>
            {freeWeeks.map((weekItem, index) => (
              <details
                key={`week-${weekItem.week}`}
                className="accordion reveal"
                style={{ "--delay": `${0.2 + index * 0.02}s` } as CSSProperties}
              >
                <summary>Week {weekItem.week}: {weekTitle(weekItem)}</summary>
                <div className="week-panel">
                  <p className="week-detail"><strong>Focus:</strong> {weekFocus(weekItem)}</p>
                  <p className="week-detail"><strong>Main Action:</strong> {weekItem.action}</p>
                  <p className="week-detail"><strong>Tasks:</strong></p>
                  <ul className="week-task-list">
                    {weekTasks(weekItem).map((task, taskIndex) => (
                      <li key={`week-${weekItem.week}-task-${taskIndex}`}>{task}</li>
                    ))}
                  </ul>
                  <p className="week-detail"><strong>Deliverable:</strong> {weekDeliverable(weekItem)}</p>
                  <p className="week-detail"><strong>Weekly Report Check:</strong> {weekReview(weekItem)}</p>
                  <p className="week-detail"><strong>Market Signal:</strong> {weekSignal(weekItem)}</p>
                  <p className="week-detail"><strong>Differentiation:</strong> {weekDifferentiation(weekItem)}</p>
                  {weekResources(weekItem).length > 0 && (
                    <div>
                      <p className="week-detail"><strong>Resources:</strong></p>
                      <ul className="week-task-list">
                        {weekResources(weekItem).map((resource) => (
                          <li key={`${weekItem.week}-${resource}`}>
                            <a href={resource} target="_blank" rel="noopener noreferrer">
                              {resource}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
          {isRoadmapUnlocked ? (
            <div className="section" style={{ display: "grid", gap: "12px" }}>
              {lockedWeeks.map((weekItem) => (
                <details key={`week-${weekItem.week}`} className="accordion reveal">
                  <summary>Week {weekItem.week}: {weekTitle(weekItem)}</summary>
                  <div className="week-panel">
                    <p className="week-detail"><strong>Focus:</strong> {weekFocus(weekItem)}</p>
                    <p className="week-detail"><strong>Main Action:</strong> {weekItem.action}</p>
                    <p className="week-detail"><strong>Tasks:</strong></p>
                    <ul className="week-task-list">
                      {weekTasks(weekItem).map((task, taskIndex) => (
                        <li key={`week-${weekItem.week}-task-${taskIndex}`}>{task}</li>
                      ))}
                    </ul>
                    <p className="week-detail"><strong>Deliverable:</strong> {weekDeliverable(weekItem)}</p>
                    <p className="week-detail"><strong>Weekly Report Check:</strong> {weekReview(weekItem)}</p>
                    <p className="week-detail"><strong>Market Signal:</strong> {weekSignal(weekItem)}</p>
                    <p className="week-detail"><strong>Differentiation:</strong> {weekDifferentiation(weekItem)}</p>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="section lock-wrap reveal" style={{ "--delay": "0.28s" } as CSSProperties}>
              <div className="lock-blur" style={{ display: "grid", gap: "12px" }}>
                {lockedWeeks.map((weekItem) => (
                  <details key={`week-${weekItem.week}`} className="accordion">
                    <summary>Week {weekItem.week}: Premium Weekly Report</summary>
                    <p className="helper">
                      Unlock to view full tasks, deliverables, market signal interpretation, and differentiation strategy.
                    </p>
                  </details>
                ))}
              </div>
              {lockOverlay}
            </div>
          )}
        </section>

        <section className="section">
          <h2>Projects to Build</h2>
          {isRoadmapUnlocked ? (
            <div className="grid-3 section">
              {data.projects.map((project) => (
                <div key={project.name} className="card">
                  <h3>{project.name}</h3>
                  <p className="helper">Stack: {project.stack}</p>
                  <p>{project.why_it_matters}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="section lock-wrap reveal" style={{ "--delay": "0.2s" } as CSSProperties}>
              <div className="lock-blur grid-3">
                {data.projects.map((project) => (
                  <div key={project.name} className="card">
                    <h3>{project.name}</h3>
                    <p className="helper">Stack: {project.stack}</p>
                    <p>{project.why_it_matters}</p>
                  </div>
                ))}
              </div>
              {lockOverlay}
            </div>
          )}
        </section>

        <section className="section">
          <h2>Shadow You + Peer Benchmark</h2>
          <div className="grid-2 section">
            <div className="card">
              <h3>Shadow You Preview</h3>
              <p>Your live career twin tracks skill decay, hiring volatility, and peer benchmarks every month.</p>
              <div className="section">
                <div className="card subtle">
                  <h3>Career Health Score</h3>
                  <p className="helper">79 +6 this month</p>
                </div>
              </div>
              <button className="button primary" type="button" onClick={openShadowYouPayment}>
                Unlock Shadow You - INR 99/month
              </button>
            </div>
            <div className="card">
              <h3>Peer Benchmark</h3>
              <p>{data.peer_benchmark}</p>
              <div className="section">
                <h3>Communities to join</h3>
                <div className="tag-row">
                  {data.communities.map((community) => (
                    <span key={community} className="tag">
                      {community}
                    </span>
                  ))}
                </div>
              </div>
              <button className="button ghost" type="button" onClick={openRoadmapPayment}>
                Unlock Full Report - INR 99
              </button>
            </div>
          </div>
        </section>

        <section className="section">
          <Link className="button ghost" href="/intake">
            Generate Another Report
          </Link>
        </section>
      </main>
    </div>
  );
}
