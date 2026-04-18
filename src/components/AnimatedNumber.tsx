"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  durationMs?: number;
  startFrom?: number;
  className?: string;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function AnimatedNumber({
  value,
  durationMs = 1200,
  startFrom,
  className,
}: AnimatedNumberProps) {
  const initial = startFrom ?? value;
  const [display, setDisplay] = useState(Math.round(initial));
  const previous = useRef(initial);
  const lastRendered = useRef(Math.round(initial));

  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (from === to || prefersReducedMotion || document.hidden || durationMs <= 0) {
      const rounded = Math.round(to);
      lastRendered.current = rounded;
      setDisplay(rounded);
      return;
    }

    let raf = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) {
        start = now;
      }

      const progress = Math.min((now - start) / durationMs, 1);
      const eased = easeOutCubic(progress);
      const roundedNext = Math.round(from + (to - from) * eased);

      if (roundedNext !== lastRendered.current) {
        lastRendered.current = roundedNext;
        setDisplay(roundedNext);
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={className}>{display}</span>;
}
