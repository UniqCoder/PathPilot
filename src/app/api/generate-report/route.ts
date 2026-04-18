import { NextResponse } from "next/server";
import { generateReportFromProfile } from "@/lib/reportEngine";
import { findPaymentByToken } from "@/lib/paymentStore";
import type { FormPayload, ReportData } from "@/lib/types";

type GenerateReportRequest = FormPayload & {
  unlockToken?: string;
};

const isRoadmapUnlocked = async (unlockToken?: string) => {
  if (!unlockToken) {
    return false;
  }

  const record = await findPaymentByToken(unlockToken);
  if (!record) {
    return false;
  }

  const isExpired = Boolean(
    record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()
  );

  return record.verified && record.plan === "full-roadmap-99" && !isExpired;
};

const applyFreeTierWeekGating = (report: ReportData): ReportData => {
  const gatedWeekPlan = report.week_plan.map((item) => {
    if (item.week <= 2) {
      return item;
    }

    return {
      week: item.week,
      action:
        "Unlock Full Roadmap to access this weekly report: detailed tasks, deliverable, market signal, and differentiation strategy.",
    };
  });

  return {
    ...report,
    week_plan: gatedWeekPlan,
  };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GenerateReportRequest;
    const { unlockToken, ...profile } = payload;

    const report = await generateReportFromProfile(profile);
    const unlocked = await isRoadmapUnlocked(unlockToken);

    return NextResponse.json(unlocked ? report : applyFreeTierWeekGating(report));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
