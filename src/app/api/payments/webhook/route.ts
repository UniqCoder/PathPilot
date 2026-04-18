import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { appendPaymentRecord, appendWebhookEvent } from "@/lib/paymentStore";
import { getExpiryIso } from "@/lib/paymentRules";

type PaymentPlan = "battle-report-49" | "full-roadmap-99" | "shadow-you-99-month";

const planSet = new Set<PaymentPlan>([
  "battle-report-49",
  "full-roadmap-99",
  "shadow-you-99-month",
]);

const verifySignature = (rawBody: string, signature: string, secret: string) => {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    let signatureVerified = false;
    if (webhookSecret && signature) {
      signatureVerified = verifySignature(rawBody, signature, webhookSecret);
      if (!signatureVerified) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      created_at?: number;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            status?: string;
            notes?: {
              plan?: string;
            };
          };
        };
      };
    };

    const eventType = payload.event ?? "unknown";

    if (eventType === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;
      const planValue = paymentEntity?.notes?.plan;

      if (paymentEntity?.id && paymentEntity.order_id && planValue && planSet.has(planValue as PaymentPlan)) {
        const plan = planValue as PaymentPlan;
        await appendPaymentRecord({
          token: `pp_unlock_wh_${Date.now()}_${paymentEntity.id}`,
          plan,
          orderId: paymentEntity.order_id,
          paymentId: paymentEntity.id,
          signature,
          paymentStatus: paymentEntity.status ?? "captured",
          verified: signatureVerified,
          source: "webhook",
          expiresAt: getExpiryIso(plan),
          createdAt: new Date(
            (payload.created_at ?? Math.floor(Date.now() / 1000)) * 1000
          ).toISOString(),
        });
      }
    }

    await appendWebhookEvent({
      id: `wh_${Date.now()}`,
      event: eventType,
      signatureVerified,
      createdAt: new Date((payload.created_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      payload: (payload.payload ?? {}) as Record<string, unknown>,
    });

    return NextResponse.json({ received: true, signatureVerified });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
