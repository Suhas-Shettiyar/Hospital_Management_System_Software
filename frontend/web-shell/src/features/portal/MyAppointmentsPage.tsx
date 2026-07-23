import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Typography, Card, Table, Tag, Button, Modal, Form, Select, DatePicker, Input, App as AntApp } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  listMyAppointments,
  listDoctors,
  bookAppointment,
  type Appointment,
  type AppointmentStatus,
  type Doctor,
} from "./portalApi";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: "processing",
  checked_in: "warning",
  completed: "success",
  cancelled: "default",
  no_show: "error",
};

interface FormValues {
  doctor_id: number;
  scheduled_at: dayjs.Dayjs;
  reason?: string;
}

export default function MyAppointmentsPage() {
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const { data, isLoading } = useQuery({ queryKey: ["portal", "appointments"], queryFn: listMyAppointments });
  const { data: doctors } = useQuery({ queryKey: ["portal", "doctors"], queryFn: listDoctors, enabled: bookOpen });

  const bookMutation = useMutation({
    mutationFn: (values: FormValues) =>
      bookAppointment({
        doctor_id: values.doctor_id,
        scheduled_at: values.scheduled_at.toISOString(),
        reason: values.reason,
      }),
    onSuccess: () => {
      message.success("Appointment booked");
      form.resetFields();
      setBookOpen(false);
      queryClient.invalidateQueries({ queryKey: ["portal", "appointments"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not book the appointment."),
  });

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>My Appointments</Typography.Title>
        <Typography.Text type="secondary">Your visits, past and upcoming</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setBookOpen(true)}>
            Book Appointment
          </Button>
        </div>

        <Table<Appointment>
          rowKey="appointment_id"
          loading={isLoading}
          dataSource={data?.items ?? []}
          pagination={false}
          locale={{ emptyText: "No appointments yet" }}
          columns={[
            { title: "Date", dataIndex: "scheduled_at", render: (d: string) => dayjs(d).format("DD MMM YYYY, HH:mm") },
            { title: "Reason", dataIndex: "reason", render: (r: string | null) => r ?? "—" },
            {
              title: "Status",
              dataIndex: "status",
              render: (s: AppointmentStatus) => <Tag color={STATUS_COLOR[s]}>{s.replace("_", " ")}</Tag>,
            },
          ]}
        />
      </Card>

      <Modal
        title="Book Appointment"
        open={bookOpen}
        onCancel={() => setBookOpen(false)}
        onOk={() => form.submit()}
        okText="Book"
        confirmLoading={bookMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => bookMutation.mutate(values)} requiredMark={false}>
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
        </Form>
      </Modal>
    </div>
  );
}
