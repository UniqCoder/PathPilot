"use client";

import { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

type LiveRiskCounterProps = {
  min?: number;
  max?: number;
};

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export default function LiveRiskCounter({ min = 65, max = 85 }: LiveRiskCounterProps) {
  const [target, setTarget] = useState(min);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const updateRisk = () => {
      setTarget(randomBetween(min, max));
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
          updateRisk();
        }
      }, 9000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopUpdates();
        return;
      }

      updateRisk();
      startUpdates();
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopUpdates();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [min, max]);

  return (
    <div className="risk-counter">
      <AnimatedNumber value={target} startFrom={min} className="risk-number" />
      <span className="risk-label">Career Risk Score</span>
    </div>
  );
}
