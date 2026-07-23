import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Card, Form, Input, Button, Select, App as AntApp, Tag } from "antd";
import { searchPatients, getPatient, createLabOrder, type PatientListItem } from "./labApi";

interface FormValues {
  patient_id: number;
  test_code?: string;
  test_name: string;
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

export default function NewLabOrderForm() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const debouncedQuery = useDebounced(patientQuery, 300);

  const lockedPatientId = searchParams.get("patient") ? Number(searchParams.get("patient")) : undefined;
  const consultId = searchParams.get("consult") ? Number(searchParams.get("consult")) : undefined;

  const { data: lockedPatient } = useQuery({
    queryKey: ["lab", "patient", lockedPatientId],
    queryFn: () => getPatient(lockedPatientId as number),
    enabled: lockedPatientId !== undefined,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["lab", "patient-search", debouncedQuery],
    queryFn: () => searchPatients(debouncedQuery),
    enabled: !lockedPatientId && debouncedQuery.trim().length >= 2,
  });

  useEffect(() => {
    if (lockedPatientId) form.setFieldValue("patient_id", lockedPatientId);
  }, [lockedPatientId, form]);

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const order = await createLabOrder({
        patient_id: values.patient_id,
        consult_id: consultId,
        test_code: values.test_code || undefined,
        test_name: values.test_name,
      });
      message.success("Lab order created");
      navigate(`/lab?patient=${order.patient_id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save lab order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>New Lab Order</Typography.Title>
        <Typography.Text type="secondary">Order a test - standalone or linked to a consultation</Typography.Text>
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

          <Form.Item name="test_code" label="Test code (optional)">
            <Input placeholder="e.g. CBC-01" />
          </Form.Item>

          <Form.Item
            name="test_name"
            label="Test name"
            rules={[{ required: true, message: "Enter the test name" }]}
          >
            <Input placeholder="e.g. Complete Blood Count" autoFocus={!lockedPatientId} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={submitting} size="large">
            Order Test
          </Button>
        </Form>
      </Card>
    </div>
  );
}
