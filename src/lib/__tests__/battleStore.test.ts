import { describe, expect, it } from "vitest";
import { sampleReport } from "../reportDefaults";
import {
  battleProfileToFormPayload,
  evaluateBattleWinner,
} from "../battleStore";
import type { BattleProfile, ReportData } from "../types";

const makeReport = (risk: number, deadSkills: string[]): ReportData => ({
  ...sampleReport,
  risk_score: risk,
  dead_skills: deadSkills,
});

describe("evaluateBattleWinner", () => {
  it("selects player one when risk score is lower", () => {
    const winner = evaluateBattleWinner(makeReport(43, ["A"]), makeReport(61, ["A"]));
    expect(winner).toBe("player_one");
  });

  it("uses dead skill count as tie-breaker", () => {
    const winner = evaluateBattleWinner(
      makeReport(55, ["A"]),
      makeReport(55, ["A", "B", "C"])
    );

    expect(winner).toBe("player_one");
  });

  it("returns tie when both risk and dead skills are equal", () => {
    const winner = evaluateBattleWinner(makeReport(58, ["A", "B"]), makeReport(58, ["A", "B"]));
    expect(winner).toBe("tie");
  });
});

describe("battleProfileToFormPayload", () => {
  it("maps battle profile fields and normalizes generated email", () => {
    const profile: BattleProfile = {
      name: "Ada Lovelace",
      branch: "CSE",
      year: "3rd year",
      tier: "Private Tier 1",
      skills: ["TypeScript", "React"],
      goal: "Job",
      city: "Bangalore",
    };

    const payload = battleProfileToFormPayload(profile);

    expect(payload.email).toBe("ada.lovelace@pathpilot.local");
    expect(payload.timeline).toBe("6 months");
    expect(payload.projectsCount).toBe(1);
    expect(payload.projectDomain).toBe("Full Stack Web");
    expect(payload.projectProblem).toContain("real workflow product");
    expect(payload.branch).toBe(profile.branch);
    expect(payload.skills).toEqual(profile.skills);
  });
});
