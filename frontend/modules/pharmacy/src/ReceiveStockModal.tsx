import { Modal, Form, Input, InputNumber, DatePicker, App as AntApp } from "antd";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { receiveBatch } from "./pharmacyApi";

interface FormValues {
  batch_number: string;
  expiry_date: dayjs.Dayjs;
  quantity: number;
  cost_price?: number;
  mrp?: number;
}

export default function ReceiveStockModal({
  open,
  medicineId,
  medicineName,
  onClose,
}: {
  open: boolean;
  medicineId: number | null;
  medicineName?: string;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();

  const onFinish = async (values: FormValues) => {
    if (medicineId === null) return;
    try {
      await receiveBatch(medicineId, {
        batch_number: values.batch_number,
        expiry_date: values.expiry_date.format("YYYY-MM-DD"),
        quantity: values.quantity,
        cost_price: values.cost_price,
        mrp: values.mrp,
      });
      message.success("Stock received");
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicines"] });
      form.resetFields();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not receive stock.");
    }
  };

  return (
    <Modal
      title={medicineName ? `Receive Stock — ${medicineName}` : "Receive Stock"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Receive"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="batch_number" label="Batch number" rules={[{ required: true, message: "Enter the batch number" }]}>
          <Input autoFocus placeholder="e.g. B2026-045" />
        </Form.Item>

        <Form.Item name="expiry_date" label="Expiry date" rules={[{ required: true, message: "Enter the expiry date" }]}>
          <DatePicker style={{ width: "100%" }} minDate={dayjs()} />
        </Form.Item>

        <Form.Item name="quantity" label="Quantity received" rules={[{ required: true, message: "Enter the quantity" }]}>
          <InputNumber style={{ width: "100%" }} min={1} />
        </Form.Item>

        <Form.Item name="cost_price" label="Cost price (optional)">
          <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
        </Form.Item>

        <Form.Item name="mrp" label="MRP (optional)">
          <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
