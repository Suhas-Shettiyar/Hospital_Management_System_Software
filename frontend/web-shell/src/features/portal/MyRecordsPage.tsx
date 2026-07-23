import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Typography, Card, Tabs, Table, Tag, Drawer } from "antd";
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
  const [detail, setDetail] = useState<Consultation | null>(null);

  return (
    <>
      <Table<Consultation>
        rowKey="consult_id"
        loading={isLoading}
        dataSource={data?.items ?? []}
        pagination={false}
        locale={{ emptyText: "No consultations yet" }}
        onRow={(record) => ({ onClick: () => setDetail(record), style: { cursor: "pointer" } })}
        columns={[
          { title: "Date", dataIndex: "consult_date", render: (d: string) => dayjs(d).format("DD MMM YYYY") },
          { title: "Chief complaint", dataIndex: "chief_complaint" },
          { title: "Diagnosis", dataIndex: "diagnosis_text" },
          {
            title: "Prescription",
            render: (_, c) => (c.prescription ? <Tag color="success">Prescribed</Tag> : <Tag>Advice only</Tag>),
          },
        ]}
      />

      <Drawer title="Consultation Details" open={!!detail} onClose={() => setDetail(null)} width={480}>
        {detail && (
          <>
            <p><strong>Date:</strong> {dayjs(detail.consult_date).format("DD MMM YYYY")}</p>
            <p><strong>Chief complaint:</strong> {detail.chief_complaint}</p>
            <p><strong>Diagnosis:</strong> {detail.diagnosis_text}{detail.diagnosis_code ? ` (${detail.diagnosis_code})` : ""}</p>
            {detail.notes && <p><strong>Notes:</strong> {detail.notes}</p>}
            {detail.prescription ? (
              <>
                <strong>Prescription</strong>
                {detail.prescription.instructions && <p>{detail.prescription.instructions}</p>}
                <Table
                  size="small"
                  rowKey="item_id"
                  pagination={false}
                  dataSource={detail.prescription.items}
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
          </>
        )}
      </Drawer>
    </>
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
