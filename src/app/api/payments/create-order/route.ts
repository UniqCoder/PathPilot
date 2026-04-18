import { NextResponse } from "next/server";

type PaymentPlan = "battle-report-49" | "full-roadmap-99" | "shadow-you-99-month";

type CreateOrderInput = {
  plan: PaymentPlan;
  name?: string;
  email?: string;
};

const planConfig: Record<PaymentPlan, { amount: number; label: string }> = {
  "battle-report-49": { amount: 4900, label: "Battle Report Unlock" },
  "full-roadmap-99": { amount: 9900, label: "Full Roadmap Unlock" },
  "shadow-you-99-month": { amount: 9900, label: "Shadow You Monthly" },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderInput;

    if (!body?.plan || !(body.plan in planConfig)) {
      return NextResponse.json({ error: "Invalid payment plan" }, { status: 400 });
    }

    const config = planConfig[body.plan];
    const currency = "INR";
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({
        mock: true,
        keyId: "rzp_test_mock",
        orderId: `mock_order_${Date.now()}`,
        amount: config.amount,
        currency,
        plan: body.plan,
      });
    }

    const authToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify({
        amount: config.amount,
        currency,
        receipt: `pathpilot_${body.plan}_${Date.now()}`,
        notes: {
          plan: body.plan,
          label: config.label,
          name: body.name ?? "PathPilot User",
          email: body.email ?? "unknown@pathpilot.local",
        },
      }),
    });

    const order = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      const description = order?.error?.description ?? "Razorpay order creation failed";
      return NextResponse.json({ error: description }, { status: 500 });
    }

    return NextResponse.json({
      mock: false,
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: body.plan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown payment error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
