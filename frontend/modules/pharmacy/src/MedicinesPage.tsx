import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Table, Tag, Button, Card, Segmented, Space } from "antd";
import { PlusOutlined, InboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  listMedicines,
  getMedicine,
  lowStockAlerts,
  expiringAlerts,
  type MedicineListItem,
  type LowStockItem,
  type ExpiringBatchItem,
} from "./pharmacyApi";
import NewMedicineForm from "./NewMedicineForm";
import ReceiveStockModal from "./ReceiveStockModal";

type ViewMode = "all" | "low-stock" | "expiring";

function BatchesExpandedRow({ medicineId }: { medicineId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["pharmacy", "medicine-detail", medicineId],
    queryFn: () => getMedicine(medicineId),
  });

  return (
    <Table
      size="small"
      loading={isLoading}
      rowKey="batch_id"
      pagination={false}
      dataSource={data?.batches ?? []}
      locale={{ emptyText: "No stock received yet" }}
      columns={[
        { title: "Batch", dataIndex: "batch_number" },
        { title: "Expiry", dataIndex: "expiry_date", render: (d: string) => dayjs(d).format("DD MMM YYYY") },
        { title: "Qty on hand", dataIndex: "quantity_on_hand" },
        { title: "Cost price", dataIndex: "cost_price", render: (v: number | null) => (v == null ? "—" : v.toFixed(2)) },
        { title: "MRP", dataIndex: "mrp", render: (v: number | null) => (v == null ? "—" : v.toFixed(2)) },
      ]}
    />
  );
}

export default function MedicinesPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [receiveFor, setReceiveFor] = useState<{ id: number; name: string } | null>(null);

  const { data: medicinesData, isLoading: medicinesLoading } = useQuery({
    queryKey: ["pharmacy", "medicines"],
    queryFn: () => listMedicines({}),
    enabled: viewMode === "all",
  });

  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ["pharmacy", "low-stock"],
    queryFn: () => lowStockAlerts(),
    enabled: viewMode === "low-stock",
  });

  const { data: expiringData, isLoading: expiringLoading } = useQuery({
    queryKey: ["pharmacy", "expiring"],
    queryFn: () => expiringAlerts(30),
    enabled: viewMode === "expiring",
  });

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Pharmacy</Typography.Title>
        <Typography.Text type="secondary">Medicine master, batch stock, and alerts</Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              { label: "All Medicines", value: "all" },
              { label: "Low Stock", value: "low-stock" },
              { label: "Expiring Soon", value: "expiring" },
            ]}
          />
          <Space>
            <Button icon={<InboxOutlined />} onClick={() => navigate("/pharmacy/dispense")}>
              Dispense
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
              Add Medicine
            </Button>
          </Space>
        </div>

        {viewMode === "all" && (
          <Table<MedicineListItem>
            rowKey="medicine_id"
            loading={medicinesLoading}
            dataSource={medicinesData?.items ?? []}
            pagination={{ total: medicinesData?.total ?? 0, showSizeChanger: false }}
            expandable={{
              expandedRowRender: (record) => <BatchesExpandedRow medicineId={record.medicine_id} />,
            }}
            columns={[
              { title: "Name", dataIndex: "name" },
              { title: "Unit", dataIndex: "unit" },
              {
                title: "Stock",
                dataIndex: "total_quantity",
                render: (qty: number, record) => (
                  <Tag color={qty < record.reorder_level ? "warning" : "success"}>{qty}</Tag>
                ),
              },
              { title: "Reorder level", dataIndex: "reorder_level" },
              {
                title: "Status",
                dataIndex: "is_active",
                render: (active: boolean) => (active ? <Tag color="success">Active</Tag> : <Tag>Inactive</Tag>),
              },
              {
                title: "",
                render: (_, record) => (
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setReceiveFor({ id: record.medicine_id, name: record.name })}
                  >
                    Receive Stock
                  </Button>
                ),
              },
            ]}
          />
        )}

        {viewMode === "low-stock" && (
          <Table<LowStockItem>
            rowKey="medicine_id"
            loading={lowStockLoading}
            dataSource={lowStockData ?? []}
            pagination={false}
            locale={{ emptyText: "Nothing below its reorder level" }}
            columns={[
              { title: "Name", dataIndex: "name" },
              { title: "Unit", dataIndex: "unit" },
              { title: "In stock", dataIndex: "total_quantity", render: (v: number) => <Tag color="warning">{v}</Tag> },
              { title: "Reorder level", dataIndex: "reorder_level" },
            ]}
          />
        )}

        {viewMode === "expiring" && (
          <Table<ExpiringBatchItem>
            rowKey="batch_id"
            loading={expiringLoading}
            dataSource={expiringData ?? []}
            pagination={false}
            locale={{ emptyText: "Nothing expiring in the next 30 days" }}
            columns={[
              { title: "Medicine", dataIndex: "medicine_name" },
              { title: "Batch", dataIndex: "batch_number" },
              { title: "Expiry", dataIndex: "expiry_date", render: (d: string) => dayjs(d).format("DD MMM YYYY") },
              { title: "Qty on hand", dataIndex: "quantity_on_hand" },
              {
                title: "Days left",
                dataIndex: "days_until_expiry",
                render: (d: number) => <Tag color={d <= 7 ? "error" : "warning"}>{d}</Tag>,
              },
            ]}
          />
        )}
      </Card>

      <NewMedicineForm open={addOpen} onClose={() => setAddOpen(false)} />
      <ReceiveStockModal
        open={receiveFor !== null}
        medicineId={receiveFor?.id ?? null}
        medicineName={receiveFor?.name}
        onClose={() => setReceiveFor(null)}
      />
    </div>
  );
}
