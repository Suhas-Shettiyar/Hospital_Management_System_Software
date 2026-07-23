import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Select,
  Space,
  Divider,
  App as AntApp,
  Tag,
} from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import {
  searchPatients,
  getPatient,
  createConsultation,
  type PatientListItem,
} from "./opdApi";

interface FormValues {
  patient_id: number;
  chief_complaint: string;
  diagnosis_code?: string;
  diagnosis_text: string;
  notes?: string;
  prescription_instructions?: string;
  items?: { med_name: string; dose: string; frequency: string; duration: string }[];
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

export default function NewConsultationForm() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const debouncedQuery = useDebounced(patientQuery, 300);

  const lockedPatientId = searchParams.get("patient") ? Number(searchParams.get("patient")) : undefined;

  const { data: lockedPatient } = useQuery({
    queryKey: ["opd", "patient", lockedPatientId],
    queryFn: () => getPatient(lockedPatientId as number),
    enabled: lockedPatientId !== undefined,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["opd", "patient-search", debouncedQuery],
    queryFn: () => searchPatients(debouncedQuery),
    enabled: !lockedPatientId && debouncedQuery.trim().length >= 2,
  });

  useEffect(() => {
    if (lockedPatientId) form.setFieldValue("patient_id", lockedPatientId);
  }, [lockedPatientId, form]);

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const consult = await createConsultation({
        patient_id: values.patient_id,
        chief_complaint: values.chief_complaint,
        diagnosis_code: values.diagnosis_code || undefined,
        diagnosis_text: values.diagnosis_text,
        notes: values.notes || undefined,
        prescription_instructions: values.prescription_instructions || undefined,
        items: values.items ?? [],
      });
      message.success("Consultation saved");
      navigate(`/opd?patient=${consult.patient_id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save consultation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>New Consultation</Typography.Title>
        <Typography.Text type="secondary">Record a visit - diagnosis, notes, and prescription</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20, maxWidth: 640 } }}>
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

          <Form.Item
            name="chief_complaint"
            label="Chief complaint"
            rules={[{ required: true, message: "Enter the chief complaint" }]}
          >
            <Input.TextArea rows={2} autoFocus={!lockedPatientId} />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="diagnosis_code" label="Diagnosis code (ICD-10, optional)" style={{ width: "35%" }}>
              <Input placeholder="e.g. R50.9" />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="diagnosis_text"
            label="Diagnosis"
            rules={[{ required: true, message: "Enter a diagnosis" }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>Prescription (optional - leave empty for advice-only visits)</Divider>

          <Form.Item name="prescription_instructions" label="General instructions">
            <Input placeholder="e.g. Take after food" />
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8 }} wrap>
                    <Form.Item {...rest} name={[name, "med_name"]} rules={[{ required: true, message: "Medicine" }]}>
                      <Input placeholder="Medicine name" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, "dose"]} rules={[{ required: true, message: "Dose" }]}>
                      <Input placeholder="Dose e.g. 1 tablet" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, "frequency"]} rules={[{ required: true, message: "Frequency" }]}>
                      <Input placeholder="Frequency e.g. 1-0-1" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, "duration"]} rules={[{ required: true, message: "Duration" }]}>
                      <Input placeholder="Duration e.g. 5 days" style={{ width: 140 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    Add medicine
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Button type="primary" htmlType="submit" loading={submitting} size="large">
            Save Consultation
          </Button>
        </Form>
      </Card>
    </div>
  );
}
