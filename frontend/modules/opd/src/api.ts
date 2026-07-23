/**
 * Local API client for the OPD remote (duplicated from the host's
 * lib/api.ts pattern, not imported - same federation-isolation rule as
 * moduleContract.ts). Reads the JWT from the same localStorage key the
 * host's AuthProvider writes to, so a logged-in session in the shell is
 * automatically usable here too.
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_STORAGE_KEY = "hms_access_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    // response wasn't JSON - fall through to generic message
  }
  return `Request failed with status ${res.status}`;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, await parseErrorDetail(res));
  return res.json() as Promise<T>;
}

async function send<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await parseErrorDetail(res));
  return res.json() as Promise<T>;
}

// --- Shapes matching backend/app/modules/opd/schemas.py ---

export interface PatientSearchResult {
  patient_id: number;
  uhid: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
}

export interface PatientOut {
  patient_id: number;
  uhid: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  address: string | null;
  blood_group: string | null;
}

export interface PatientRegisterInput {
  name: string;
  dob: string;
  gender: string;
  phone: string;
  address?: string | null;
  blood_group?: string | null;
}

export interface DiagnosisOut {
  diagnosis_id: number;
  icd10_code: string | null;
  description: string;
  created_at: string;
}

export interface PrescriptionItemIn {
  medicine_name: string;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
}

export interface PrescriptionItemOut extends PrescriptionItemIn {
  item_id: number;
}

export interface PrescriptionOut {
  prescription_id: number;
  created_at: string;
  items: PrescriptionItemOut[];
}

export interface VisitOut {
  visit_id: number;
  patient_id: number;
  doctor_id: number;
  chief_complaint: string | null;
  status: "open" | "completed";
  created_at: string;
  updated_at: string | null;
  diagnoses: DiagnosisOut[];
  prescriptions: PrescriptionOut[];
}

export interface VisitSummaryOut {
  visit_id: number;
  chief_complaint: string | null;
  status: "open" | "completed";
  created_at: string;
}

export interface CurrentUser {
  user_id: number;
  role: string;
  permissions: string[];
}

export const opdApi = {
  me: () => get<CurrentUser>("/auth/me"),
  searchPatients: (q: string) =>
    get<PatientSearchResult[]>(`/opd/patients/search?q=${encodeURIComponent(q)}`),
  getPatient: (patientId: number) => get<PatientOut>(`/opd/patients/${patientId}`),
  registerPatient: (payload: PatientRegisterInput) =>
    send<PatientOut>("POST", "/opd/patients", payload),
  createVisit: (patient_id: number, chief_complaint?: string) =>
    send<VisitOut>("POST", "/opd/visits", { patient_id, chief_complaint }),
  getVisit: (visitId: number) => get<VisitOut>(`/opd/visits/${visitId}`),
  listVisitsForPatient: (patientId: number) =>
    get<VisitSummaryOut[]>(`/opd/visits?patient_id=${patientId}`),
  updateVisit: (visitId: number, payload: { chief_complaint?: string; status?: string }) =>
    send<VisitOut>("PATCH", `/opd/visits/${visitId}`, payload),
  addDiagnosis: (visitId: number, icd10_code: string | null, description: string) =>
    send<DiagnosisOut>("POST", `/opd/visits/${visitId}/diagnosis`, { icd10_code, description }),
  addPrescription: (visitId: number, items: PrescriptionItemIn[]) =>
    send<PrescriptionOut>("POST", `/opd/visits/${visitId}/prescription`, { items }),
  completeVisit: (visitId: number) => send<VisitOut>("POST", `/opd/visits/${visitId}/complete`, {}),
};
