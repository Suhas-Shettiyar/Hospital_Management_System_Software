import { get } from "../../lib/api";
import { getToken } from "../../lib/authToken";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type AppointmentStatus = "waiting" | "in_consult" | "done";

export interface Appointment {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  patient_uhid: string;
  doctor_id: number;
  doctor_name: string;
  token_no: number;
  status: AppointmentStatus;
  scheduled_at: string;
  created_at: string;
}

export interface Doctor {
  user_id: number;
  name: string;
  role: string;
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

export function listQueue(doctorId?: number) {
  const params = new URLSearchParams();
  if (doctorId != null) params.set("doctor_id", String(doctorId));
  const qs = params.toString();
  return get<Appointment[]>(`/queue${qs ? `?${qs}` : ""}`);
}

export function listDoctors() {
  return get<Doctor[]>("/auth/staff?role=doctor");
}

export async function createToken(patientId: number, doctorId: number): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ patient_id: patientId, doctor_id: doctorId }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not create a token."));
  return res.json() as Promise<Appointment>;
}

export async function updateStatus(appointmentId: number, appointmentStatus: AppointmentStatus): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/queue/${appointmentId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ status: appointmentStatus }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not update the token."));
  return res.json() as Promise<Appointment>;
}
