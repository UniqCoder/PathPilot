"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import { startPayment } from "@/lib/payments";
import type { BattleProfile, BattleRoom, ReportData } from "@/lib/types";

const riskTone = (score: number) => {
  if (score < 40) return "good";
  if (score < 70) return "warn";
  return "bad";
};

const drawShareCard = (room: BattleRoom) => {
  if (!room.playerOneReport || !room.playerTwoReport || !room.winnerStatement || !room.playerTwo) {
    return;
  }

  const playerTwo = room.playerTwo;

  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#0D1117");
  grad.addColorStop(1, "#1A1A2E");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(233, 69, 96, 0.18)";
  ctx.beginPath();
  ctx.arc(980, 120, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#F3F4F7";
  ctx.font = "700 54px Sora, sans-serif";
  ctx.fillText("PathPilot Battle Mode", 68, 96);

  ctx.font = "600 30px Space Grotesk, sans-serif";
  ctx.fillStyle = "#A2ACC2";
  ctx.fillText(`${room.playerOne.name} vs ${playerTwo.name}`, 68, 146);

  ctx.fillStyle = "#FF6B85";
  ctx.font = "700 118px Sora, sans-serif";
  ctx.fillText(String(room.playerOneReport.risk_score), 110, 400);
  ctx.fillText(String(room.playerTwoReport.risk_score), 820, 400);

  ctx.fillStyle = "#E94560";
  ctx.font = "700 64px Space Grotesk, sans-serif";
  ctx.fillText("⚔️", 560, 310);

  ctx.fillStyle = "#F3F4F7";
  ctx.font = "700 40px Space Grotesk, sans-serif";
  ctx.fillText(room.playerOne.name, 96, 260);
  ctx.fillText(playerTwo.name, 776, 260);

  ctx.font = "500 24px Space Grotesk, sans-serif";
  ctx.fillStyle = "#A2ACC2";
  ctx.fillText("RISK SCORE", 112, 438);
  ctx.fillText("RISK SCORE", 826, 438);

  ctx.fillStyle = "#E94560";
  ctx.font = "700 34px Space Grotesk, sans-serif";
  ctx.fillText(room.winnerStatement, 68, 540);

  ctx.globalAlpha = 0.32;
  ctx.fillStyle = "#F3F4F7";
  ctx.font = "700 42px Sora, sans-serif";
  ctx.fillText("PATHPILOT", 926, 592);

  const link = document.createElement("a");
  link.download = `pathpilot-battle-${room.id}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

const profileEmail = (profile: BattleProfile) =>
  `${profile.name.trim().toLowerCase().replace(/\s+/g, ".") || "student"}@pathpilot.local`;

const topItems = (items: string[], max = 3) => items.filter(Boolean).slice(0, max);

export default function BattleResultByIdPage() {
  const params = useParams<{ battleId: string }>();
  const searchParams = useSearchParams();
  const viewer = searchParams.get("viewer") === "friend" ? "friend" : "you";
  const battleId = params.battleId;

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [isBattleUnlocked, setIsBattleUnlocked] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const unlockKey = `pathpilot_unlock_battle_report_${battleId}`;

  useEffect(() => {
    let disposed = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const schedulePoll = (delayMs: number) => {
      if (disposed) return;
      pollTimer = setTimeout(() => {
        void fetchRoom();
      }, delayMs);
    };

    const fetchRoom = async () => {
      if (disposed) return;

      if (document.hidden) {
        schedulePoll(9000);
        return;
      }

      try {
        const response = await fetch(`/api/battle/${battleId}`, { cache: "no-store" });
        if (!response.ok) {
          schedulePoll(7000);
          return;
        }

        const payload = (await response.json()) as BattleRoom;
        setRoom(payload);

        if (payload.status !== "completed") {
          schedulePoll(4500);
        }
      } catch (error) {
        // Keep last known room data to avoid UI flicker on transient network errors.
        schedulePoll(7000);
      }
    };

    const handleVisibility = () => {
      if (disposed || document.hidden) return;
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      void fetchRoom();
    };

    void fetchRoom();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [battleId]);

  useEffect(() => {
    const token = sessionStorage.getItem(unlockKey);
    if (!token) return;

    fetch("/api/payments/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, plan: "battle-report-49" }),
    })
      .then((response) => response.json())
      .then((result: { unlocked?: boolean }) => {
        if (result.unlocked) {
          setIsBattleUnlocked(true);
        } else {
          sessionStorage.removeItem(unlockKey);
          setIsBattleUnlocked(false);
        }
      })
      .catch(() => {
        setIsBattleUnlocked(false);
      });
  }, [unlockKey]);

  const viewerData = useMemo(() => {
    if (!room?.playerOneReport || !room.playerTwoReport || !room.playerTwo) {
      return null;
    }

    if (viewer === "friend") {
      return {
        me: room.playerTwo,
        meReport: room.playerTwoReport,
        other: room.playerOne,
        otherReport: room.playerOneReport,
      };
    }

    return {
      me: room.playerOne,
      meReport: room.playerOneReport,
      other: room.playerTwo,
      otherReport: room.playerTwoReport,
    };
  }, [room, viewer]);

  if (!room) {
    return (
      <div className="page">
        <main className="container">
          <div className="card">
            <h1>Loading battle board...</h1>
            <p className="helper">Syncing battle data.</p>
          </div>
        </main>
      </div>
    );
  }

  if (room.status !== "completed" || !room.playerTwoReport || !room.playerOneReport || !room.playerTwo) {
    return (
      <div className="page">
        <main className="container">
          <div className="battle-loading card">
            <p className="hero-eyebrow">Battle Live</p>
            <h1>Waiting for both players to complete profiles...</h1>
            <p className="helper">Once Player 2 submits details, reports and final winner will appear here.</p>
          </div>
        </main>
      </div>
    );
  }

  const unlockBattleReport = () => {
    if (!viewerData) return;

    startPayment({
      plan: "battle-report-49",
      name: viewerData.me.name,
      email: profileEmail(viewerData.me),
      onSuccess: (result) => {
        sessionStorage.setItem(unlockKey, result.unlockToken);
        setIsBattleUnlocked(true);
        setPaymentMessage("Battle report unlocked. Full breakdown is now visible.");
      },
      onError: (message) => setPaymentMessage(message),
    });
  };

  const triggerOutcomePlan = () => {
    if (!viewerData) return;

    const isWinner =
      (viewer === "you" && room.winner === "player_one") ||
      (viewer === "friend" && room.winner === "player_two");

    startPayment({
      plan: isWinner ? "shadow-you-99-month" : "full-roadmap-99",
      name: viewerData.me.name,
      email: profileEmail(viewerData.me),
      onSuccess: () => {
        setPaymentMessage(isWinner ? "Shadow You activated." : "Roadmap purchase successful.");
      },
      onError: (message) => setPaymentMessage(message),
    });
  };

  const lockOverlay = (
    <div className="lock-overlay">
      <div className="lock-card">
        <p className="lock-title">🔒 Unlock Battle Report — ₹49</p>
        <p className="helper">
          You are one step away from full weekly plans, full pivot logic, and project strategy.
        </p>
        <button className="button primary lock-button" type="button" onClick={unlockBattleReport}>
          Unlock Battle Report
        </button>
      </div>
    </div>
  );

  if (!viewerData) {
    return null;
  }

  const meRiskTone = riskTone(viewerData.meReport.risk_score);
  const otherRiskTone = riskTone(viewerData.otherReport.risk_score);
  const deadSkillGap = viewerData.meReport.dead_skills.length - viewerData.otherReport.dead_skills.length;
  const iAmWinner =
    (viewer === "you" && room.winner === "player_one") ||
    (viewer === "friend" && room.winner === "player_two");
  const meSafeSkills = topItems(viewerData.meReport.safe_skills, 3);
  const meDeadSkills = topItems(viewerData.meReport.dead_skills, 3);
  const immediateWeeks = viewerData.meReport.week_plan.slice(0, 2);

  return (
    <div className="page">
      <main className="container">
        <section className="card battle-winner reveal" style={{ "--delay": "0.05s" } as CSSProperties}>
          <p className="battle-winner-text">{room.winnerStatement}</p>
          <p className="helper">Final statement: winner is decided by lower risk score, then fewer dead skills.</p>
          {paymentMessage && <p className="helper payment-message">{paymentMessage}</p>}
        </section>

        <section className="section battle-results-grid">
          <div className="card reveal" style={{ "--delay": "0.1s" } as CSSProperties}>
            <p className="hero-eyebrow">{viewerData.me.name} (You)</p>
            <div className="battle-score">
              <AnimatedNumber value={viewerData.meReport.risk_score} startFrom={0} className={`risk-number battle-risk ${meRiskTone}`} />
              <span className={`risk-badge ${meRiskTone}`}>Risk Score</span>
            </div>
            <p className={`battle-dead ${deadSkillGap > 0 ? "loser" : ""}`}>
              Dead skills: {viewerData.meReport.dead_skills.length}
            </p>
            <button className="button primary lock-button" type="button" onClick={triggerOutcomePlan}>
              {iAmWinner
                ? "You won. Stay ahead → Shadow You ₹99/month"
                : "You lost. Close the gap → Unlock Full Roadmap ₹99"}
            </button>
          </div>

          <div className="card reveal" style={{ "--delay": "0.16s" } as CSSProperties}>
            <p className="hero-eyebrow">{viewerData.other.name}</p>
            <div className="battle-score">
              <AnimatedNumber
                value={viewerData.otherReport.risk_score}
                startFrom={0}
                className={`risk-number battle-risk ${otherRiskTone}`}
              />
              <span className={`risk-badge ${otherRiskTone}`}>Risk Score</span>
            </div>
            <p className={`battle-dead ${deadSkillGap < 0 ? "loser" : ""}`}>
              Dead skills: {viewerData.otherReport.dead_skills.length}
            </p>
          </div>
        </section>

        <section className="section">
          <div className="card reveal" style={{ "--delay": "0.2s" } as CSSProperties}>
            <h2>Your Free Analysis of Your Report</h2>
            <ul className="analysis-list" style={{ marginTop: "14px" }}>
              <li>
                <strong>Risk Snapshot:</strong> Your current risk score is {viewerData.meReport.risk_score}/100. {viewerData.meReport.risk_reason}
              </li>
              <li>
                <strong>Main Exposure:</strong> You are currently exposed through {meDeadSkills.length > 0 ? meDeadSkills.join(", ") : "inconsistent high-signal execution"}.
              </li>
              <li>
                <strong>What Is Working:</strong> Your safer compounding assets right now are {meSafeSkills.length > 0 ? meSafeSkills.join(", ") : "execution consistency and project proof"}.
              </li>
              <li>
                <strong>Best Pivot Right Now:</strong> {viewerData.meReport.pivot_1.title} - {viewerData.meReport.pivot_1.why}
              </li>
              <li>
                <strong>Immediate 14-Day Plan:</strong> {immediateWeeks.map((item) => `Week ${item.week}: ${item.action}`).join(" ")}
              </li>
              <li>
                <strong>Decision Point:</strong> You can keep guessing and stay in the same band, or unlock the full battle breakdown to get the exact 90-day playbook and close your gap faster.
              </li>
            </ul>
            <div className="tag-row" style={{ marginTop: "16px" }}>
              {meDeadSkills.map((skill) => (
                <span key={skill} className="tag">
                  Risk area: {skill}
                </span>
              ))}
              {meSafeSkills.map((skill) => (
                <span key={skill} className="tag selected">
                  Safe lever: {skill}
                </span>
              ))}
            </div>
          </div>
        </section>

        {isBattleUnlocked ? (
          <section className="section reveal" style={{ "--delay": "0.3s" } as CSSProperties}>
            <div className="card">
              <h2>Full Battle Breakdown</h2>
              <div className="grid-2 section" style={{ paddingTop: "20px", paddingBottom: "0" }}>
                <div className="card subtle">
                  <h3>{viewerData.me.name} Strongest Pivot</h3>
                  <p>{viewerData.meReport.pivot_1.title}</p>
                  <p className="helper">{viewerData.meReport.pivot_1.why}</p>
                </div>
                <div className="card subtle">
                  <h3>{viewerData.other.name} Strongest Pivot</h3>
                  <p>{viewerData.otherReport.pivot_1.title}</p>
                  <p className="helper">{viewerData.otherReport.pivot_1.why}</p>
                </div>
              </div>
              <div className="grid-2 section" style={{ paddingTop: "16px", paddingBottom: "0" }}>
                <div className="card subtle">
                  <h3>{viewerData.me.name} Projects</h3>
                  <p className="helper">{viewerData.meReport.projects[0]?.name}</p>
                </div>
                <div className="card subtle">
                  <h3>{viewerData.other.name} Projects</h3>
                  <p className="helper">{viewerData.otherReport.projects[0]?.name}</p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="section lock-wrap reveal" style={{ "--delay": "0.3s" } as CSSProperties}>
            <div className="lock-blur">
              <div className="card">
                <h2>Full Battle Breakdown</h2>
                <p>Detailed pivot logic, weeks 3-12, and project strategy for both players.</p>
                <div className="grid-2 section" style={{ paddingTop: "16px", paddingBottom: "0" }}>
                  <div className="card subtle">
                    <h3>{viewerData.me.name} Pivot 2</h3>
                    <p className="helper">{viewerData.meReport.pivot_2.why}</p>
                  </div>
                  <div className="card subtle">
                    <h3>{viewerData.other.name} Pivot 2</h3>
                    <p className="helper">{viewerData.otherReport.pivot_2.why}</p>
                  </div>
                </div>
              </div>
            </div>
            {lockOverlay}
          </section>
        )}

        <section className="section">
          <div className="hero-actions battle-actions">
            <button className="button primary" type="button" onClick={() => drawShareCard(room)}>
              Share Your Battle
            </button>
            <Link className="button ghost" href="/battle">
              New Challenge
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
