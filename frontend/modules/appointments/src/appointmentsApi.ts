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
  email: string;
  name: string;
  role: string;
  status: string;
  is_verified: boolean;
  created_at: string;
}

export type AppointmentStatus = "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  status: AppointmentStatus;
  reason: string | null;
  checked_in_at: string | null;
  created_by: number;
  created_at: string;
}

export interface AppointmentListItem {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  status: AppointmentStatus;
  reason: string | null;
  checked_in_at: string | null;
}

export interface AppointmentSearchResponse {
  items: AppointmentListItem[];
  total: number;
}

export interface AppointmentCreateInput {
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  reason?: string;
}

export async function listDoctors(): Promise<Doctor[]> {
  const res = await authedFetch("/appointments/doctors");
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load doctors."));
  return res.json();
}

export async function listAppointments(params: {
  status?: AppointmentStatus;
  patientId?: number;
}): Promise<AppointmentSearchResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.patientId !== undefined) query.set("patient_id", String(params.patientId));
  const res = await authedFetch(`/appointments?${query}`);
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not load appointments."));
  return res.json();
}

export async function createAppointment(payload: AppointmentCreateInput): Promise<Appointment> {
  const res = await authedFetch("/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not book the appointment."));
  return res.json();
}

async function transition(appointmentId: number, action: string, fallback: string): Promise<Appointment> {
  const res = await authedFetch(`/appointments/${appointmentId}/${action}`, { method: "POST" });
  if (!res.ok) throw new Error(await extractErrorMessage(res, fallback));
  return res.json();
}

export const checkIn = (appointmentId: number) => transition(appointmentId, "check-in", "Could not check in.");
export const completeAppointment = (appointmentId: number) =>
  transition(appointmentId, "complete", "Could not complete the appointment.");
export const cancelAppointment = (appointmentId: number) =>
  transition(appointmentId, "cancel", "Could not cancel the appointment.");
export const markNoShow = (appointmentId: number) =>
  transition(appointmentId, "no-show", "Could not mark as no-show.");
