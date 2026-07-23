import { useQuery } from "@tanstack/react-query";
import { Typography, Card, Tabs, Table, Tag, Space, Empty } from "antd";
import dayjs from "dayjs";
import {
  listMyConsultations,
  listMyLabOrders,
  listMyBills,
  type Consultation,
  type LabOrder,
} from "./portalApi";
import type { BillListItem, BillStatus } from "../billing/billingApi";

const BILL_STATUS_COLOR: Record<BillStatus, string> = {
  draft: "default",
  finalized: "warning",
  paid: "success",
  cancelled: "error",
};

function ConsultationsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["portal", "consultations"], queryFn: listMyConsultations });

  if (!isLoading && (data?.items.length ?? 0) === 0) {
    return <Empty description="No consultations yet" />;
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      {(data?.items ?? []).map((c: Consultation) => (
        <Card key={c.consult_id} size="small" title={dayjs(c.consult_date).format("DD MMM YYYY")}>
          <p><strong>Chief complaint:</strong> {c.chief_complaint}</p>
          <p><strong>Diagnosis:</strong> {c.diagnosis_text}{c.diagnosis_code ? ` (${c.diagnosis_code})` : ""}</p>
          {c.notes && <p><strong>Notes:</strong> {c.notes}</p>}
          {c.prescription ? (
            <>
              <strong>Prescription</strong>
              {c.prescription.instructions && <p>{c.prescription.instructions}</p>}
              <Table
                size="small"
                rowKey="item_id"
                pagination={false}
                dataSource={c.prescription.items}
                columns={[
                  { title: "Medicine", dataIndex: "med_name" },
                  { title: "Dose", dataIndex: "dose" },
                  { title: "Frequency", dataIndex: "frequency" },
                  { title: "Duration", dataIndex: "duration" },
                ]}
              />
            </>
          ) : (
            <Typography.Text type="secondary">Advice only - no medicines prescribed.</Typography.Text>
          )}
        </Card>
      ))}
    </Space>
  );
}

function LabResultsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["portal", "lab-orders"], queryFn: listMyLabOrders });

  return (
    <Table<LabOrder>
      rowKey="order_id"
      loading={isLoading}
      dataSource={data?.items ?? []}
      pagination={false}
      locale={{ emptyText: "No lab tests yet" }}
      columns={[
        { title: "Test", dataIndex: "test_name" },
        { title: "Ordered", dataIndex: "ordered_at", render: (d: string) => dayjs(d).format("DD MMM YYYY") },
        {
          title: "Status",
          dataIndex: "status",
          render: (s: string) => <Tag color={s === "completed" ? "success" : "warning"}>{s === "completed" ? "Completed" : "Awaiting Result"}</Tag>,
        },
        {
          title: "Result",
          render: (_, r) =>
            r.result ? (
              <div style={{ whiteSpace: "pre-wrap" }}>
                {r.result.result_data}
                {r.result.reference_range && (
                  <div><Typography.Text type="secondary">Reference: {r.result.reference_range}</Typography.Text></div>
                )}
              </div>
            ) : (
              "—"
            ),
        },
      ]}
    />
  );
}

function BillsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["portal", "bills"], queryFn: listMyBills });

  return (
    <Table<BillListItem>
      rowKey="bill_id"
      loading={isLoading}
      dataSource={data?.items ?? []}
      pagination={false}
      locale={{ emptyText: "No bills yet" }}
      columns={[
        { title: "Date", dataIndex: "created_at", render: (d: string) => dayjs(d).format("DD MMM YYYY") },
        { title: "Total", dataIndex: "total", render: (v: number) => `₹${v.toFixed(2)}` },
        {
          title: "Status",
          dataIndex: "status",
          render: (s: BillStatus) => <Tag color={BILL_STATUS_COLOR[s]}>{s}</Tag>,
        },
      ]}
    />
  );
}

export default function MyRecordsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>My Records</Typography.Title>
        <Typography.Text type="secondary">Everything your care team has recorded - exactly as written</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20 } }}>
        <Tabs
          items={[
            { key: "consultations", label: "Consultations", children: <ConsultationsTab /> },
            { key: "lab", label: "Lab Results", children: <LabResultsTab /> },
            { key: "bills", label: "Bills", children: <BillsTab /> },
          ]}
        />
      </Card>
    </div>
  );
}
