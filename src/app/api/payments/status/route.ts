import { apiError, apiSuccess } from "@/lib/apiResponse";
import { findPaymentByToken } from "@/lib/paymentStore";
import type { PaymentPlan } from "@/lib/paymentRules";

type StatusRequestBody = {
  token?: string;
  plan?: PaymentPlan;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StatusRequestBody;
    const token = body?.token ?? "";
    const plan = body?.plan;

    if (!token || !plan) {
      return apiError("Missing token or plan", 400);
    }

    const record = await findPaymentByToken(token);
    if (!record) {
      return apiSuccess({ unlocked: false, reason: "Record not found" });
    }

    const isExpired = Boolean(record.expiresAt && new Date(record.expiresAt).getTime() < Date.now());
    const unlocked = record.verified && record.plan === plan && !isExpired;

    return apiSuccess({
      unlocked,
      plan: record.plan,
      verified: record.verified,
      paymentStatus: record.paymentStatus,
      expiresAt: record.expiresAt,
      expired: isExpired,
      reportId: record.reportId,
      createdAt: record.createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status check failed";
    return apiError(message, 500);
  }
}
