import { describe, expect, it } from "vitest";
import { getExpiryIso, paymentExpiryByPlan } from "../paymentRules";

describe("paymentExpiryByPlan", () => {
  it("defines all known plans", () => {
    expect(Object.keys(paymentExpiryByPlan).sort()).toEqual([
      "battle-report-49",
      "full-roadmap-99",
      "shadow-you-99-month",
    ]);
  });
});

describe("getExpiryIso", () => {
  const baseDate = new Date("2026-04-19T00:00:00.000Z");

  it("returns 30-day expiry for battle report", () => {
    const result = getExpiryIso("battle-report-49", baseDate);
    expect(result).toBe("2026-05-19T00:00:00.000Z");
  });

  it("returns 365-day expiry for full roadmap", () => {
    const result = getExpiryIso("full-roadmap-99", baseDate);
    expect(result).toBe("2027-04-19T00:00:00.000Z");
  });

  it("returns monthly expiry for shadow plan", () => {
    const result = getExpiryIso("shadow-you-99-month", baseDate);
    expect(result).toBe("2026-05-19T00:00:00.000Z");
  });
});
