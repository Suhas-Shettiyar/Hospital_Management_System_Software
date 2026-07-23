import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Form,
  InputNumber,
  Input,
  Select,
  Modal,
  App as AntApp,
} from "antd";
import { PlusOutlined, PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getAdmission,
  getPatient,
  listBeds,
  moveBed,
  recordVitals,
  generateRoomCharges,
  dischargePatient,
  type BedAssignment,
  type VitalsRecord,
  type VitalsCreateInput,
} from "./ipdApi";
import { useCan } from "./useCan";

export default function AdmissionDetailDrawer({
  admissionId,
  onClose,
}: {
  admissionId: number | null;
  onClose: () => void;
}) {
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [vitalsForm] = Form.useForm<VitalsCreateInput>();
  const [moveBedForm] = Form.useForm<{ new_bed_id: number }>();
  const [dischargeForm] = Form.useForm<{ discharge_summary: string }>();
  const [moveBedOpen, setMoveBedOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const canWrite = useCan("ipd:write");
  const canRecordVitals = useCan("vitals:write");

  const { data: admission } = useQuery({
    queryKey: ["ipd", "admission", admissionId],
    queryFn: () => getAdmission(admissionId as number),
    enabled: admissionId !== null,
  });

  const { data: patient } = useQuery({
    queryKey: ["ipd", "patient", admission?.patient_id],
    queryFn: () => getPatient(admission!.patient_id),
    enabled: !!admission,
  });

  const { data: beds } = useQuery({ queryKey: ["ipd", "beds"], queryFn: listBeds, enabled: moveBedOpen });
  const vacantBeds = (beds ?? []).filter((b) => b.status === "vacant");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ipd", "admission", admissionId] });
    queryClient.invalidateQueries({ queryKey: ["ipd", "beds"] });
  };

  const vitalsMutation = useMutation({
    mutationFn: (values: VitalsCreateInput) => recordVitals(admissionId as number, values),
    onSuccess: () => {
      message.success("Vitals recorded");
      vitalsForm.resetFields();
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not record vitals."),
  });

  const moveBedMutation = useMutation({
    mutationFn: (newBedId: number) => moveBed(admissionId as number, newBedId),
    onSuccess: () => {
      message.success("Bed moved");
      moveBedForm.resetFields();
      setMoveBedOpen(false);
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not move bed."),
  });

  const chargesMutation = useMutation({
    mutationFn: () => generateRoomCharges(admissionId as number),
    onSuccess: (bill) => {
      message.success(`Bill #${bill.bill_id} created for ₹${bill.total.toFixed(2)} - view it in Billing`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not generate room charges."),
  });

  const dischargeMutation = useMutation({
    mutationFn: (summary: string) => dischargePatient(admissionId as number, summary),
    onSuccess: () => {
      message.success("Patient discharged");
      dischargeForm.resetFields();
      setDischargeOpen(false);
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not discharge the patient."),
  });

  return (
    <Drawer title="Admission Details" open={admissionId !== null} onClose={onClose} width={620}>
      {admission && (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Patient">
              {patient ? `${patient.name} · ${patient.uhid}` : "Loading..."}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={admission.status === "admitted" ? "processing" : "success"}>{admission.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Admitted">{dayjs(admission.admitted_at).format("DD MMM YYYY, HH:mm")}</Descriptions.Item>
            <Descriptions.Item label="Reason">{admission.admission_reason}</Descriptions.Item>
            {admission.discharged_at && (
              <Descriptions.Item label="Discharged">
                {dayjs(admission.discharged_at).format("DD MMM YYYY, HH:mm")}
              </Descriptions.Item>
            )}
            {admission.discharge_summary && (
              <Descriptions.Item label="Discharge summary">{admission.discharge_summary}</Descriptions.Item>
            )}
          </Descriptions>

          <Typography.Title level={5} style={{ margin: 0 }}>Bed History</Typography.Title>
          <Table<BedAssignment>
            size="small"
            rowKey="assignment_id"
            pagination={false}
            dataSource={admission.bed_assignments}
            columns={[
              { title: "Ward", dataIndex: "ward_name" },
              { title: "Bed", dataIndex: "bed_number" },
              { title: "From", dataIndex: "assigned_at", render: (d: string) => dayjs(d).format("DD MMM, HH:mm") },
              {
                title: "To",
                dataIndex: "released_at",
                render: (d: string | null) => (d ? dayjs(d).format("DD MMM, HH:mm") : "Current"),
              },
            ]}
          />

          <Typography.Title level={5} style={{ margin: 0 }}>Vitals</Typography.Title>
          <Table<VitalsRecord>
            size="small"
            rowKey="record_id"
            pagination={false}
            dataSource={admission.vitals}
            locale={{ emptyText: "No vitals recorded yet" }}
            columns={[
              { title: "Recorded", dataIndex: "recorded_at", render: (d: string) => dayjs(d).format("DD MMM, HH:mm") },
              { title: "Temp (°C)", dataIndex: "temperature_celsius", render: (v: number | null) => v ?? "—" },
              { title: "Pulse", dataIndex: "pulse_bpm", render: (v: number | null) => v ?? "—" },
              {
                title: "BP",
                render: (_, r) => (r.bp_systolic && r.bp_diastolic ? `${r.bp_systolic}/${r.bp_diastolic}` : "—"),
              },
              { title: "SpO2 %", dataIndex: "spo2_percent", render: (v: number | null) => v ?? "—" },
              { title: "Notes", dataIndex: "notes", render: (v: string | null) => v ?? "—" },
            ]}
          />

          {admission.status === "admitted" && canRecordVitals && (
            <Form
              form={vitalsForm}
              layout="inline"
              onFinish={(values) => vitalsMutation.mutate(values)}
              style={{ rowGap: 8 }}
            >
              <Form.Item name="temperature_celsius"><InputNumber placeholder="Temp °C" style={{ width: 90 }} /></Form.Item>
              <Form.Item name="pulse_bpm"><InputNumber placeholder="Pulse" style={{ width: 80 }} /></Form.Item>
              <Form.Item name="bp_systolic"><InputNumber placeholder="BP sys" style={{ width: 80 }} /></Form.Item>
              <Form.Item name="bp_diastolic"><InputNumber placeholder="BP dia" style={{ width: 80 }} /></Form.Item>
              <Form.Item name="spo2_percent"><InputNumber placeholder="SpO2 %" style={{ width: 80 }} /></Form.Item>
              <Form.Item name="notes"><Input placeholder="Notes" style={{ width: 140 }} /></Form.Item>
              <Form.Item>
                <Button htmlType="submit" icon={<PlusOutlined />} loading={vitalsMutation.isPending}>
                  Add Vitals
                </Button>
              </Form.Item>
            </Form>
          )}

          <Space wrap>
            {admission.status === "admitted" && (
              <>
                <Button disabled={!canWrite} onClick={() => setMoveBedOpen(true)}>Move Bed</Button>
                <Button disabled={!canWrite} onClick={() => setDischargeOpen(true)}>Discharge</Button>
              </>
            )}
            <Button loading={chargesMutation.isPending} disabled={!canWrite} onClick={() => chargesMutation.mutate()}>
              Generate Room Charges
            </Button>
            {admission.status === "discharged" && (
              <Button
                icon={<PrinterOutlined />}
                onClick={() => window.open(`/ipd/admissions/${admission.admission_id}/summary/print`, "_blank")}
              >
                Print Discharge Summary
              </Button>
            )}
          </Space>
        </Space>
      )}

      <Modal
        title="Move Bed"
        open={moveBedOpen}
        onCancel={() => setMoveBedOpen(false)}
        onOk={() => moveBedForm.submit()}
        okText="Move"
        confirmLoading={moveBedMutation.isPending}
        destroyOnHidden
      >
        <Form
          form={moveBedForm}
          layout="vertical"
          onFinish={(values) => moveBedMutation.mutate(values.new_bed_id)}
          requiredMark={false}
        >
          <Form.Item name="new_bed_id" label="New bed" rules={[{ required: true, message: "Select a vacant bed" }]}>
            <Select
              placeholder="Select a vacant bed"
              options={vacantBeds.map((b) => ({ value: b.bed_id, label: `${b.ward_name} - Bed ${b.bed_number}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Discharge Patient"
        open={dischargeOpen}
        onCancel={() => setDischargeOpen(false)}
        onOk={() => dischargeForm.submit()}
        okText="Discharge"
        confirmLoading={dischargeMutation.isPending}
        destroyOnHidden
      >
        <Form
          form={dischargeForm}
          layout="vertical"
          onFinish={(values) => dischargeMutation.mutate(values.discharge_summary)}
          requiredMark={false}
        >
          <Form.Item
            name="discharge_summary"
            label="Discharge summary"
            rules={[{ required: true, message: "Enter the discharge summary" }]}
          >
            <Input.TextArea rows={5} placeholder="Diagnosis, treatment given, condition at discharge, follow-up advice..." autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
