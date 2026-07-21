import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Card, Form, Input, Button, Select, App as AntApp, Tag } from "antd";
import { searchPatients, getPatient, listBeds, listDoctors, admitPatient, type PatientListItem, type Doctor } from "./ipdApi";

interface FormValues {
  patient_id: number;
  bed_id: number;
  admitting_doctor_id: number;
  admission_reason: string;
}

/** No debounce library available in this project - a small inline timer is
 * enough for a single search box. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function NewAdmissionForm() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const debouncedQuery = useDebounced(patientQuery, 300);

  const lockedPatientId = searchParams.get("patient") ? Number(searchParams.get("patient")) : undefined;
  const lockedBedId = searchParams.get("bed") ? Number(searchParams.get("bed")) : undefined;
  const consultId = searchParams.get("consult") ? Number(searchParams.get("consult")) : undefined;

  const { data: lockedPatient } = useQuery({
    queryKey: ["ipd", "patient", lockedPatientId],
    queryFn: () => getPatient(lockedPatientId as number),
    enabled: lockedPatientId !== undefined,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["ipd", "patient-search", debouncedQuery],
    queryFn: () => searchPatients(debouncedQuery),
    enabled: !lockedPatientId && debouncedQuery.trim().length >= 2,
  });

  const { data: beds } = useQuery({ queryKey: ["ipd", "beds"], queryFn: listBeds });
  const { data: doctors } = useQuery({ queryKey: ["ipd", "doctors"], queryFn: listDoctors });

  const lockedBed = beds?.find((b) => b.bed_id === lockedBedId);
  const vacantBeds = (beds ?? []).filter((b) => b.status === "vacant");

  useEffect(() => {
    if (lockedPatientId) form.setFieldValue("patient_id", lockedPatientId);
  }, [lockedPatientId, form]);
  useEffect(() => {
    if (lockedBedId) form.setFieldValue("bed_id", lockedBedId);
  }, [lockedBedId, form]);

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const admission = await admitPatient({
        patient_id: values.patient_id,
        bed_id: values.bed_id,
        admitting_doctor_id: values.admitting_doctor_id,
        admission_reason: values.admission_reason,
        consult_id: consultId,
      });
      message.success("Patient admitted");
      navigate(`/ipd?admission=${admission.admission_id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not admit the patient.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>New Admission</Typography.Title>
        <Typography.Text type="secondary">Admit a patient to a bed</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20, maxWidth: 480 } }}>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="patient_id" label="Patient" rules={[{ required: true, message: "Select a patient" }]}>
            {lockedPatientId ? (
              <Tag color="processing" style={{ padding: "6px 12px", fontSize: 14 }}>
                {lockedPatient ? `${lockedPatient.name} · ${lockedPatient.uhid}` : "Loading patient..."}
              </Tag>
            ) : (
              <Select
                showSearch
                placeholder="Search patient by name, phone, or UHID"
                filterOption={false}
                onSearch={setPatientQuery}
                options={(searchResults?.items ?? []).map((p: PatientListItem) => ({
                  value: p.patient_id,
                  label: `${p.name} · ${p.uhid} · ${p.phone}`,
                }))}
              />
            )}
          </Form.Item>

          <Form.Item name="bed_id" label="Bed" rules={[{ required: true, message: "Select a bed" }]}>
            {lockedBedId ? (
              <Tag color="processing" style={{ padding: "6px 12px", fontSize: 14 }}>
                {lockedBed ? `${lockedBed.ward_name} - Bed ${lockedBed.bed_number}` : "Loading bed..."}
              </Tag>
            ) : (
              <Select
                placeholder="Select a vacant bed"
                options={vacantBeds.map((b) => ({
                  value: b.bed_id,
                  label: `${b.ward_name} - Bed ${b.bed_number}`,
                }))}
              />
            )}
          </Form.Item>

          <Form.Item name="admitting_doctor_id" label="Admitting doctor" rules={[{ required: true, message: "Select a doctor" }]}>
            <Select
              placeholder="Select doctor"
              options={(doctors ?? []).map((d: Doctor) => ({ value: d.user_id, label: d.name }))}
            />
          </Form.Item>

          <Form.Item
            name="admission_reason"
            label="Admission reason"
            rules={[{ required: true, message: "Enter the reason for admission" }]}
          >
            <Input.TextArea rows={3} placeholder="e.g. Fever and dehydration, requires IV fluids" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={submitting} size="large">
            Admit Patient
          </Button>
        </Form>
      </Card>
    </div>
  );
}
