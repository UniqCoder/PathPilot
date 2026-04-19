export type PaymentPlan = "battle-report-49" | "full-roadmap-99" | "shadow-you";

const DAY_MS = 24 * 60 * 60 * 1000;

export const paymentExpiryByPlan: Record<PaymentPlan, number | null> = {
  "battle-report-49": null,
  "full-roadmap-99": null,
  "shadow-you": 30 * DAY_MS,
};

export const getExpiryIso = (plan: PaymentPlan, baseDate = new Date()) => {
  const ttl = paymentExpiryByPlan[plan];
  if (!ttl) {
    return null;
  }
  return new Date(baseDate.getTime() + ttl).toISOString();
};
