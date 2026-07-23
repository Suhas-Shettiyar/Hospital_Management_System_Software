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

export interface Doctor {
  user_id: number;
  name: string;
}

export type WardType = "general" | "icu" | "private" | "semi_private";
export type BedStatus = "vacant" | "occupied" | "maintenance";
export type AdmissionStatus = "admitted" | "discharged";

export interface Ward {
  ward_id: number;
  name: string;
  ward_type: WardType;
  daily_rate: number;
  created_at: string;
}

export interface BedBoardItem {
  bed_id: number;
  bed_number: string;
  status: BedStatus;
  ward_id: number;
  ward_name: string;
  ward_type: WardType;
  admission_id: number | null;
  patient_id: number | null;
  patient_name: string | null;
}

export interface WardCreateInput {
  name: string;
  ward_type: WardType;
  daily_rate: number;
}

export interface BedCreateInput {
  bed_number: string;
}

export interface BedAssignment {
  assignment_id: number;
  bed_id: number;
  bed_number: string;
  ward_name: string;
  assigned_at: string;
  released_at: string | null;
}

export interface VitalsRecord {
  record_id: number;
  recorded_by: number;
  recorded_at: string;
  temperature_celsius: number | null;
  pulse_bpm: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  spo2_percent: number | null;
  notes: string | null;
}

export interface VitalsCreateInput {
  temperature_celsius?: number;
  pulse_bpm?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  spo2_percent?: number;
  notes?: string;
}

export interface Admission {
  admission_id: number;
  patient_id: number;
  consult_id: number | null;
  admitting_doctor_id: number;
  admission_reason: string;
  status: AdmissionStatus;
  admitted_at: string;
  discharged_at: string | null;
  discharge_summary: string | null;
  bed_assignments: BedAssignment[];
  vitals: VitalsRecord[];
}

export interface AdmissionListItem {
  admission_id: number;
  patient_id: number;
  status: AdmissionStatus;
  admitted_at: string;
  discharged_at: string | null;
}

export interface AdmissionSearchResponse {
  items: AdmissionListItem[];
  total: number;
}

export interface AdmissionCreateInput {
  patient_id: number;
  bed_id: number;
  admitting_doctor_id: number;
  admission_reason: string;
  consult_id?: number;
}

export interface BillItemOut {
  item_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  subtotal: number;
  gst_amount: number;
  line_total: number;
}

export interface Bill {
  bill_id: number;
  patient_id: number;
  status: string;
  total: number;
  created_at: string;
  finalized_at: string | null;
  items: BillItemOut[];
  amount_paid: number;
  balance_due: number;
}

export async function listWards(): Promise<Ward[]> {
  const res = await authedFetch("/ipd/wards");
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load wards."));
  return res.json();
}

export async function createWard(payload: WardCreateInput): Promise<Ward> {
  const res = await authedFetch("/ipd/wards", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not create ward."));
  return res.json();
}

export async function createBed(wardId: number, payload: BedCreateInput): Promise<BedBoardItem> {
  const res = await authedFetch(`/ipd/wards/${wardId}/beds`, { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not add bed."));
  return res.json();
}

export async function listBeds(): Promise<BedBoardItem[]> {
  const res = await authedFetch("/ipd/beds");
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load the ward board."));
  return res.json();
}

export async function listDoctors(): Promise<Doctor[]> {
  const res = await authedFetch("/ipd/doctors");
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load doctors."));
  return res.json();
}

export async function admitPatient(payload: AdmissionCreateInput): Promise<Admission> {
  const res = await authedFetch("/ipd/admissions", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not admit the patient."));
  return res.json();
}

export async function listAdmissions(params: { patientId?: number; status?: AdmissionStatus }) {
  const query = new URLSearchParams();
  if (params.patientId !== undefined) query.set("patient_id", String(params.patientId));
  if (params.status) query.set("status", params.status);
  const res = await authedFetch(`/ipd/admissions?${query}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load admissions."));
  return res.json() as Promise<AdmissionSearchResponse>;
}

export async function getAdmission(admissionId: number): Promise<Admission> {
  const res = await authedFetch(`/ipd/admissions/${admissionId}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load the admission."));
  return res.json();
}

export async function moveBed(admissionId: number, newBedId: number): Promise<Admission> {
  const res = await authedFetch(`/ipd/admissions/${admissionId}/move-bed`, {
    method: "POST",
    body: JSON.stringify({ new_bed_id: newBedId }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not move the patient's bed."));
  return res.json();
}

export async function recordVitals(admissionId: number, payload: VitalsCreateInput): Promise<Admission> {
  const res = await authedFetch(`/ipd/admissions/${admissionId}/vitals`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not record vitals."));
  return res.json();
}

export async function generateRoomCharges(admissionId: number): Promise<Bill> {
  const res = await authedFetch(`/ipd/admissions/${admissionId}/generate-charges`, { method: "POST" });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not generate room charges."));
  return res.json();
}

export async function dischargePatient(admissionId: number, dischargeSummary: string): Promise<Admission> {
  const res = await authedFetch(`/ipd/admissions/${admissionId}/discharge`, {
    method: "POST",
    body: JSON.stringify({ discharge_summary: dischargeSummary }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not discharge the patient."));
  return res.json();
}
