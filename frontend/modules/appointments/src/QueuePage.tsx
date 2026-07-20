import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Typography, Table, Tag, Button, Card, Segmented, Space, App as AntApp } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  listAppointments,
  listDoctors,
  getPatient,
  checkIn,
  completeAppointment,
  cancelAppointment,
  markNoShow,
  type AppointmentListItem,
  type AppointmentStatus,
} from "./appointmentsApi";

type ViewMode = "queue" | "upcoming" | "all";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: "processing",
  checked_in: "warning",
  completed: "success",
  cancelled: "default",
  no_show: "error",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked In",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

function PatientCell({ patientId }: { patientId: number }) {
  const { data } = useQuery({
    queryKey: ["appointments", "patient", patientId],
    queryFn: () => getPatient(patientId),
  });
  return <>{data ? `${data.name} · ${data.uhid}` : `Patient #${patientId}`}</>;
}

export default function QueuePage() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("queue");

  const statusFilter: AppointmentStatus | undefined =
    viewMode === "queue" ? "checked_in" : viewMode === "upcoming" ? "scheduled" : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", "list", statusFilter],
    queryFn: () => listAppointments({ status: statusFilter }),
  });

  const { data: doctors } = useQuery({ queryKey: ["appointments", "doctors"], queryFn: listDoctors });
  const doctorName = useMemo(() => {
    const map = new Map((doctors ?? []).map((d) => [d.user_id, d.name]));
    return (doctorId: number) => map.get(doctorId) ?? `Doctor #${doctorId}`;
  }, [doctors]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["appointments", "list"] });

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      message.success("Checked in");
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not check in."),
  });
  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => {
      message.success("Marked complete");
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not complete."),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      message.success("Cancelled");
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not cancel."),
  });
  const noShowMutation = useMutation({
    mutationFn: markNoShow,
    onSuccess: () => {
      message.success("Marked no-show");
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not mark no-show."),
  });

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Appointments</Typography.Title>
        <Typography.Text type="secondary">Booking, check-in, and today's queue</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              { label: "Today's Queue", value: "queue" },
              { label: "Upcoming", value: "upcoming" },
              { label: "All", value: "all" },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/appointments/new")}>
            Book Appointment
          </Button>
        </div>

        <Table<AppointmentListItem>
          rowKey="appointment_id"
          loading={isLoading}
          dataSource={data?.items ?? []}
          pagination={{ total: data?.total ?? 0, showSizeChanger: false }}
          columns={[
            { title: "Patient", render: (_, r) => <PatientCell patientId={r.patient_id} /> },
            { title: "Doctor", render: (_, r) => doctorName(r.doctor_id) },
            {
              title: "Scheduled",
              dataIndex: "scheduled_at",
              render: (d: string) => dayjs(d).format("DD MMM YYYY, HH:mm"),
            },
            { title: "Reason", dataIndex: "reason", render: (r: string | null) => r ?? "—" },
            {
              title: "Status",
              dataIndex: "status",
              render: (s: AppointmentStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
            },
            {
              title: "",
              render: (_, r) => (
                <Space size={4}>
                  {r.status === "scheduled" && (
                    <>
                      <Button size="small" onClick={() => checkInMutation.mutate(r.appointment_id)}>
                        Check In
                      </Button>
                      <Button size="small" onClick={() => noShowMutation.mutate(r.appointment_id)}>
                        No-show
                      </Button>
                      <Button size="small" danger onClick={() => cancelMutation.mutate(r.appointment_id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {r.status === "checked_in" && (
                    <>
                      <Button size="small" type="primary" onClick={() => completeMutation.mutate(r.appointment_id)}>
                        Complete
                      </Button>
                      <Button size="small" danger onClick={() => cancelMutation.mutate(r.appointment_id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
