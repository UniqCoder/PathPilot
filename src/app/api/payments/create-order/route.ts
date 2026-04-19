import Razorpay from "razorpay";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { createPendingPayment } from "@/lib/paymentStore";
import type { PaymentPlan } from "@/lib/paymentRules";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  isSupabaseSchemaCacheMissingTableError,
  supabaseSchemaBootstrapMessage,
} from "@/lib/supabaseError";

type CreateOrderInput = {
  plan: PaymentPlan;
  reportId?: string;
};

const planConfig: Record<PaymentPlan, { amount: number; label: string }> = {
  "battle-report-49": { amount: 4900, label: "Battle Report Unlock" },
  "full-roadmap-99": { amount: 9900, label: "Full Roadmap Unlock" },
  "shadow-you": { amount: 29900, label: "Shadow You" },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderInput;

    if (!body?.plan || !(body.plan in planConfig)) {
      return apiError("Invalid payment plan", 400);
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const rateLimit = await checkRateLimit("payments-create-order", user.id, 10);
    if (!rateLimit.allowed) {
      return apiError(rateLimit.message || "Too many requests", 429);
    }

    const requiresReport = body.plan !== "battle-report-49";
    const reportId = body.reportId ?? null;

    if (requiresReport && !reportId) {
      return apiError("Missing report id", 400);
    }

    if (requiresReport && reportId?.startsWith("local_")) {
      return apiError(
        "This report is not saved in your account yet. Generate a fresh report from intake and retry payment.",
        400
      );
    }

    if (requiresReport) {
      const { data: reportRow, error: reportError } = await supabase
        .from("reports")
        .select("id")
        .eq("id", reportId!)
        .eq("user_id", user.id)
        .maybeSingle();

      if (isSupabaseSchemaCacheMissingTableError(reportError, "reports")) {
        return apiError(supabaseSchemaBootstrapMessage, 503);
      }

      if (reportError || !reportRow) {
        return apiError("Report not found for this user", 404);
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return apiError("Razorpay is not configured", 500);
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const config = planConfig[body.plan];
    const order = await razorpay.orders.create({
      amount: config.amount,
      currency: "INR",
      receipt: `pathpilot_${body.plan}_${Date.now()}`,
      notes: {
        plan: body.plan,
        reportId: reportId ?? "",
        label: config.label,
        userId: user.id,
      },
    });

    await createPendingPayment({
      userId: user.id,
      reportId,
      plan: body.plan,
      amount: config.amount,
      orderId: order.id,
    });

    return apiSuccess({
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: body.plan,
      reportId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create payment order";
    return apiError(message, 500);
  }
}
