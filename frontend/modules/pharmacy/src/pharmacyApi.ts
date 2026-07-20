// This remote's own small fetch client - does NOT import the host's
// patientsApi.ts/authToken.ts (separate Vite project, same reasoning as
// moduleContract.ts's duplication). The auth token is read from the same
// localStorage key the host's login flow writes to - shared via same-origin
// browser storage, not shared JS module state.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_STORAGE_KEY = "hms-access-token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // response wasn't JSON - fall through to the generic message
  }
  return fallback;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

export interface PatientListItem {
  patient_id: number;
  uhid: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  consent_status: string;
}

export interface PatientSearchResponse {
  items: PatientListItem[];
  total: number;
}

export interface Patient extends PatientListItem {
  abha_number: string | null;
  abha_address: string | null;
  address: string | null;
  blood_group: string | null;
  created_at: string;
}

export async function searchPatients(q: string): Promise<PatientSearchResponse> {
  const res = await authedFetch(`/patients?q=${encodeURIComponent(q)}&limit=8`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not search patients."));
  return res.json();
}

export async function getPatient(patientId: number): Promise<Patient> {
  const res = await authedFetch(`/patients/${patientId}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load patient."));
  return res.json();
}

export interface MedicineBatch {
  batch_id: number;
  batch_number: string;
  expiry_date: string;
  quantity_on_hand: number;
  cost_price: number | null;
  mrp: number | null;
  received_at: string;
}

export interface Medicine {
  medicine_id: number;
  name: string;
  hsn_code: string | null;
  gst_rate: number | null;
  unit: string;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
  batches: MedicineBatch[];
}

export interface MedicineListItem {
  medicine_id: number;
  name: string;
  unit: string;
  reorder_level: number;
  is_active: boolean;
  total_quantity: number;
}

export interface MedicineSearchResponse {
  items: MedicineListItem[];
  total: number;
}

export interface MedicineCreateInput {
  name: string;
  hsn_code?: string;
  gst_rate?: number;
  unit: string;
  reorder_level?: number;
}

export interface MedicineBatchCreateInput {
  batch_number: string;
  expiry_date: string;
  quantity: number;
  cost_price?: number;
  mrp?: number;
}

export interface LowStockItem {
  medicine_id: number;
  name: string;
  unit: string;
  total_quantity: number;
  reorder_level: number;
}

export interface ExpiringBatchItem {
  batch_id: number;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity_on_hand: number;
  days_until_expiry: number;
}

export interface DispenseItemBatchAllocation {
  batch_id: number;
  batch_number: string;
  quantity_deducted: number;
}

export interface DispenseItemOut {
  item_id: number;
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  batch_allocations: DispenseItemBatchAllocation[];
}

export interface Dispense {
  dispense_id: number;
  patient_id: number;
  prescription_id: number | null;
  dispensed_by: number;
  dispensed_at: string;
  items: DispenseItemOut[];
}

export interface DispenseItemInput {
  medicine_id: number;
  quantity: number;
}

export interface DispenseCreateInput {
  patient_id: number;
  prescription_id?: number;
  items: DispenseItemInput[];
}

export async function listMedicines(params: {
  q?: string;
  lowStockOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<MedicineSearchResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.lowStockOnly) query.set("low_stock_only", "true");
  query.set("limit", String(params.limit ?? 20));
  query.set("offset", String(params.offset ?? 0));
  const res = await authedFetch(`/pharmacy/medicines?${query}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load medicines."));
  return res.json();
}

export async function getMedicine(medicineId: number): Promise<Medicine> {
  const res = await authedFetch(`/pharmacy/medicines/${medicineId}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load medicine."));
  return res.json();
}

export async function createMedicine(payload: MedicineCreateInput): Promise<Medicine> {
  const res = await authedFetch("/pharmacy/medicines", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not save medicine."));
  return res.json();
}

export async function receiveBatch(medicineId: number, payload: MedicineBatchCreateInput): Promise<Medicine> {
  const res = await authedFetch(`/pharmacy/medicines/${medicineId}/batches`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not receive stock."));
  return res.json();
}

export async function lowStockAlerts(): Promise<LowStockItem[]> {
  const res = await authedFetch("/pharmacy/alerts/low-stock");
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load low-stock alerts."));
  return res.json();
}

export async function expiringAlerts(days = 30): Promise<ExpiringBatchItem[]> {
  const res = await authedFetch(`/pharmacy/alerts/expiring?days=${days}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load expiry alerts."));
  return res.json();
}

export async function createDispense(payload: DispenseCreateInput): Promise<Dispense> {
  const res = await authedFetch("/pharmacy/dispenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not save dispense."));
  return res.json();
}
