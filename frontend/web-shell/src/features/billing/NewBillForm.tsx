import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Card, Button, Select, App as AntApp, Tag } from "antd";
import { createBill } from "./billingApi";
import { getPatient, listPatients, type PatientListItem } from "../patients/patientsApi";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

export default function NewBillForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const debouncedQuery = useDebouncedValue(patientQuery, 300);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>();

  const lockedPatientId = searchParams.get("patient") ? Number(searchParams.get("patient")) : undefined;
  const effectivePatientId = lockedPatientId ?? selectedPatientId;

  const { data: lockedPatient } = useQuery({
    queryKey: ["billing", "patient", lockedPatientId],
    queryFn: () => getPatient(lockedPatientId as number),
    enabled: lockedPatientId !== undefined,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["billing", "patient-search", debouncedQuery],
    queryFn: () => listPatients({ q: debouncedQuery, limit: 8 }),
    enabled: !lockedPatientId && debouncedQuery.trim().length >= 2,
  });

  const onCreate = async () => {
    if (!effectivePatientId) {
      message.error("Select a patient first");
      return;
    }
    setSubmitting(true);
    try {
      const bill = await createBill(effectivePatientId);
      message.success("Draft bill created");
      navigate(`/billing?bill=${bill.bill_id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not create the bill.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>New Bill</Typography.Title>
        <Typography.Text type="secondary">Start a draft bill for a patient</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20, maxWidth: 480 } }}>
        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong>Patient</Typography.Text>
          <div style={{ marginTop: 8 }}>
            {lockedPatientId ? (
              <Tag color="processing" style={{ padding: "6px 12px", fontSize: 14 }}>
                {lockedPatient ? `${lockedPatient.name} · ${lockedPatient.uhid}` : "Loading patient..."}
              </Tag>
            ) : (
              <Select
                showSearch
                style={{ width: "100%" }}
                placeholder="Search patient by name, phone, or UHID"
                filterOption={false}
                onSearch={setPatientQuery}
                onChange={setSelectedPatientId}
                options={(searchResults?.items ?? []).map((p: PatientListItem) => ({
                  value: p.patient_id,
                  label: `${p.name} · ${p.uhid} · ${p.phone}`,
                }))}
              />
            )}
          </div>
        </div>

        <Button type="primary" size="large" loading={submitting} onClick={onCreate}>
          Create Draft Bill
        </Button>
      </Card>
    </div>
  );
}
