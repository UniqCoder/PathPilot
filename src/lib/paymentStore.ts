import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { PaymentPlan } from "./paymentRules";

export type StoredPaymentRecord = {
  token: string;
  plan: PaymentPlan;
  orderId: string;
  paymentId: string;
  signature: string;
  paymentStatus: string;
  verified: boolean;
  source: "verify" | "mock" | "webhook";
  expiresAt: string | null;
  createdAt: string;
};

type StoredWebhookEvent = {
  id: string;
  event: string;
  signatureVerified: boolean;
  createdAt: string;
  payload: Record<string, unknown>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const PAYMENTS_FILE = path.join(DATA_DIR, "payment_records.json");
const WEBHOOKS_FILE = path.join(DATA_DIR, "payment_webhooks.json");

const ensureFile = async (filePath: string) => {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch (error) {
    await writeFile(filePath, "[]", "utf8");
  }
};

const readList = async <T>(filePath: string) => {
  await ensureFile(filePath);
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw) as T[];
  } catch (error) {
    return [];
  }
};

const writeList = async <T>(filePath: string, items: T[]) => {
  await ensureFile(filePath);
  await writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
};

export const appendPaymentRecord = async (record: StoredPaymentRecord) => {
  const records = await readList<StoredPaymentRecord>(PAYMENTS_FILE);
  records.push(record);
  await writeList(PAYMENTS_FILE, records);
};

export const findPaymentByToken = async (token: string) => {
  const records = await readList<StoredPaymentRecord>(PAYMENTS_FILE);
  return records.find((record) => record.token === token) ?? null;
};

export const appendWebhookEvent = async (event: StoredWebhookEvent) => {
  const events = await readList<StoredWebhookEvent>(WEBHOOKS_FILE);
  events.push(event);
  const latest = events.slice(-200);
  await writeList(WEBHOOKS_FILE, latest);
};
