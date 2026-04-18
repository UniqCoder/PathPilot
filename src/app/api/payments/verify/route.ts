import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { appendPaymentRecord } from "@/lib/paymentStore";
import { getExpiryIso } from "@/lib/paymentRules";

type PaymentPlan = "battle-report-49" | "full-roadmap-99" | "shadow-you-99-month";

type VerifyRequestBody = {
  plan: PaymentPlan;
  orderId?: string;
  paymentId?: string;
  signature?: string;
};

const planSet = new Set<PaymentPlan>([
  "battle-report-49",
  "full-roadmap-99",
  "shadow-you-99-month",
]);

const buildToken = () => `pp_unlock_${randomBytes(16).toString("hex")}`;

const getRazorpayPayment = async (paymentId: string, keyId: string, keySecret: string) => {
  const authToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authToken}`,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    const description = payload?.error?.description ?? "Unable to fetch payment status";
    throw new Error(description);
  }

  return payload as {
    id: string;
    order_id: string;
    status: string;
  };
};

const secureCompare = (a: string, b: string) => {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequestBody;
    if (!body?.plan || !planSet.has(body.plan)) {
      return NextResponse.json({ error: "Invalid plan for verification" }, { status: 400 });
    }

    const orderId = body.orderId ?? "";
    const paymentId = body.paymentId ?? "";
    const signature = body.signature ?? "";

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: "Missing order or payment id" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const expiresAt = getExpiryIso(body.plan);

    if (!keySecret) {
      const token = buildToken();
      await appendPaymentRecord({
        token,
        plan: body.plan,
        orderId,
        paymentId,
        signature,
        paymentStatus: "captured",
        verified: true,
        source: "mock",
        expiresAt,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        verified: true,
        mock: true,
        plan: body.plan,
        unlockToken: token,
      });
    }

    const payload = `${orderId}|${paymentId}`;
    const expected = createHmac("sha256", keySecret).update(payload).digest("hex");
    const verified = secureCompare(expected, signature);

    if (!verified) {
      return NextResponse.json({ error: "Payment signature mismatch" }, { status: 400 });
    }

    if (!keyId) {
      return NextResponse.json({ error: "Razorpay key configuration incomplete" }, { status: 500 });
    }

    const razorpayPayment = await getRazorpayPayment(paymentId, keyId, keySecret);
    if (razorpayPayment.order_id !== orderId) {
      return NextResponse.json({ error: "Order and payment mismatch" }, { status: 400 });
    }

    if (razorpayPayment.status !== "captured") {
      return NextResponse.json(
        { error: `Payment not captured yet (status: ${razorpayPayment.status})` },
        { status: 409 }
      );
    }

    const token = buildToken();
    await appendPaymentRecord({
      token,
      plan: body.plan,
      orderId,
      paymentId,
      signature,
      paymentStatus: razorpayPayment.status,
      verified: true,
      source: "verify",
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      verified: true,
      mock: false,
      plan: body.plan,
      unlockToken: token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
