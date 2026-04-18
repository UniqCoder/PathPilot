export type PaymentPlan = "battle-report-49" | "full-roadmap-99" | "shadow-you-99-month";

const DAY_MS = 24 * 60 * 60 * 1000;

export const paymentExpiryByPlan: Record<PaymentPlan, number | null> = {
  "battle-report-49": 30 * DAY_MS,
  "full-roadmap-99": 365 * DAY_MS,
  "shadow-you-99-month": 30 * DAY_MS,
};

export const getExpiryIso = (plan: PaymentPlan, baseDate = new Date()) => {
  const ttl = paymentExpiryByPlan[plan];
  if (!ttl) {
    return null;
  }
  return new Date(baseDate.getTime() + ttl).toISOString();
};
