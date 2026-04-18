import { NextResponse } from "next/server";
import { findPaymentByToken } from "@/lib/paymentStore";

type PaymentPlan = "battle-report-49" | "full-roadmap-99" | "shadow-you-99-month";

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
      return NextResponse.json({ unlocked: false, reason: "Missing token or plan" });
    }

    const record = await findPaymentByToken(token);
    if (!record) {
      return NextResponse.json({ unlocked: false, reason: "Record not found" });
    }

    const now = Date.now();
    const isExpired = Boolean(record.expiresAt && new Date(record.expiresAt).getTime() < now);

    const unlocked = record.verified && record.plan === plan && !isExpired;
    return NextResponse.json({
      unlocked,
      plan: record.plan,
      verified: record.verified,
      paymentStatus: record.paymentStatus,
      expiresAt: record.expiresAt,
      expired: isExpired,
      createdAt: record.createdAt,
    });
  } catch (error) {
    return NextResponse.json({ unlocked: false, reason: "Status check failed" }, { status: 500 });
  }
}
