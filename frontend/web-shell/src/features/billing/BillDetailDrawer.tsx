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
  Input,
  InputNumber,
  Select,
  Modal,
  App as AntApp,
} from "antd";
import { PlusOutlined, DeleteOutlined, PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getBill,
  addBillItem,
  removeBillItem,
  finalizeBill,
  cancelBill,
  recordPayment,
  type BillItem,
  type Payment,
  type BillItemCreateInput,
  type PaymentCreateInput,
  type BillStatus,
} from "./billingApi";
import { getPatient } from "../patients/patientsApi";
import { useCan } from "../auth/useCan";

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

const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function BillDetailDrawer({ billId, onClose }: { billId: number | null; onClose: () => void }) {
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const canWrite = useCan("billing:write");
  const canCollect = useCan("billing:collect");
  const [itemForm] = Form.useForm<BillItemCreateInput>();
  const [paymentForm] = Form.useForm<PaymentCreateInput>();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data: bill } = useQuery({
    queryKey: ["billing", "bill", billId],
    queryFn: () => getBill(billId as number),
    enabled: billId !== null,
  });

  const { data: patient } = useQuery({
    queryKey: ["billing", "patient", bill?.patient_id],
    queryFn: () => getPatient(bill!.patient_id),
    enabled: !!bill,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["billing", "bill", billId] });
    queryClient.invalidateQueries({ queryKey: ["billing", "bills"] });
  };

  const addItemMutation = useMutation({
    mutationFn: (values: BillItemCreateInput) => addBillItem(billId as number, values),
    onSuccess: () => {
      itemForm.resetFields();
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not add item."),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => removeBillItem(billId as number, itemId),
    onSuccess: invalidate,
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not remove item."),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeBill(billId as number),
    onSuccess: () => {
      message.success("Bill finalized");
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not finalize."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBill(billId as number),
    onSuccess: () => {
      message.success("Bill cancelled");
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not cancel."),
  });

  const paymentMutation = useMutation({
    mutationFn: (values: PaymentCreateInput) => recordPayment(billId as number, values),
    onSuccess: () => {
      message.success("Payment recorded");
      paymentForm.resetFields();
      setPaymentModalOpen(false);
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not record payment."),
  });

  return (
    <Drawer title="Bill Details" open={billId !== null} onClose={onClose} width={560}>
      {bill && (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Patient">
              {patient ? `${patient.name} · ${patient.uhid}` : "Loading..."}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLOR[bill.status]}>{STATUS_LABEL[bill.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created">{dayjs(bill.created_at).format("DD MMM YYYY, HH:mm")}</Descriptions.Item>
            <Descriptions.Item label="Total">₹{bill.total.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Paid">₹{bill.amount_paid.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Balance due">₹{bill.balance_due.toFixed(2)}</Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ margin: 0 }}>Items</Typography.Title>
          <Table<BillItem>
            size="small"
            rowKey="item_id"
            pagination={false}
            dataSource={bill.items}
            locale={{ emptyText: "No items yet" }}
            columns={[
              { title: "Description", dataIndex: "description" },
              { title: "Qty", dataIndex: "quantity" },
              { title: "Unit Price", dataIndex: "unit_price", render: (v: number) => v.toFixed(2) },
              { title: "GST %", dataIndex: "gst_rate", render: (v: number) => v.toFixed(2) },
              { title: "Line Total", dataIndex: "line_total", render: (v: number) => v.toFixed(2) },
              ...(bill.status === "draft"
                ? [
                    {
                      title: "",
                      render: (_: unknown, r: BillItem) => (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={!canWrite}
                          onClick={() => removeItemMutation.mutate(r.item_id)}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />

          {bill.status === "draft" && canWrite && (
            <Form
              form={itemForm}
              layout="inline"
              onFinish={(values) => addItemMutation.mutate(values)}
              style={{ rowGap: 8 }}
            >
              <Form.Item name="description" rules={[{ required: true, message: "Description" }]}>
                <Input placeholder="Description" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="quantity" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={1} placeholder="Qty" style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="unit_price" rules={[{ required: true, message: "Price" }]}>
                <InputNumber min={0} placeholder="Unit price" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="gst_rate" initialValue={0}>
                <InputNumber min={0} max={100} placeholder="GST %" style={{ width: 90 }} />
              </Form.Item>
              <Form.Item>
                <Button htmlType="submit" icon={<PlusOutlined />} loading={addItemMutation.isPending}>
                  Add
                </Button>
              </Form.Item>
            </Form>
          )}

          {bill.payments.length > 0 && (
            <>
              <Typography.Title level={5} style={{ margin: 0 }}>Payments</Typography.Title>
              <Table<Payment>
                size="small"
                rowKey="payment_id"
                pagination={false}
                dataSource={bill.payments}
                columns={[
                  { title: "Amount", dataIndex: "amount", render: (v: number) => `₹${v.toFixed(2)}` },
                  { title: "Mode", dataIndex: "mode" },
                  { title: "Reference", dataIndex: "reference_number", render: (v: string | null) => v ?? "—" },
                  {
                    title: "Received",
                    dataIndex: "received_at",
                    render: (d: string) => dayjs(d).format("DD MMM YYYY, HH:mm"),
                  },
                ]}
              />
            </>
          )}

          <Space wrap>
            {bill.status === "draft" && (
              <Button
                type="primary"
                onClick={() => finalizeMutation.mutate()}
                loading={finalizeMutation.isPending}
                disabled={!canWrite}
              >
                Finalize
              </Button>
            )}
            {bill.status === "finalized" && (
              <Button type="primary" onClick={() => setPaymentModalOpen(true)} disabled={!canCollect}>
                Record Payment
              </Button>
            )}
            {(bill.status === "draft" || bill.status === "finalized") && (
              <Button
                danger
                onClick={() => cancelMutation.mutate()}
                loading={cancelMutation.isPending}
                disabled={!canWrite}
              >
                Cancel Bill
              </Button>
            )}
            {(bill.status === "finalized" || bill.status === "paid") && (
              <Button
                icon={<PrinterOutlined />}
                onClick={() => window.open(`/billing/bills/${bill.bill_id}/print`, "_blank")}
              >
                Print Receipt
              </Button>
            )}
          </Space>
        </Space>
      )}

      <Modal
        title="Record Payment"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        okText="Record"
        confirmLoading={paymentMutation.isPending}
        destroyOnHidden
      >
        <Form form={paymentForm} layout="vertical" onFinish={(values) => paymentMutation.mutate(values)} requiredMark={false}>
          <Form.Item
            name="amount"
            label="Amount"
            initialValue={bill?.balance_due}
            rules={[{ required: true, message: "Enter the amount" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0.01} step={0.01} autoFocus />
          </Form.Item>
          <Form.Item name="mode" label="Payment mode" rules={[{ required: true, message: "Select a mode" }]}>
            <Select options={PAYMENT_MODE_OPTIONS} placeholder="Select mode" />
          </Form.Item>
          <Form.Item name="reference_number" label="Reference number (optional)">
            <Input placeholder="e.g. UPI transaction ID" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
