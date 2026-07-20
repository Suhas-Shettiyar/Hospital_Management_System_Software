import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  List,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { opdApi, type PatientSearchResult } from "./api";
import PatientRegisterDrawer from "./PatientRegisterDrawer";
import { useCan } from "./useCan";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function age(dob: string): number {
  return dayjs().diff(dayjs(dob), "year");
}

/**
 * Entry point of the guided OPD workflow: find (or register) a patient,
 * then hand off to the consultation workspace. Search is debounced and
 * skipped below 2 characters to avoid hammering the backend on every
 * keystroke - mirrors the backend's own `len(q) < 2` short-circuit.
 */
export default function PatientSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const canRegister = useCan("patients:write");

  const { data, isFetching, isError } = useQuery({
    queryKey: ["opd", "patients", "search", debouncedQuery],
    queryFn: () => opdApi.searchPatients(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const results = data ?? [];
  const showEmpty = debouncedQuery.trim().length >= 2 && !isFetching && results.length === 0;

  const goToConsultation = (patient: PatientSearchResult) => {
    navigate(`/opd/consult/${patient.patient_id}`, { state: { patient } });
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Outpatient</Typography.Title>
        <Typography.Text type="secondary">Find a patient to start or continue a consultation</Typography.Text>
      </div>

      <Card>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            size="large"
            allowClear
            autoFocus
            placeholder="Search by name, phone, or UHID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            size="large"
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canRegister}
            onClick={() => setRegisterOpen(true)}
          >
            Register new
          </Button>
        </Space.Compact>

        <div style={{ marginTop: 16 }}>
          {isFetching && <Skeleton active paragraph={{ rows: 3 }} />}

          {isError && (
            <Empty description="Could not search patients right now. Check your connection and try again." />
          )}

          {!isFetching && showEmpty && (
            <Empty description={`No patient found matching "${debouncedQuery}"`}>
              {canRegister && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setRegisterOpen(true)}>
                  Register "{debouncedQuery}" as a new patient
                </Button>
              )}
            </Empty>
          )}

          {!isFetching && results.length > 0 && (
            <List
              itemLayout="horizontal"
              dataSource={results}
              renderItem={(patient) => (
                <List.Item
                  key={patient.patient_id}
                  className="opd-patient-row hoverable-lift"
                  onClick={() => goToConsultation(patient)}
                  actions={[<Button key="open" type="link" onClick={() => goToConsultation(patient)}>Open</Button>]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} style={{ background: "var(--brand-glow)" }} />}
                    title={patient.name}
                    description={
                      <Space size="middle" wrap>
                        <Tag>{patient.uhid}</Tag>
                        <span><PhoneOutlined /> {patient.phone}</span>
                        <span>{age(patient.dob)} yrs, {patient.gender}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}

          {debouncedQuery.trim().length < 2 && !isFetching && (
            <Typography.Text type="secondary">Type at least 2 characters to search.</Typography.Text>
          )}
        </div>
      </Card>

      <PatientRegisterDrawer
        open={registerOpen}
        initialName={query.trim().length >= 2 ? query.trim() : ""}
        onClose={() => setRegisterOpen(false)}
        onRegistered={(patient) => {
          setRegisterOpen(false);
          navigate(`/opd/consult/${patient.patient_id}`, { state: { patient } });
        }}
      />
    </div>
  );
}
