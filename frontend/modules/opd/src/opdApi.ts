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

export interface PrescriptionItemIn {
  med_name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionItemOut extends PrescriptionItemIn {
  item_id: number;
}

export interface PrescriptionOut {
  rx_id: number;
  instructions: string | null;
  items: PrescriptionItemOut[];
}

export interface ConsultationCreateInput {
  patient_id: number;
  chief_complaint: string;
  diagnosis_code?: string;
  diagnosis_text: string;
  notes?: string;
  prescription_instructions?: string;
  items: PrescriptionItemIn[];
}

export interface Consultation {
  consult_id: number;
  patient_id: number;
  doctor_id: number;
  chief_complaint: string;
  diagnosis_code: string | null;
  diagnosis_text: string;
  notes: string | null;
  consult_date: string;
  created_at: string;
  prescription: PrescriptionOut | null;
}

export interface ConsultationListItem {
  consult_id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis_text: string;
  consult_date: string;
  has_prescription: boolean;
}

export interface ConsultationSearchResponse {
  items: ConsultationListItem[];
  total: number;
}

export async function listConsultations(patientId?: number): Promise<ConsultationSearchResponse> {
  const params = new URLSearchParams();
  if (patientId !== undefined) params.set("patient_id", String(patientId));
  const res = await authedFetch(`/opd/consultations?${params}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load consultations."));
  return res.json();
}

export async function getConsultation(consultId: number): Promise<Consultation> {
  const res = await authedFetch(`/opd/consultations/${consultId}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load consultation."));
  return res.json();
}

export async function createConsultation(payload: ConsultationCreateInput): Promise<Consultation> {
  const res = await authedFetch("/opd/consultations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not save consultation."));
  return res.json();
}
