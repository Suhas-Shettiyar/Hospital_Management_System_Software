import { Modal, Form, Input, InputNumber, App as AntApp } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { createMedicine, type MedicineCreateInput } from "./pharmacyApi";

export default function NewMedicineForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm<MedicineCreateInput>();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();

  const onFinish = async (values: MedicineCreateInput) => {
    try {
      await createMedicine(values);
      message.success("Medicine added");
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicines"] });
      form.resetFields();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save medicine.");
    }
  };

  return (
    <Modal
      title="Add Medicine"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Add"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="name" label="Medicine name" rules={[{ required: true, message: "Enter the medicine name" }]}>
          <Input autoFocus placeholder="e.g. Paracetamol 500mg" />
        </Form.Item>

        <Form.Item name="unit" label="Unit" rules={[{ required: true, message: "Enter the unit" }]}>
          <Input placeholder="e.g. tablet, bottle, strip" />
        </Form.Item>

        <Form.Item name="hsn_code" label="HSN code (optional)">
          <Input placeholder="e.g. 30049099" />
        </Form.Item>

        <Form.Item name="gst_rate" label="GST rate % (optional)">
          <InputNumber style={{ width: "100%" }} min={0} max={100} placeholder="e.g. 12" />
        </Form.Item>

        <Form.Item name="reorder_level" label="Reorder level" initialValue={10}>
          <InputNumber style={{ width: "100%" }} min={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
