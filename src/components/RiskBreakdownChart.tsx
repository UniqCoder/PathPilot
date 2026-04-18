import type { CSSProperties } from "react";
import type { RiskBreakdownItem } from "@/lib/types";

type RiskBreakdownChartProps = {
  items: RiskBreakdownItem[];
};

const formatImpact = (impact: number) => (impact > 0 ? `+${impact}` : `${impact}`);

export default function RiskBreakdownChart({ items }: RiskBreakdownChartProps) {
  if (!items.length) {
    return null;
  }

  const maxAbsImpact = Math.max(...items.map((item) => Math.abs(item.impact)), 1);

  return (
    <div className="risk-breakdown-shell">
      <div className="risk-breakdown-legend" aria-hidden="true">
        <span className="risk-breakdown-legend-pill down">Risk Decrease</span>
        <span className="risk-breakdown-legend-pill up">Risk Increase</span>
      </div>

      <div className="risk-breakdown-grid" role="list" aria-label="Career risk factor breakdown chart">
        {items.map((item) => {
          const width = Math.max(4, Math.round((Math.abs(item.impact) / maxAbsImpact) * 100));
          const isUp = item.impact > 0;
          const isDown = item.impact < 0;

          return (
            <div key={item.key} className="risk-break-row" role="listitem">
              <div className="risk-break-header">
                <p className="risk-break-label">{item.label}</p>
                <span className={`risk-break-impact ${isUp ? "up" : isDown ? "down" : "neutral"}`}>
                  {formatImpact(item.impact)}
                </span>
              </div>

              <div className="risk-break-track" aria-hidden="true">
                <div className="risk-break-half left">
                  {isDown && (
                    <span
                      className="risk-break-bar down"
                      style={{ "--bar-width": `${width}%` } as CSSProperties}
                    />
                  )}
                </div>
                <div className="risk-break-center" />
                <div className="risk-break-half right">
                  {isUp && (
                    <span
                      className="risk-break-bar up"
                      style={{ "--bar-width": `${width}%` } as CSSProperties}
                    />
                  )}
                </div>
              </div>

              <p className="risk-break-detail">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
