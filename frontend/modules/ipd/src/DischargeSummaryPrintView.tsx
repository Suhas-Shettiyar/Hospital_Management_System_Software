import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Table, Button, Spin } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAdmission, getPatient, type VitalsRecord } from "./ipdApi";

/** Rendered inside the normal AppShell layout (every remote route is - no
 * chromeless-route escape hatch exists in this codebase), so the sidebar/
 * topbar are hidden via @media print instead of this being a separate bare
 * page - same trick Billing's ReceiptPrintView already established. This is
 * a plain, doctor-authored text summary, not a FHIR bundle - real FHIR R4
 * generation is Phase 6 (ABDM/FHIR) territory, not built here. */
export default function DischargeSummaryPrintView() {
  const { admissionId } = useParams<{ admissionId: string }>();
  const { data: admission, isLoading } = useQuery({
    queryKey: ["ipd", "admission", admissionId],
    queryFn: () => getAdmission(Number(admissionId)),
    enabled: !!admissionId,
  });
  const { data: patient } = useQuery({
    queryKey: ["ipd", "patient", admission?.patient_id],
    queryFn: () => getPatient(admission!.patient_id),
    enabled: !!admission,
  });

  if (isLoading || !admission) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className="page discharge-print">
      <style>{`
        @media print {
          .sidebar, .topbar, .discharge-print .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", padding: 32 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>MedCore HMS</Typography.Title>
        <Typography.Text type="secondary">Discharge Summary - Admission #{admission.admission_id}</Typography.Text>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
          <div>
            <Typography.Text strong>Patient</Typography.Text>
            <div>{patient ? `${patient.name} · ${patient.uhid}` : "—"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Typography.Text strong>Admitted</Typography.Text>
            <div>{dayjs(admission.admitted_at).format("DD MMM YYYY, HH:mm")}</div>
            <Typography.Text strong>Discharged</Typography.Text>
            <div>{admission.discharged_at ? dayjs(admission.discharged_at).format("DD MMM YYYY, HH:mm") : "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>Admission reason</Typography.Text>
          <div>{admission.admission_reason}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>Discharge summary</Typography.Text>
          <div style={{ whiteSpace: "pre-wrap" }}>{admission.discharge_summary ?? "—"}</div>
        </div>

        {admission.vitals.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Typography.Text strong>Vitals recorded during stay</Typography.Text>
            <Table<VitalsRecord>
              size="small"
              rowKey="record_id"
              pagination={false}
              dataSource={admission.vitals}
              columns={[
                { title: "Date", dataIndex: "recorded_at", render: (d: string) => dayjs(d).format("DD MMM, HH:mm") },
                { title: "Temp (°C)", dataIndex: "temperature_celsius", render: (v: number | null) => v ?? "—" },
                { title: "Pulse", dataIndex: "pulse_bpm", render: (v: number | null) => v ?? "—" },
                {
                  title: "BP",
                  render: (_, r) => (r.bp_systolic && r.bp_diastolic ? `${r.bp_systolic}/${r.bp_diastolic}` : "—"),
                },
                { title: "SpO2 %", dataIndex: "spo2_percent", render: (v: number | null) => v ?? "—" },
              ]}
            />
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Typography.Text strong>Bed history</Typography.Text>
          <Table
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
                render: (d: string | null) => (d ? dayjs(d).format("DD MMM, HH:mm") : "—"),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
