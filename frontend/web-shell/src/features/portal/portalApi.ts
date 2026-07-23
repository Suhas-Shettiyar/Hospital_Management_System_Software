import { get } from "../../lib/api";
import { getToken } from "../../lib/authToken";
import type { Patient } from "../patients/patientsApi";
import type { Bill, BillSearchResponse } from "../billing/billingApi";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

// Consultation/LabOrder/Appointment shapes are duplicated here rather than
// imported - OPD/Lab/Appointments are separate Vite remote projects (module
// federation boundary), the same reasoning every remote's own API client
// already documents for why it can't share types across that boundary.
// Billing lives in this same web-shell project though, so its types ARE
// imported directly above.

export interface PrescriptionItem {
  item_id: number;
  med_name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  rx_id: number;
  instructions: string | null;
  items: PrescriptionItem[];
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
  prescription: Prescription | null;
}

export interface ConsultationSearchResponse {
  items: Consultation[];
  total: number;
}

export interface LabResult {
  result_id: number;
  result_data: string;
  reference_range: string | null;
  uploaded_by: number;
  uploaded_at: string;
}

export interface LabOrder {
  order_id: number;
  patient_id: number;
  test_code: string | null;
  test_name: string;
  status: "ordered" | "completed";
  ordered_at: string;
  result: LabResult | null;
}

export interface LabOrderSearchResponse {
  items: LabOrder[];
  total: number;
}

export interface Doctor {
  user_id: number;
  name: string;
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
}

export interface AppointmentSearchResponse {
  items: Appointment[];
  total: number;
}

export interface AppointmentBookInput {
  doctor_id: number;
  scheduled_at: string;
  reason?: string;
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

export function getMyPatientRecord() {
  return get<Patient>("/portal/me");
}

export function listMyConsultations() {
  return get<ConsultationSearchResponse>("/portal/consultations");
}

export function listMyLabOrders() {
  return get<LabOrderSearchResponse>("/portal/lab-orders");
}

export function listMyBills() {
  return get<BillSearchResponse>("/portal/bills");
}

export function getMyBill(billId: number) {
  return get<Bill>(`/portal/bills/${billId}`);
}

export function listMyAppointments() {
  return get<AppointmentSearchResponse>("/portal/appointments");
}

export function listDoctors() {
  return get<Doctor[]>("/portal/doctors");
}

export async function bookAppointment(payload: AppointmentBookInput): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/portal/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Could not book the appointment."));
  return res.json() as Promise<Appointment>;
}
