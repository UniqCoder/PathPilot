import { describe, expect, it } from "vitest";
import { getExpiryIso, paymentExpiryByPlan } from "../paymentRules";

describe("paymentExpiryByPlan", () => {
  it("defines all known plans", () => {
    expect(Object.keys(paymentExpiryByPlan).sort()).toEqual([
      "battle-report-49",
      "full-roadmap-99",
      "shadow-you",
    ]);
  });
});

describe("getExpiryIso", () => {
  const baseDate = new Date("2026-04-19T00:00:00.000Z");

  it("returns no expiry for battle report", () => {
    const result = getExpiryIso("battle-report-49", baseDate);
    expect(result).toBeNull();
  });

  it("returns no expiry for full roadmap", () => {
    const result = getExpiryIso("full-roadmap-99", baseDate);
    expect(result).toBeNull();
  });

  it("returns monthly expiry for shadow plan", () => {
    const result = getExpiryIso("shadow-you", baseDate);
    expect(result).toBe("2026-05-19T00:00:00.000Z");
  });
});
