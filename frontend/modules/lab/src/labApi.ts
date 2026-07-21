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

export interface CurrentUser {
  user_id: number;
  role: string;
  permissions: string[];
}

export async function me(): Promise<CurrentUser> {
  const res = await authedFetch("/auth/me");
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load current user."));
  return res.json();
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

export async function searchLabCatalog(q: string): Promise<LabTestCatalogSearchResponse> {
  const res = await authedFetch(`/lab/catalog?q=${encodeURIComponent(q)}&limit=20`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not search the test catalog."));
  return res.json();
}

export type LabOrderStatus = "ordered" | "completed";

export interface LabTestCatalogItem {
  catalog_id: number;
  loinc_code: string;
  test_name: string;
  default_reference_range: string | null;
}

export interface LabTestCatalogSearchResponse {
  items: LabTestCatalogItem[];
  total: number;
}

export interface LabOrderCreateInput {
  patient_id: number;
  consult_id?: number;
  // Either catalog_id (preferred) or test_name (free-text fallback) -
  // see NewLabOrderForm's two-mode picker.
  catalog_id?: number;
  test_code?: string;
  test_name?: string;
}

export interface LabResultIn {
  result_data: string;
  reference_range?: string;
}

export interface LabResultOut {
  result_id: number;
  result_data: string;
  reference_range: string | null;
  uploaded_by: number;
  uploaded_at: string;
}

export interface LabOrder {
  order_id: number;
  patient_id: number;
  consult_id: number | null;
  catalog_id: number | null;
  test_code: string | null;
  test_name: string;
  status: LabOrderStatus;
  ordered_by: number;
  ordered_at: string;
  result: LabResultOut | null;
  catalog: LabTestCatalogItem | null;
}

export interface LabOrderListItem {
  order_id: number;
  patient_id: number;
  consult_id: number | null;
  test_name: string;
  status: LabOrderStatus;
  ordered_at: string;
}

export interface LabOrderSearchResponse {
  items: LabOrderListItem[];
  total: number;
}

export async function listLabOrders(params: {
  patientId?: number;
  consultId?: number;
  status?: LabOrderStatus;
}): Promise<LabOrderSearchResponse> {
  const query = new URLSearchParams();
  if (params.patientId !== undefined) query.set("patient_id", String(params.patientId));
  if (params.consultId !== undefined) query.set("consult_id", String(params.consultId));
  if (params.status !== undefined) query.set("status", params.status);
  const res = await authedFetch(`/lab/orders?${query}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load lab orders."));
  return res.json();
}

export async function getLabOrder(orderId: number): Promise<LabOrder> {
  const res = await authedFetch(`/lab/orders/${orderId}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load lab order."));
  return res.json();
}

export async function createLabOrder(payload: LabOrderCreateInput): Promise<LabOrder> {
  const res = await authedFetch("/lab/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not save lab order."));
  return res.json();
}

export async function enterLabResult(orderId: number, payload: LabResultIn): Promise<LabOrder> {
  const res = await authedFetch(`/lab/orders/${orderId}/result`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not save result."));
  return res.json();
}
