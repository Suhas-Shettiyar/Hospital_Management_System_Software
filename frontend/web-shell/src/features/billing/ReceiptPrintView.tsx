import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Table, Button, Spin } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getBill, type BillItem } from "./billingApi";
import { getPatient } from "../patients/patientsApi";

/** Rendered inside the normal AppShell layout (every module route is - see
 * app/moduleRegistry.ts's getModuleRoutes(), there's no chromeless-route
 * escape hatch), so the sidebar/topbar are hidden via @media print instead
 * of the route being a separate chromeless page. On-screen this still shows
 * a normal preview with a "Print" button; only the print/PDF output itself
 * is chrome-free. This is the "browser print" receipt approach chosen over
 * a new PDF-generation dependency (weasyprint needs fragile-on-Windows
 * system libraries for a receipt use case a print-friendly page already
 * serves). */
export default function ReceiptPrintView() {
  const { billId } = useParams<{ billId: string }>();
  const { data: bill, isLoading } = useQuery({
    queryKey: ["billing", "bill", billId],
    queryFn: () => getBill(Number(billId)),
    enabled: !!billId,
  });
  const { data: patient } = useQuery({
    queryKey: ["billing", "patient", bill?.patient_id],
    queryFn: () => getPatient(bill!.patient_id),
    enabled: !!bill,
  });

  if (isLoading || !bill) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className="page receipt-print">
      <style>{`
        @media print {
          .sidebar, .topbar, .receipt-print .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", padding: 32 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>MedCore HMS</Typography.Title>
        <Typography.Text type="secondary">Receipt / Bill #{bill.bill_id}</Typography.Text>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
          <div>
            <Typography.Text strong>Patient</Typography.Text>
            <div>{patient ? `${patient.name} · ${patient.uhid}` : "—"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Typography.Text strong>Date</Typography.Text>
            <div>{dayjs(bill.finalized_at ?? bill.created_at).format("DD MMM YYYY, HH:mm")}</div>
          </div>
        </div>

        <Table<BillItem>
          style={{ marginTop: 24 }}
          size="small"
          rowKey="item_id"
          pagination={false}
          dataSource={bill.items}
          columns={[
            { title: "Description", dataIndex: "description" },
            { title: "Qty", dataIndex: "quantity" },
            { title: "Unit Price", dataIndex: "unit_price", render: (v: number) => v.toFixed(2) },
            { title: "GST %", dataIndex: "gst_rate", render: (v: number) => v.toFixed(2) },
            { title: "Amount", dataIndex: "line_total", render: (v: number) => v.toFixed(2) },
          ]}
        />

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <div>Total: ₹{bill.total.toFixed(2)}</div>
          <div>Paid: ₹{bill.amount_paid.toFixed(2)}</div>
          <Typography.Text strong>Balance due: ₹{bill.balance_due.toFixed(2)}</Typography.Text>
        </div>

        {bill.payments.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Typography.Text strong>Payments</Typography.Text>
            <Table
              size="small"
              rowKey="payment_id"
              pagination={false}
              dataSource={bill.payments}
              columns={[
                { title: "Amount", dataIndex: "amount", render: (v: number) => `₹${v.toFixed(2)}` },
                { title: "Mode", dataIndex: "mode" },
                {
                  title: "Received",
                  dataIndex: "received_at",
                  render: (d: string) => dayjs(d).format("DD MMM YYYY, HH:mm"),
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
