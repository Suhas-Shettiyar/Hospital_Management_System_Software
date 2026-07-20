export declare class ApiError extends Error {
    status: number;
    constructor(status: number, detail: string);
}
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
export declare const opdApi: {
    me: () => Promise<CurrentUser>;
    searchPatients: (q: string) => Promise<PatientSearchResult[]>;
    getPatient: (patientId: number) => Promise<PatientOut>;
    registerPatient: (payload: PatientRegisterInput) => Promise<PatientOut>;
    createVisit: (patient_id: number, chief_complaint?: string) => Promise<VisitOut>;
    getVisit: (visitId: number) => Promise<VisitOut>;
    listVisitsForPatient: (patientId: number) => Promise<VisitSummaryOut[]>;
    updateVisit: (visitId: number, payload: {
        chief_complaint?: string;
        status?: string;
    }) => Promise<VisitOut>;
    addDiagnosis: (visitId: number, icd10_code: string | null, description: string) => Promise<DiagnosisOut>;
    addPrescription: (visitId: number, items: PrescriptionItemIn[]) => Promise<PrescriptionOut>;
    completeVisit: (visitId: number) => Promise<VisitOut>;
};
