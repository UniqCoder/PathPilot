import { Resend } from "resend";

type PaymentEmailInput = {
  email: string;
  plan: string;
  amount: number;
  paymentId: string;
};

const getResendClient = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
};

const fromAddress = process.env.MAIL_FROM || "PathPilot <noreply@pathpilot.in>";

export const sendWelcomeEmail = async (email: string, fullName?: string) => {
  const client = getResendClient();
  if (!client) return { sent: false, reason: "RESEND_API_KEY missing" };

  const name = fullName?.trim() || "there";

  await client.emails.send({
    from: fromAddress,
    to: email,
    subject: "Welcome to PathPilot",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#101828">
      <h2>Welcome to PathPilot, ${name}.</h2>
      <p>Your account is ready. You can now generate and save career-risk reports, unlock premium roadmaps, and track progress from your dashboard.</p>
      <p>Start now: <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/intake">Create your report</a></p>
    </div>`,
  });

  return { sent: true };
};

export const sendPaymentConfirmationEmail = async ({
  email,
  plan,
  amount,
  paymentId,
}: PaymentEmailInput) => {
  const client = getResendClient();
  if (!client) return { sent: false, reason: "RESEND_API_KEY missing" };

  await client.emails.send({
    from: fromAddress,
    to: email,
    subject: "PathPilot payment confirmation",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#101828">
      <h2>Payment confirmed</h2>
      <p>Thanks for your purchase. Your unlock is active now.</p>
      <ul>
        <li>Plan: ${plan}</li>
        <li>Amount: INR ${(amount / 100).toFixed(2)}</li>
        <li>Payment ID: ${paymentId}</li>
      </ul>
      <p>You can continue from your dashboard.</p>
    </div>`,
  });

  return { sent: true };
};
