import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Form,
  Button,
  Select,
  Space,
  InputNumber,
  App as AntApp,
  Tag,
} from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import {
  searchPatients,
  getPatient,
  listMedicines,
  createDispense,
  type PatientListItem,
  type MedicineListItem,
} from "./pharmacyApi";
import { useCan } from "./useCan";

interface FormValues {
  patient_id: number;
  items: { medicine_id: number; quantity: number }[];
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

/** Each dispense line gets its own searchable medicine picker, so typing in
 * one row's box doesn't affect another row's options. */
function MedicineLineSelect({ name, rest }: { name: number; rest: Record<string, unknown> }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);

  const { data } = useQuery({
    queryKey: ["pharmacy", "medicine-search", debouncedQuery],
    queryFn: () => listMedicines({ q: debouncedQuery, limit: 20 }),
  });

  return (
    <Form.Item {...rest} name={[name, "medicine_id"]} rules={[{ required: true, message: "Select a medicine" }]}>
      <Select
        showSearch
        placeholder="Search medicine by name"
        filterOption={false}
        onSearch={setQuery}
        style={{ width: 260 }}
        options={(data?.items ?? []).map((m: MedicineListItem) => ({
          value: m.medicine_id,
          label: `${m.name} (${m.total_quantity} ${m.unit} in stock)`,
        }))}
      />
    </Form.Item>
  );
}

export default function DispensePage() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const canDispense = useCan("pharmacy:dispense");
  const [patientQuery, setPatientQuery] = useState("");
  const debouncedPatientQuery = useDebounced(patientQuery, 300);

  const lockedPatientId = searchParams.get("patient") ? Number(searchParams.get("patient")) : undefined;
  const prescriptionId = searchParams.get("prescription") ? Number(searchParams.get("prescription")) : undefined;

  const { data: lockedPatient } = useQuery({
    queryKey: ["pharmacy", "patient", lockedPatientId],
    queryFn: () => getPatient(lockedPatientId as number),
    enabled: lockedPatientId !== undefined,
  });

  const { data: patientResults } = useQuery({
    queryKey: ["pharmacy", "patient-search", debouncedPatientQuery],
    queryFn: () => searchPatients(debouncedPatientQuery),
    enabled: !lockedPatientId && debouncedPatientQuery.trim().length >= 2,
  });

  useEffect(() => {
    if (lockedPatientId) form.setFieldValue("patient_id", lockedPatientId);
  }, [lockedPatientId, form]);

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const dispense = await createDispense({
        patient_id: values.patient_id,
        prescription_id: prescriptionId,
        items: values.items,
      });
      message.success("Dispensed successfully");
      navigate(`/pharmacy?patient=${dispense.patient_id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not complete the dispense.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Dispense Medicine</Typography.Title>
        <Typography.Text type="secondary">Stock is auto-deducted from the earliest-expiring batch first</Typography.Text>
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
                options={(patientResults?.items ?? []).map((p: PatientListItem) => ({
                  value: p.patient_id,
                  label: `${p.name} · ${p.uhid} · ${p.phone}`,
                }))}
              />
            )}
          </Form.Item>

          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8 }} wrap>
                    <MedicineLineSelect name={name} rest={rest} />
                    <Form.Item {...rest} name={[name, "quantity"]} rules={[{ required: true, message: "Qty" }]}>
                      <InputNumber min={1} placeholder="Qty" style={{ width: 100 }} />
                    </Form.Item>
                    {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} />}
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    Add another medicine
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Button type="primary" htmlType="submit" loading={submitting} disabled={!canDispense} size="large">
            Dispense
          </Button>
        </Form>
      </Card>
    </div>
  );
}
