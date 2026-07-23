import { useEffect } from "react";
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  Radio,
  Select,
  Space,
  App as AntApp,
} from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { opdApi, type PatientOut } from "./api";
import { useCan } from "./useCan";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface FormValues {
  name: string;
  dob: dayjs.Dayjs;
  gender: string;
  phone: string;
  address?: string;
  blood_group?: string;
}

interface Props {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onRegistered: (patient: PatientOut) => void;
}

/**
 * A drawer, not a full page: registering a new patient happens mid-search,
 * so the search results stay visible/reachable behind it rather than
 * navigating away and losing context.
 */
export default function PatientRegisterDrawer({ open, initialName, onClose, onRegistered }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const canRegister = useCan("patients:write");

  useEffect(() => {
    if (open) form.setFieldsValue({ name: initialName ?? "" } as FormValues);
  }, [open, initialName, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormValues) =>
      opdApi.registerPatient({
        name: values.name,
        dob: values.dob.format("YYYY-MM-DD"),
        gender: values.gender,
        phone: values.phone,
        address: values.address || null,
        blood_group: values.blood_group || null,
      }),
    onSuccess: (patient) => {
      message.success(`${patient.name} registered — UHID ${patient.uhid}`);
      queryClient.invalidateQueries({ queryKey: ["opd", "patients", "search"] });
      form.resetFields();
      onRegistered(patient);
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : "Could not register patient.");
    },
  });

  return (
    <Drawer
      title={<span><UserAddOutlined /> Register new patient</span>}
      open={open}
      onClose={onClose}
      width={420}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={isPending} disabled={!canRegister} onClick={() => form.submit()}>
            Register
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={(values) => mutate(values)} requiredMark={false}>
        <Form.Item name="name" label="Full name" rules={[{ required: true, message: "Enter the patient's name" }]}>
          <Input autoFocus placeholder="e.g. Ravi Kumar" size="large" />
        </Form.Item>

        <Form.Item name="dob" label="Date of birth" rules={[{ required: true, message: "Select date of birth" }]}>
          <DatePicker style={{ width: "100%" }} size="large" maxDate={dayjs()} format="DD MMM YYYY" />
        </Form.Item>

        <Form.Item name="gender" label="Gender" rules={[{ required: true, message: "Select gender" }]}>
          <Radio.Group>
            <Radio.Button value="male">Male</Radio.Button>
            <Radio.Button value="female">Female</Radio.Button>
            <Radio.Button value="other">Other</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone"
          rules={[
            { required: true, message: "Enter a phone number" },
            { pattern: /^[0-9+\-\s]{6,20}$/, message: "Enter a valid phone number" },
          ]}
        >
          <Input placeholder="e.g. 9876543210" size="large" />
        </Form.Item>

        <Form.Item name="blood_group" label="Blood group (optional)">
          <Select
            allowClear
            size="large"
            placeholder="Select blood group"
            options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
          />
        </Form.Item>

        <Form.Item name="address" label="Address (optional)">
          <Input.TextArea rows={2} placeholder="Street, city, PIN" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
