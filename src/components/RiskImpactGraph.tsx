import type { CSSProperties } from "react";
import type { RiskBreakdownItem } from "@/lib/types";

type RiskImpactGraphProps = {
  items: RiskBreakdownItem[];
  riskScore: number;
};

type Point = {
  x: number;
  y: number;
};

type RiskBand = {
  label: string;
  className: string;
  helper: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const scoreToY = (score: number, top: number, bottom: number) => {
  const normalized = clamp(score, 0, 100);
  const drawable = bottom - top;
  return top + ((100 - normalized) / 100) * drawable;
};

const getRiskBand = (score: number): RiskBand => {
  if (score <= 40) {
    return {
      label: "Low Risk (Good)",
      className: "good",
      helper: "You are in a safer zone. Keep consistency and quality high.",
    };
  }

  if (score <= 70) {
    return {
      label: "Moderate Risk (Watch)",
      className: "watch",
      helper: "You are in the middle zone. A focused pivot can still improve your odds.",
    };
  }

  return {
    label: "High Risk (Needs Action)",
    className: "bad",
    helper: "You are in a danger zone. Prioritize high-signal projects and market-fit skills.",
  };
};

const buildSmoothPath = (points: Point[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    const midpointX = (previous.x + current.x) / 2;

    path += ` Q ${midpointX} ${previous.y}, ${current.x} ${current.y}`;
  }

  return path;
};

export default function RiskImpactGraph({ items, riskScore }: RiskImpactGraphProps) {
  if (!items.length) {
    return null;
  }

  const width = 860;
  const height = 320;
  const chartLeft = 72;
  const chartRight = width - 20;
  const chartTop = 24;
  const chartBottom = height - 58;
  const currentScore = clamp(riskScore, 0, 100);
  const currentBand = getRiskBand(currentScore);

  const values = items.reduce<number[]>(
    (acc, item) => {
      const previous = acc[acc.length - 1] ?? 50;
      const next = clamp(previous + item.impact, 0, 100);
      acc.push(next);
      return acc;
    },
    [50]
  );

  const stepX = values.length > 1 ? (chartRight - chartLeft) / (values.length - 1) : 0;

  const points: Point[] = values.map((value, index) => ({
    x: chartLeft + stepX * index,
    y: scoreToY(value, chartTop, chartBottom),
  }));

  const yTicks = [0, 20, 40, 60, 80, 100];
  const currentY = scoreToY(currentScore, chartTop, chartBottom);

  const linePath = buildSmoothPath(points);
  const areaPath =
    linePath && points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`
      : "";

  return (
    <div className="risk-impact-shell">
      <div className="risk-impact-head">
        <h3>Risk Movement Graph</h3>
        <p>
          X-axis is factor sequence (from baseline to final). Y-axis is risk score from 0 to 100.
          Lower is better. Higher is riskier.
        </p>
      </div>

      <div className="risk-impact-band-guide" aria-live="polite">
        <span className="chip good">Good: 0-40</span>
        <span className="chip watch">Watch: 41-70</span>
        <span className="chip bad">Needs Action: 71-100</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="risk-impact-svg"
        role="img"
        aria-label="Risk movement graph with axis labels, risk zones, and current score marker"
      >
        <defs>
          <linearGradient id="riskImpactLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(130, 255, 229, 0.88)" />
            <stop offset="48%" stopColor="rgba(170, 120, 255, 0.9)" />
            <stop offset="100%" stopColor="rgba(123, 47, 255, 0.98)" />
          </linearGradient>
          <linearGradient id="riskImpactArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(123, 47, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(123, 47, 255, 0.02)" />
          </linearGradient>
        </defs>

        <rect
          x={chartLeft}
          y={scoreToY(100, chartTop, chartBottom)}
          width={chartRight - chartLeft}
          height={scoreToY(70, chartTop, chartBottom) - scoreToY(100, chartTop, chartBottom)}
          className="risk-zone-bad"
        />
        <rect
          x={chartLeft}
          y={scoreToY(70, chartTop, chartBottom)}
          width={chartRight - chartLeft}
          height={scoreToY(40, chartTop, chartBottom) - scoreToY(70, chartTop, chartBottom)}
          className="risk-zone-watch"
        />
        <rect
          x={chartLeft}
          y={scoreToY(40, chartTop, chartBottom)}
          width={chartRight - chartLeft}
          height={scoreToY(0, chartTop, chartBottom) - scoreToY(40, chartTop, chartBottom)}
          className="risk-zone-good"
        />

        {yTicks.map((score) => {
          const y = scoreToY(score, chartTop, chartBottom);

          return (
            <g key={`grid-${score}`}>
              <line x1={chartLeft} y1={y} x2={chartRight} y2={y} className="risk-impact-grid-line" />
              <text x={chartLeft - 10} y={y + 4} className="risk-impact-tick">
                {score}
              </text>
            </g>
          );
        })}

        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} className="risk-impact-axis" />
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} className="risk-impact-axis" />

        <text x={chartLeft} y={height - 14} className="risk-impact-axis-label">
          X: factor progression (Start to Factor 1...N)
        </text>

        <text x={chartLeft - 58} y={chartTop - 2} className="risk-impact-axis-label risk-impact-y-label">
          Y: risk score
        </text>

        <line x1={chartLeft} y1={currentY} x2={chartRight} y2={currentY} className="risk-impact-current-line" />
        <text x={chartRight - 4} y={currentY - 8} className="risk-impact-current-label">
          You now: {currentScore}
        </text>

        <text x={chartRight - 8} y={scoreToY(88, chartTop, chartBottom)} className="risk-zone-label bad" textAnchor="end">
          High risk
        </text>
        <text x={chartRight - 8} y={scoreToY(56, chartTop, chartBottom)} className="risk-zone-label watch" textAnchor="end">
          Watch zone
        </text>
        <text x={chartRight - 8} y={scoreToY(18, chartTop, chartBottom)} className="risk-zone-label good" textAnchor="end">
          Good zone
        </text>

        {areaPath && <path d={areaPath} className="risk-impact-area" fill="url(#riskImpactArea)" />}

        <path
          d={linePath}
          className="risk-impact-line"
          stroke="url(#riskImpactLine)"
          pathLength={1}
        />

        {points.map((point, index) => (
          <g key={`point-${index}`} style={{ "--delay": `${0.12 + index * 0.08}s` } as CSSProperties} className="risk-impact-point-wrap">
            <circle cx={point.x} cy={point.y} r={6.8} className="risk-impact-point-glow" />
            <circle cx={point.x} cy={point.y} r={3.4} className="risk-impact-point" />

            <line x1={point.x} y1={chartBottom} x2={point.x} y2={chartBottom + 5} className="risk-impact-x-tick" />
            <text x={point.x} y={chartBottom + 18} className="risk-impact-x-index" textAnchor="middle">
              {index === 0 ? "S" : index}
            </text>
          </g>
        ))}

        {points.length > 0 && (
          <g className="risk-impact-you-point">
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={11.2} className="risk-impact-you-halo" />
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={5.2} className="risk-impact-you-core" />
          </g>
        )}
      </svg>

      <div className={`risk-impact-position ${currentBand.className}`}>
        <strong>Current Position: {currentBand.label}</strong>
        <p>{currentBand.helper}</p>
      </div>

      <ol className="risk-impact-factor-legend" aria-label="X-axis factor mapping">
        <li>
          <span className="index">S</span>
          <span className="label">Baseline risk = 50</span>
        </li>
        {items.map((item, index) => (
          <li key={item.key}>
            <span className="index">{index + 1}</span>
            <span className="label">{item.label}</span>
          </li>
        ))}
      </ol>

      <div className="risk-impact-foot">
        <span>Lower score is better for the user.</span>
        <span>Current score: {currentScore}</span>
      </div>
    </div>
  );
}
