import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Card, Form, Input, Button, Select, DatePicker, App as AntApp, Tag } from "antd";
import dayjs from "dayjs";
import {
  searchPatients,
  getPatient,
  listDoctors,
  createAppointment,
  type PatientListItem,
  type Doctor,
} from "./appointmentsApi";

interface FormValues {
  patient_id: number;
  doctor_id: number;
  scheduled_at: dayjs.Dayjs;
  reason?: string;
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

export default function NewAppointmentForm() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const debouncedQuery = useDebounced(patientQuery, 300);

  const lockedPatientId = searchParams.get("patient") ? Number(searchParams.get("patient")) : undefined;

  const { data: lockedPatient } = useQuery({
    queryKey: ["appointments", "patient", lockedPatientId],
    queryFn: () => getPatient(lockedPatientId as number),
    enabled: lockedPatientId !== undefined,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["appointments", "patient-search", debouncedQuery],
    queryFn: () => searchPatients(debouncedQuery),
    enabled: !lockedPatientId && debouncedQuery.trim().length >= 2,
  });

  const { data: doctors } = useQuery({ queryKey: ["appointments", "doctors"], queryFn: listDoctors });

  useEffect(() => {
    if (lockedPatientId) form.setFieldValue("patient_id", lockedPatientId);
  }, [lockedPatientId, form]);

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await createAppointment({
        patient_id: values.patient_id,
        doctor_id: values.doctor_id,
        scheduled_at: values.scheduled_at.toISOString(),
        reason: values.reason || undefined,
      });
      message.success("Appointment booked");
      navigate("/appointments");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not book the appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Book Appointment</Typography.Title>
        <Typography.Text type="secondary">Schedule a visit for a patient</Typography.Text>
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

          <Form.Item name="doctor_id" label="Doctor" rules={[{ required: true, message: "Select a doctor" }]}>
            <Select
              placeholder="Select doctor"
              options={(doctors ?? []).map((d: Doctor) => ({ value: d.user_id, label: d.name }))}
            />
          </Form.Item>

          <Form.Item
            name="scheduled_at"
            label="Date & time"
            rules={[{ required: true, message: "Select the date and time" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} format="DD MMM YYYY, HH:mm" minDate={dayjs()} />
          </Form.Item>

          <Form.Item name="reason" label="Reason (optional)">
            <Input placeholder="e.g. Follow-up, fever" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={submitting} size="large">
            Book Appointment
          </Button>
        </Form>
      </Card>
    </div>
  );
}
