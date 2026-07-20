import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Table, Tag, Button, Card, Segmented } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { listBills, type BillListItem, type BillStatus } from "./billingApi";
import { getPatient } from "../patients/patientsApi";
import BillDetailDrawer from "./BillDetailDrawer";

type ViewMode = "draft" | "awaiting" | "paid" | "all";

const STATUS_COLOR: Record<BillStatus, string> = {
  draft: "default",
  finalized: "warning",
  paid: "success",
  cancelled: "error",
};

const STATUS_LABEL: Record<BillStatus, string> = {
  draft: "Draft",
  finalized: "Awaiting Payment",
  paid: "Paid",
  cancelled: "Cancelled",
};

function PatientCell({ patientId }: { patientId: number }) {
  const { data } = useQuery({ queryKey: ["billing", "patient", patientId], queryFn: () => getPatient(patientId) });
  return <>{data ? `${data.name} · ${data.uhid}` : `Patient #${patientId}`}</>;
}

export default function BillsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("draft");

  const statusFilter: BillStatus | undefined =
    viewMode === "draft" ? "draft" : viewMode === "awaiting" ? "finalized" : viewMode === "paid" ? "paid" : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["billing", "bills", statusFilter],
    queryFn: () => listBills({ status: statusFilter }),
  });

  const detailBillId = searchParams.get("bill");
  const openDetail = (billId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("bill", String(billId));
    setSearchParams(next);
  };
  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("bill");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Billing</Typography.Title>
        <Typography.Text type="secondary">Bills, payments, and receipts</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              { label: "Draft", value: "draft" },
              { label: "Awaiting Payment", value: "awaiting" },
              { label: "Paid", value: "paid" },
              { label: "All", value: "all" },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/billing/new")}>
            New Bill
          </Button>
        </div>

        <Table<BillListItem>
          rowKey="bill_id"
          loading={isLoading}
          dataSource={data?.items ?? []}
          pagination={{ total: data?.total ?? 0, showSizeChanger: false }}
          onRow={(record) => ({ onClick: () => openDetail(record.bill_id), style: { cursor: "pointer" } })}
          columns={[
            { title: "Patient", render: (_, r) => <PatientCell patientId={r.patient_id} /> },
            { title: "Created", dataIndex: "created_at", render: (d: string) => dayjs(d).format("DD MMM YYYY, HH:mm") },
            { title: "Total", dataIndex: "total", render: (v: number) => `₹${v.toFixed(2)}` },
            {
              title: "Status",
              dataIndex: "status",
              render: (s: BillStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
            },
          ]}
        />
      </Card>

      <BillDetailDrawer billId={detailBillId ? Number(detailBillId) : null} onClose={closeDetail} />
    </div>
  );
}
