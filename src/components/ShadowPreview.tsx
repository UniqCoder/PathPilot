"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import AnimatedNumber from "./AnimatedNumber";

const randomScore = () => Math.floor(68 + Math.random() * 12);
const randomTrend = () => Math.floor(4 + Math.random() * 8);

export default function ShadowPreview() {
  const [score, setScore] = useState(74);
  const [trend, setTrend] = useState(6);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const updateMetrics = () => {
      setScore(randomScore());
      setTrend(randomTrend());
    };

    const stopUpdates = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const startUpdates = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (!document.hidden) {
          updateMetrics();
        }
      }, 11000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopUpdates();
        return;
      }

      updateMetrics();
      startUpdates();
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopUpdates();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="card shadow-card reveal" style={{ "--delay": "0.2s" } as CSSProperties}>
      <div>
        <p className="hero-eyebrow">Shadow You</p>
        <h3>Live Career Health</h3>
        <p className="helper">
          Your profile is mapped against live hiring volatility and AI automation risk.
        </p>
      </div>
      <div className="shadow-score">
        <AnimatedNumber value={score} startFrom={70} />
        <span className="shadow-trend">+{trend}%</span>
      </div>
      <div className="bar" style={{ "--fill": "72%" } as CSSProperties}>
        <span />
      </div>
      <div className="bar high" style={{ "--fill": "86%" } as CSSProperties}>
        <span />
      </div>
      <p className="helper">AI alerts when your skills drift toward risky territory.</p>
    </div>
  );
}
