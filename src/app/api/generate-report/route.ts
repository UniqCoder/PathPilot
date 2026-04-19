import { apiError, apiSuccess } from "@/lib/apiResponse";
import { generateReportFromProfile } from "@/lib/reportEngine";
import { findPaymentByToken } from "@/lib/paymentStore";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  isSupabaseSchemaCacheMissingTableError,
  supabaseSchemaBootstrapMessage,
} from "@/lib/supabaseError";
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

  const isExpired = Boolean(record.expiresAt && new Date(record.expiresAt).getTime() < Date.now());
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

    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const rateLimit = await checkRateLimit("generate-report", user.id, 3);
    if (!rateLimit.allowed) {
      return apiError(rateLimit.message || "Too many requests", 429);
    }

    const report = await generateReportFromProfile(profile);
    const unlocked = await isRoadmapUnlocked(unlockToken);
    const finalReport = unlocked ? report : applyFreeTierWeekGating(report);

    const { data: savedReport, error: saveError } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        profile,
        report_data: finalReport,
        risk_score: finalReport.risk_score,
        plan: unlocked ? "full-roadmap-99" : "free",
      })
      .select("id")
      .single();

    if (saveError || !savedReport) {
      if (isSupabaseSchemaCacheMissingTableError(saveError, "reports")) {
        return apiSuccess({
          report: finalReport,
          reportId: `local_${Date.now()}`,
          unlocked,
          persisted: false,
          warning: supabaseSchemaBootstrapMessage,
        });
      }

      return apiError(saveError?.message || "Failed to persist report", 500);
    }

    return apiSuccess({
      report: finalReport,
      reportId: savedReport.id,
      unlocked,
      persisted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    return apiError(message, 500);
  }
}
