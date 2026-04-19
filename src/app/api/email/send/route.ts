import { apiError, apiSuccess } from "@/lib/apiResponse";
import { sendPaymentConfirmationEmail, sendWelcomeEmail } from "@/lib/email";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

type SendEmailBody = {
  type?: "welcome" | "payment";
  email?: string;
  fullName?: string;
  plan?: string;
  amount?: number;
  paymentId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendEmailBody;

    if (!body?.type) {
      return apiError("Missing email type", 400);
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const fallbackEmail = user?.email || "";

    if (body.type === "welcome") {
      const email = body.email?.trim() || fallbackEmail;
      if (!email) {
        return apiError("Missing recipient email", 400);
      }

      const result = await sendWelcomeEmail(email, body.fullName || user?.user_metadata?.full_name);
      return apiSuccess({ sent: result.sent });
    }

    const email = body.email?.trim() || fallbackEmail;
    if (!email || !body.plan || typeof body.amount !== "number" || !body.paymentId) {
      return apiError("Missing payment email fields", 400);
    }

    const result = await sendPaymentConfirmationEmail({
      email,
      plan: body.plan,
      amount: body.amount,
      paymentId: body.paymentId,
    });

    return apiSuccess({ sent: result.sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return apiError(message, 500);
  }
}
