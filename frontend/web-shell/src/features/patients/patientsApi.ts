import { get } from "../../lib/api";
import { getToken } from "../../lib/authToken";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export interface Patient {
  patient_id: number;
  uhid: string;
  abha_number: string | null;
  abha_address: string | null;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  address: string | null;
  blood_group: string | null;
  consent_status: string;
  created_at: string;
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

export interface PatientCreateInput {
  name: string;
  dob: string;
  gender: string;
  phone: string;
  address?: string;
  blood_group?: string;
  abha_number?: string;
  abha_address?: string;
  consent_obtained: boolean;
}

export type PatientUpdateInput = Partial<Omit<PatientCreateInput, "consent_obtained">> & {
  consent_status?: string;
};

/** Duplicated from authApi.ts rather than sharing a module - same small
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

export function listPatients(query: { q?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  params.set("limit", String(query.limit ?? 20));
  params.set("offset", String(query.offset ?? 0));
  return get<PatientSearchResponse>(`/patients?${params}`);
}

export function getPatient(patientId: number) {
  return get<Patient>(`/patients/${patientId}`);
}

export async function createPatient(data: PatientCreateInput): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not register patient."));
  return res.json() as Promise<Patient>;
}

export async function updatePatient(patientId: number, data: PatientUpdateInput): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients/${patientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not update patient."));
  return res.json() as Promise<Patient>;
}

export async function grantPortalAccess(patientId: number, email: string): Promise<{ detail: string }> {
  const res = await fetch(`${API_BASE}/patients/${patientId}/grant-portal-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not grant portal access."));
  return res.json();
}
