import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PaymentPlan } from "@/lib/paymentRules";

export type StoredPaymentRecord = {
  id: string;
  token: string | null;
  plan: PaymentPlan;
  orderId: string | null;
  paymentId: string | null;
  signature: string | null;
  paymentStatus: string;
  verified: boolean;
  expiresAt: string | null;
  createdAt: string;
  userId: string | null;
  reportId: string | null;
  amount: number;
};

type CreatePendingPaymentInput = {
  userId: string;
  reportId?: string | null;
  plan: PaymentPlan;
  amount: number;
  orderId: string;
};

type CapturePaymentInput = {
  orderId: string;
  paymentId: string;
  signature: string;
  plan: PaymentPlan;
  token: string;
  expiresAt: string | null;
  userId?: string | null;
  reportId?: string | null;
  amount: number;
};

const toStoredRecord = (row: {
  id: string;
  token: string | null;
  plan: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  user_id: string | null;
  report_id: string | null;
  amount: number;
}): StoredPaymentRecord => ({
  id: row.id,
  token: row.token,
  plan: row.plan as PaymentPlan,
  orderId: row.razorpay_order_id,
  paymentId: row.razorpay_payment_id,
  signature: row.razorpay_signature,
  paymentStatus: row.status,
  verified: row.status === "captured",
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  userId: row.user_id,
  reportId: row.report_id,
  amount: row.amount,
});

export const createPendingPayment = async (input: CreatePendingPaymentInput) => {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: input.userId,
      report_id: input.reportId ?? null,
      plan: input.plan,
      amount: input.amount,
      razorpay_order_id: input.orderId,
      status: "pending",
    })
    .select(
      "id,token,plan,razorpay_order_id,razorpay_payment_id,razorpay_signature,status,expires_at,created_at,user_id,report_id,amount"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to create pending payment");
  }

  return toStoredRecord(data);
};

export const markPaymentCaptured = async (input: CapturePaymentInput) => {
  const updatePayload = {
    razorpay_payment_id: input.paymentId,
    razorpay_signature: input.signature,
    status: "captured",
    token: input.token,
    expires_at: input.expiresAt,
    plan: input.plan,
    amount: input.amount,
    ...(input.userId ? { user_id: input.userId } : {}),
    ...(input.reportId ? { report_id: input.reportId } : {}),
  };

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("payments")
    .select(
      "id,token,plan,razorpay_order_id,razorpay_payment_id,razorpay_signature,status,expires_at,created_at,user_id,report_id,amount"
    )
    .eq("razorpay_order_id", input.orderId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message || "Unable to lookup payment record");
  }

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .update(updatePayload)
      .eq("id", existing.id)
      .select(
        "id,token,plan,razorpay_order_id,razorpay_payment_id,razorpay_signature,status,expires_at,created_at,user_id,report_id,amount"
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Unable to update captured payment");
    }

    return toStoredRecord(data);
  }

  const { data, error } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: input.userId ?? null,
      report_id: input.reportId ?? null,
      plan: input.plan,
      amount: input.amount,
      razorpay_order_id: input.orderId,
      razorpay_payment_id: input.paymentId,
      razorpay_signature: input.signature,
      status: "captured",
      token: input.token,
      expires_at: input.expiresAt,
    })
    .select(
      "id,token,plan,razorpay_order_id,razorpay_payment_id,razorpay_signature,status,expires_at,created_at,user_id,report_id,amount"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to insert captured payment");
  }

  return toStoredRecord(data);
};

export const markPaymentFailed = async (orderId: string, paymentId?: string) => {
  const payload = {
    status: "failed",
    ...(paymentId ? { razorpay_payment_id: paymentId } : {}),
  };

  const { error } = await supabaseAdmin
    .from("payments")
    .update(payload)
    .eq("razorpay_order_id", orderId);

  if (error) {
    throw new Error(error.message || "Unable to mark payment as failed");
  }
};

export const findPaymentByToken = async (token: string) => {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      "id,token,plan,razorpay_order_id,razorpay_payment_id,razorpay_signature,status,expires_at,created_at,user_id,report_id,amount"
    )
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to find payment by token");
  }

  return data ? toStoredRecord(data) : null;
};

export const findPaymentByOrderId = async (orderId: string) => {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      "id,token,plan,razorpay_order_id,razorpay_payment_id,razorpay_signature,status,expires_at,created_at,user_id,report_id,amount"
    )
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to find payment by order id");
  }

  return data ? toStoredRecord(data) : null;
};
