import { apiError, apiSuccess } from "@/lib/apiResponse";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await context.params;
    const supabase = await createSupabaseRouteHandlerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { data, error } = await supabase
      .from("reports")
      .select("id,created_at,risk_score,plan,profile,report_data")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return apiError(error.message || "Failed to fetch report", 500);
    }

    if (!data) {
      return apiError("Report not found", 404);
    }

    return apiSuccess({
      reportId: data.id,
      createdAt: data.created_at,
      riskScore: data.risk_score,
      plan: data.plan,
      profile: data.profile,
      report: data.report_data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch report";
    return apiError(message, 500);
  }
}
