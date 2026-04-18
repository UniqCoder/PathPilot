"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import RiskBreakdownChart from "@/components/RiskBreakdownChart";
import RiskImpactGraph from "@/components/RiskImpactGraph";
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

const reportUnlockKey = "pathpilot_unlock_report_full";

const weekTitle = (weekItem: WeekPlanItem) =>
  weekItem.title && weekItem.title.trim().length > 0
    ? weekItem.title
    : `Execution Plan`;

const weekFocus = (weekItem: WeekPlanItem) =>
  weekItem.focus && weekItem.focus.trim().length > 0
    ? weekItem.focus
    : weekItem.action;

const weekTasks = (weekItem: WeekPlanItem) =>
  Array.isArray(weekItem.tasks) && weekItem.tasks.length > 0
    ? weekItem.tasks
    : [weekItem.action];

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
  Array.isArray(weekItem.resources) && weekItem.resources.length > 0
    ? weekItem.resources
    : [];

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
  const [report, setReport] = useState<ReportData | null>(null);
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

      if (!response.ok) {
        throw new Error("Failed to refresh unlocked roadmap");
      }

      const updatedReport = (await response.json()) as ReportData;
      setReport(updatedReport);
      setHasLiveReport(true);
      sessionStorage.setItem("pathpilot_report", JSON.stringify(updatedReport));
    } catch (error) {
      setPaymentMessage("Roadmap unlocked, but refreshing full report failed. Please regenerate from intake.");
    } finally {
      setIsRefreshingRoadmap(false);
    }
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("pathpilot_report");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ReportData;
        setReport(parsed);
        setHasLiveReport(true);
      } catch (error) {
        setHasLiveReport(false);
      }
    }

    const unlocked = sessionStorage.getItem(reportUnlockKey);
    if (unlocked) {
      fetch("/api/payments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unlocked, plan: "full-roadmap-99" }),
      })
        .then((response) => response.json())
        .then((result: { unlocked?: boolean }) => {
          if (result.unlocked) {
            setIsRoadmapUnlocked(true);

            const rawProfile = sessionStorage.getItem("pathpilot_profile");
            if (rawProfile) {
              try {
                const parsedProfile = normalizeProfile(JSON.parse(rawProfile) as Partial<FormPayload>);
                setProfile(parsedProfile);
                refreshUnlockedReport(parsedProfile, unlocked);
              } catch (error) {
                setPaymentMessage("Roadmap unlocked. Regenerate report from intake to load full weekly details.");
              }
            }
          } else {
            sessionStorage.removeItem(reportUnlockKey);
            setIsRoadmapUnlocked(false);
          }
        })
        .catch(() => {
          setIsRoadmapUnlocked(false);
        });
    }

    const rawProfile = sessionStorage.getItem("pathpilot_profile");
    if (rawProfile) {
      try {
        const parsedProfile = normalizeProfile(JSON.parse(rawProfile) as Partial<FormPayload>);
        setProfile(parsedProfile);
      } catch (error) {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  }, []);

  const data = report ?? sampleReport;
  const tone = getRiskTone(data.risk_score);
  const riskBreakdown = Array.isArray(data.risk_breakdown) ? data.risk_breakdown : [];
  const freeWeeks = data.week_plan.slice(0, 2);
  const lockedWeeks = data.week_plan.slice(2);

  const openRoadmapPayment = () => {
    startPayment({
      plan: "full-roadmap-99",
      name: "PathPilot User",
      email: profile?.email ?? "student@pathpilot.local",
      onSuccess: (result) => {
        sessionStorage.setItem(reportUnlockKey, result.unlockToken);
        setIsRoadmapUnlocked(true);
        setPaymentMessage("Payment successful. Full roadmap unlocked.");

        if (profile) {
          refreshUnlockedReport(profile, result.unlockToken);
        }
      },
      onError: (message) => {
        setPaymentMessage(message);
      },
    });
  };

  const openShadowYouPayment = () => {
    startPayment({
      plan: "shadow-you-99-month",
      name: "PathPilot User",
      email: profile?.email ?? "student@pathpilot.local",
      onSuccess: () => {
        setPaymentMessage("Shadow You payment successful.");
      },
      onError: (message) => {
        setPaymentMessage(message);
      },
    });
  };

  const downloadWeeklyReportsJson = () => {
    const weeksToExport = isRoadmapUnlocked ? data.week_plan : freeWeeks;
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      tier: isRoadmapUnlocked ? "full-roadmap" : "free",
      profile: profile
        ? {
            branch: profile.branch,
            year: profile.year,
            tier: profile.tier,
            goal: profile.goal,
            city: profile.city,
            timeline: profile.timeline,
            skills: profile.skills,
            projectsCount: profile.projectsCount,
            projectDomain: profile.projectDomain,
            projectProblem: profile.projectProblem,
          }
        : null,
      risk_score: data.risk_score,
      risk_reason: data.risk_reason,
      weekly_reports: weeksToExport,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = isRoadmapUnlocked
      ? "pathpilot-weekly-reports-full.json"
      : "pathpilot-weekly-reports-free.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const lockOverlay = (
    <div className="lock-overlay">
      <div className="lock-card">
        <p className="lock-title">🔒 Unlock Full Roadmap — ₹99 one time</p>
        <p className="helper">
          You are just 10 weeks away from full weekly reports, advanced tasks, and project strategy.
        </p>
        <button className="button primary lock-button" type="button" onClick={openRoadmapPayment}>
          Unlock Full Roadmap
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <main className="container">
        <div className="reveal" style={{ "--delay": "0s" } as CSSProperties}>
          <p className="hero-eyebrow">PathPilot Report</p>
          <h1>Your 90-Day Survival Roadmap</h1>
          {!hasLiveReport && (
            <p className="helper">
              This is a sample report. Fill the intake form to generate your own.
            </p>
          )}
          {paymentMessage && <p className="helper payment-message">{paymentMessage}</p>}
        </div>

        <section className="section">
          <div className="card reveal" style={{ "--delay": "0.1s" } as CSSProperties}>
            <div className="risk-counter">
              <AnimatedNumber value={data.risk_score} startFrom={0} className="risk-number" />
              <span className={`risk-badge ${tone}`}>Career Risk Score</span>
            </div>
            <p>{data.risk_reason}</p>
            <div className="tag-row section">
              {data.safe_skills.map((skill) => (
                <span key={skill} className="tag selected">
                  {skill}
                </span>
              ))}
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
              <strong>⚔️ Challenge a Friend</strong>
            </p>
          </Link>
        </section>

        <section className="section">
          <h2>Dead Skills</h2>
          <div className="grid-3 section">
            {data.dead_skills.length === 0 && (
              <div className="card subtle">No critical skills flagged yet.</div>
            )}
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
            <div
              className="card reveal"
              style={{ "--delay": "0.15s" } as CSSProperties}
            >
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
              <div
                className="lock-wrap reveal"
                style={{ "--delay": "0.22s" } as CSSProperties}
              >
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
          {isRoadmapUnlocked ? (
            <div className="grid-2 section">
              <div className="card">
                <h3>Shadow You Preview</h3>
                <p>
                  Your live career twin tracks skill decay, hiring volatility, and peer
                  benchmarks every month.
                </p>
                <div className="section">
                  <div className="card subtle">
                    <h3>Career Health Score</h3>
                    <p className="helper">79 ▲ +6 this month</p>
                  </div>
                </div>
                <button className="button primary" type="button" onClick={openShadowYouPayment}>
                  Unlock Shadow You — ₹99/month
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
                  Download PDF — ₹99 via Razorpay
                </button>
              </div>
            </div>
          ) : (
            <div className="section lock-wrap reveal" style={{ "--delay": "0.25s" } as CSSProperties}>
              <div className="lock-blur grid-2">
                <div className="card">
                  <h3>Shadow You Preview</h3>
                  <p>
                    Your live career twin tracks skill decay, hiring volatility, and peer
                    benchmarks every month.
                  </p>
                  <div className="section">
                    <div className="card subtle">
                      <h3>Career Health Score</h3>
                      <p className="helper">79 ▲ +6 this month</p>
                    </div>
                  </div>
                  <button className="button primary" type="button" onClick={openShadowYouPayment}>
                    Unlock Shadow You — ₹99/month
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
                    Download PDF — ₹99 via Razorpay
                  </button>
                </div>
              </div>
              {lockOverlay}
            </div>
          )}
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
