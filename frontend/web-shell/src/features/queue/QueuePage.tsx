import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Typography, Select, Button, Card, List, Tag, Avatar, Empty, Skeleton, Space, App as AntApp } from "antd";
import { PlusOutlined, UserOutlined, RightCircleOutlined } from "@ant-design/icons";
import { listQueue, listDoctors, createToken, updateStatus, type Appointment, type AppointmentStatus } from "./queueApi";
import { listPatients } from "../patients/patientsApi";
import { useCan } from "../auth/useCan";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

const COLUMNS: { status: AppointmentStatus; title: string }[] = [
  { status: "waiting", title: "Waiting" },
  { status: "in_consult", title: "In consult" },
  { status: "done", title: "Done" },
];

/** A quick inline patient search used only to pick a patient when issuing a
 * new token - not the full registration flow (that's the Patients feature). */
function NewTokenPicker({ doctorId, onClose }: { doctorId: number | undefined; onClose: () => void }) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();

  const { data, isFetching } = useQuery({
    queryKey: ["patients", "search-for-token", debouncedQ],
    queryFn: () => listPatients({ q: debouncedQ, limit: 10 }),
    enabled: debouncedQ.trim().length >= 2,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (patientId: number) => createToken(patientId, doctorId!),
    onSuccess: () => {
      message.success("Token issued");
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      onClose();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not issue a token."),
  });

  return (
    <Card size="small" style={{ marginBottom: 16 }} title="Issue a new token">
      <Select
        showSearch
        style={{ width: "100%" }}
        placeholder="Search by name, phone, or UHID"
        filterOption={false}
        searchValue={q}
        onSearch={setQ}
        loading={isFetching}
        disabled={isPending}
        notFoundContent={debouncedQ.trim().length < 2 ? "Type at least 2 characters" : <Empty />}
        options={(data?.items ?? []).map((p) => ({
          value: p.patient_id,
          label: `${p.name} — ${p.uhid} (${p.phone})`,
        }))}
        onSelect={(patientId: number) => mutate(patientId)}
      />
    </Card>
  );
}

/** Three-column queue board: Waiting / In consult / Done, per doctor.
 * Auto-refreshes so the front desk and clinicians see the same live state
 * without a manual reload. */
export default function QueuePage() {
  const [doctorId, setDoctorId] = useState<number | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const canWrite = useCan("queue:write");

  const { data: doctors } = useQuery({ queryKey: ["queue", "doctors"], queryFn: listDoctors });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["queue", doctorId],
    queryFn: () => listQueue(doctorId),
    refetchInterval: 5000,
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AppointmentStatus }) => updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queue"] }),
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not update the token."),
  });

  const byStatus = useMemo(() => {
    const grouped: Record<AppointmentStatus, Appointment[]> = { waiting: [], in_consult: [], done: [] };
    for (const a of appointments ?? []) grouped[a.status].push(a);
    return grouped;
  }, [appointments]);

  const callNext = () => {
    const next = [...byStatus.waiting].sort((a, b) => a.token_no - b.token_no)[0];
    if (next) advanceMutation.mutate({ id: next.appointment_id, status: "in_consult" });
  };

  const nextStatus: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
    waiting: "in_consult",
    in_consult: "done",
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Queue</Typography.Title>
        <Typography.Text type="secondary">Who's next, per doctor</Typography.Text>
      </div>

      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Select
          allowClear
          style={{ width: 260 }}
          placeholder="All doctors"
          value={doctorId}
          onChange={setDoctorId}
          options={(doctors ?? []).map((d) => ({ value: d.user_id, label: d.name }))}
        />
        {canWrite && (
          <Space>
            <Button icon={<RightCircleOutlined />} disabled={byStatus.waiting.length === 0} onClick={callNext}>
              Call next
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!doctorId}
              onClick={() => setPickerOpen((v) => !v)}
            >
              New token
            </Button>
          </Space>
        )}
      </Space>

      {pickerOpen && canWrite && <NewTokenPicker doctorId={doctorId} onClose={() => setPickerOpen(false)} />}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {COLUMNS.map((col) => (
            <Card key={col.status} title={`${col.title} (${byStatus[col.status].length})`} size="small">
              {byStatus[col.status].length === 0 ? (
                <Empty description="No tokens" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={[...byStatus[col.status]].sort((a, b) => a.token_no - b.token_no)}
                  renderItem={(a) => {
                    const advanceTo = nextStatus[a.status];
                    return (
                      <List.Item
                        actions={
                          canWrite && advanceTo
                            ? [
                                <Button
                                  key="advance"
                                  type="link"
                                  loading={advanceMutation.isPending}
                                  onClick={() => advanceMutation.mutate({ id: a.appointment_id, status: advanceTo })}
                                >
                                  {advanceTo === "in_consult" ? "Call" : "Finish"}
                                </Button>,
                              ]
                            : []
                        }
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar icon={<UserOutlined />} style={{ background: "var(--brand-glow)" }}>
                              {a.token_no}
                            </Avatar>
                          }
                          title={<Typography.Text strong style={{ fontSize: 20 }}>#{a.token_no}</Typography.Text>}
                          description={
                            <Space direction="vertical" size={0}>
                              <span>{a.patient_name}</span>
                              <Tag>{a.doctor_name}</Tag>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
