import { get } from "../../lib/api";
import { getToken } from "../../lib/authToken";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type BillStatus = "draft" | "finalized" | "paid" | "cancelled";
export type PaymentMode = "cash" | "upi" | "card" | "other";

export interface BillItem {
  item_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  subtotal: number;
  gst_amount: number;
  line_total: number;
}

export interface Payment {
  payment_id: number;
  amount: number;
  mode: PaymentMode;
  reference_number: string | null;
  received_by: number;
  received_at: string;
}

export interface Bill {
  bill_id: number;
  patient_id: number;
  status: BillStatus;
  total: number;
  created_by: number;
  created_at: string;
  finalized_at: string | null;
  items: BillItem[];
  payments: Payment[];
  amount_paid: number;
  balance_due: number;
}

export interface BillListItem {
  bill_id: number;
  patient_id: number;
  status: BillStatus;
  total: number;
  created_at: string;
  finalized_at: string | null;
}

export interface BillSearchResponse {
  items: BillListItem[];
  total: number;
}

export interface BillItemCreateInput {
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
}

export interface PaymentCreateInput {
  amount: number;
  mode: PaymentMode;
  reference_number?: string;
}

export interface DailyReport {
  date: string;
  total_billed: number;
  bill_count: number;
  total_collected: number;
  by_mode: { mode: string; amount: number }[];
}

/** Duplicated from patientsApi.ts rather than sharing a module - same small
 * pattern (extract FastAPI's {"detail": "..."} shape), kept local so each
 * feature's API client stays independently readable. */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // response wasn't JSON - fall through to the generic message
  }
  return fallback;
}

async function authedPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Billing request failed."));
  return res.json() as Promise<T>;
}

async function authedDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Billing request failed."));
  return res.json() as Promise<T>;
}

export function listBills(params: { patientId?: number; status?: BillStatus; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params.patientId !== undefined) query.set("patient_id", String(params.patientId));
  if (params.status) query.set("status", params.status);
  query.set("limit", String(params.limit ?? 20));
  query.set("offset", String(params.offset ?? 0));
  return get<BillSearchResponse>(`/billing/bills?${query}`);
}

export function getBill(billId: number) {
  return get<Bill>(`/billing/bills/${billId}`);
}

export function createBill(patientId: number) {
  return authedPost<Bill>("/billing/bills", { patient_id: patientId });
}

export function addBillItem(billId: number, payload: BillItemCreateInput) {
  return authedPost<Bill>(`/billing/bills/${billId}/items`, payload);
}

export function removeBillItem(billId: number, itemId: number) {
  return authedDelete<Bill>(`/billing/bills/${billId}/items/${itemId}`);
}

export function finalizeBill(billId: number) {
  return authedPost<Bill>(`/billing/bills/${billId}/finalize`);
}

export function cancelBill(billId: number) {
  return authedPost<Bill>(`/billing/bills/${billId}/cancel`);
}

export function recordPayment(billId: number, payload: PaymentCreateInput) {
  return authedPost<Bill>(`/billing/bills/${billId}/payments`, payload);
}

export function getDailyReport(date: string) {
  return get<DailyReport>(`/billing/reports/daily?date=${date}`);
}
