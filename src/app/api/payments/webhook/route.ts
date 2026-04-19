import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { getExpiryIso, type PaymentPlan } from "@/lib/paymentRules";
import { findPaymentByOrderId, markPaymentCaptured, markPaymentFailed } from "@/lib/paymentStore";
import { supabaseAdmin } from "@/lib/supabase-admin";

const validPlans = new Set<PaymentPlan>([
  "battle-report-49",
  "full-roadmap-99",
  "shadow-you",
]);

const secureCompare = (a: string, b: string) => {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
};

const reportPlanValue = (plan: PaymentPlan) => {
  if (plan === "full-roadmap-99") return "full-roadmap-99";
  if (plan === "shadow-you") return "shadow-you";
  return "free";
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        notes?: {
          plan?: string;
          reportId?: string;
        };
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret || !signature) {
      return apiError("Missing webhook signature configuration", 400);
    }

    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (!secureCompare(expected, signature)) {
      return apiError("Invalid webhook signature", 400);
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const eventType = payload.event ?? "";
    const entity = payload.payload?.payment?.entity;

    if (!entity?.order_id) {
      return apiError("Missing order id in webhook payload", 400);
    }

    if (eventType === "payment.failed") {
      await markPaymentFailed(entity.order_id, entity.id);
      return apiSuccess({ received: true, event: eventType });
    }

    if (eventType !== "payment.captured") {
      return apiSuccess({ received: true, event: eventType });
    }

    const pending = await findPaymentByOrderId(entity.order_id);
    if (!pending) {
      return apiError("Pending payment record not found", 404);
    }

    const planFromWebhook = entity.notes?.plan;
    const plan = validPlans.has(planFromWebhook as PaymentPlan)
      ? (planFromWebhook as PaymentPlan)
      : pending.plan;

    const token = randomUUID();
    const expiresAt = getExpiryIso(plan);

    const captured = await markPaymentCaptured({
      orderId: entity.order_id,
      paymentId: entity.id ?? "",
      signature,
      plan,
      token,
      expiresAt,
      userId: pending.userId,
      reportId: pending.reportId,
      amount: pending.amount || entity.amount || 0,
    });

    if (captured.reportId && captured.plan !== "battle-report-49") {
      await supabaseAdmin
        .from("reports")
        .update({ plan: reportPlanValue(captured.plan) })
        .eq("id", captured.reportId);
    }

    return apiSuccess({
      received: true,
      event: eventType,
      paymentId: captured.paymentId,
      orderId: captured.orderId,
      reportId: captured.reportId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return apiError(message, 500);
  }
}
