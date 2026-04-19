import type { PaymentPlan } from "./paymentRules";

export type { PaymentPlan };

type CreateOrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  plan: PaymentPlan;
  reportId: string;
};

type VerifyPaymentResponse = {
  verified: boolean;
  plan: PaymentPlan;
  unlockToken: string;
  reportId: string | null;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type PaymentSuccessResult = {
  paymentId: string;
  unlockToken: string;
  plan: PaymentPlan;
  verified: boolean;
  reportId: string | null;
};

type StartPaymentOptions = {
  plan: PaymentPlan;
  reportId: string;
  name: string;
  email: string;
  onSuccess: (result: PaymentSuccessResult) => void;
  onError?: (message: string) => void;
};

const planLabel: Record<PaymentPlan, string> = {
  "battle-report-49": "Unlock Battle Report",
  "full-roadmap-99": "Unlock Full Roadmap",
  "shadow-you": "Shadow You Subscription",
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

let razorpayLoadPromise: Promise<boolean> | null = null;

const loadRazorpayScript = async () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.Razorpay) {
    return true;
  }

  if (!razorpayLoadPromise) {
    razorpayLoadPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayLoadPromise;
};

const verifyPayment = async (
  plan: PaymentPlan,
  orderId: string,
  paymentId: string,
  signature: string
) => {
  const verifyResponse = await fetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, orderId, paymentId, signature }),
  });

  if (!verifyResponse.ok) {
    const parsed = (await verifyResponse.json()) as ApiError;
    throw new Error(parsed.error || "Payment verification failed");
  }

  const payload = (await verifyResponse.json()) as ApiResponse<VerifyPaymentResponse>;
  if (!payload.success) {
    throw new Error(payload.error || "Payment verification failed");
  }

  return payload.data;
};

export const startPayment = async ({
  plan,
  reportId,
  name,
  email,
  onSuccess,
  onError,
}: StartPaymentOptions) => {
  try {
    const response = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, reportId, name, email }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as ApiError;
      throw new Error(payload.error || "Unable to create order");
    }

    const payload = (await response.json()) as ApiResponse<CreateOrderResponse>;
    if (!payload.success) {
      throw new Error(payload.error || "Unable to create order");
    }

    const order = payload.data;

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      throw new Error("Razorpay SDK failed to load");
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "PathPilot",
      description: planLabel[plan],
      order_id: order.orderId,
      prefill: {
        name,
        email,
      },
      theme: {
        color: "#E94560",
      },
      handler: async (paymentResponse: {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) => {
        try {
          const paymentId = paymentResponse.razorpay_payment_id ?? `pay_${Date.now()}`;
          const razorpayOrderId = paymentResponse.razorpay_order_id ?? order.orderId;
          const razorpaySignature = paymentResponse.razorpay_signature ?? "";

          const verified = await verifyPayment(
            plan,
            razorpayOrderId,
            paymentId,
            razorpaySignature
          );

          onSuccess({
            paymentId,
            unlockToken: verified.unlockToken,
            plan,
            verified: verified.verified,
            reportId: verified.reportId,
          });
        } catch (verificationError) {
          const message =
            verificationError instanceof Error
              ? verificationError.message
              : "Payment verification failed";
          onError?.(message);
        }
      },
      modal: {
        ondismiss: () => {
          onError?.("Payment cancelled");
        },
      },
    });

    checkout.open();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment failed";
    onError?.(message);
  }
};
