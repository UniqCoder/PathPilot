import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { getExpiryIso, type PaymentPlan } from "@/lib/paymentRules";
import { findPaymentByOrderId, markPaymentCaptured } from "@/lib/paymentStore";
import { supabaseAdmin } from "@/lib/supabase-admin";

type VerifyRequestBody = {
  plan: PaymentPlan;
  orderId?: string;
  paymentId?: string;
  signature?: string;
};

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequestBody;

    if (!body?.plan || !validPlans.has(body.plan)) {
      return apiError("Invalid plan for verification", 400);
    }

    const orderId = body.orderId ?? "";
    const paymentId = body.paymentId ?? "";
    const signature = body.signature ?? "";

    if (!orderId || !paymentId || !signature) {
      return apiError("Missing payment verification fields", 400);
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return apiError("Razorpay secret missing", 500);
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!secureCompare(expectedSignature, signature)) {
      return apiError("Payment signature mismatch", 400);
    }

    const pending = await findPaymentByOrderId(orderId);
    if (!pending) {
      return apiError("Pending payment record not found", 404);
    }

    const token = randomUUID();
    const expiresAt = getExpiryIso(body.plan);

    const captured = await markPaymentCaptured({
      orderId,
      paymentId,
      signature,
      plan: body.plan,
      token,
      expiresAt,
      userId: pending.userId,
      reportId: pending.reportId,
      amount: pending.amount,
    });

    if (captured.reportId && captured.plan !== "battle-report-49") {
      const { error: reportError } = await supabaseAdmin
        .from("reports")
        .update({ plan: reportPlanValue(captured.plan) })
        .eq("id", captured.reportId);

      if (reportError) {
        return apiError(reportError.message || "Failed to update report plan", 500);
      }
    }

    try {
      const recipient = pending.userId
        ? (await supabaseAdmin.auth.admin.getUserById(pending.userId)).data.user?.email
        : null;

      if (recipient) {
        await sendPaymentConfirmationEmail({
          email: recipient,
          plan: body.plan,
          amount: pending.amount,
          paymentId,
        });
      }
    } catch {
      // Email is best-effort and should not block verified payments.
    }

    return apiSuccess({
      verified: true,
      unlockToken: token,
      plan: body.plan,
      reportId: captured.reportId,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return apiError(message, 500);
  }
}
