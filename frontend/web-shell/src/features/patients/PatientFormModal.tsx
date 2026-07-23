import { useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, Checkbox, Collapse, App as AntApp } from "antd";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { createPatient, updatePatient, type Patient } from "./patientsApi";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => ({
  value: g,
  label: g,
}));

const CONSENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "granted", label: "Granted" },
  { value: "denied", label: "Denied" },
  { value: "withdrawn", label: "Withdrawn" },
];

interface FormValues {
  name: string;
  dob: dayjs.Dayjs;
  gender: string;
  phone: string;
  address?: string;
  blood_group?: string;
  abha_number?: string;
  abha_address?: string;
  /** Create mode only - a simple yes/no at intake. */
  consent_obtained?: boolean;
  /** Edit mode only - the full lifecycle state (pending/granted/denied/withdrawn). */
  consent_status?: string;
}

/** Handles both registering a new patient and editing an existing one -
 * pass `patient` to edit (fields pre-filled, PATCH on submit), omit it to
 * register a new one (POST on submit). Consent is asked differently in each
 * mode: a simple "obtained?" checkbox at intake vs. the full lifecycle
 * status (including denied/withdrawn) once a record already exists. */
export default function PatientFormModal({
  open,
  patient,
  onClose,
}: {
  open: boolean;
  patient?: Patient;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const isEdit = !!patient;

  useEffect(() => {
    if (!open) return;
    if (patient) {
      form.setFieldsValue({
        name: patient.name,
        dob: dayjs(patient.dob),
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address ?? undefined,
        blood_group: patient.blood_group ?? undefined,
        abha_number: patient.abha_number ?? undefined,
        abha_address: patient.abha_address ?? undefined,
        consent_status: patient.consent_status,
      });
    } else {
      form.resetFields();
    }
  }, [open, patient, form]);

  const onFinish = async (values: FormValues) => {
    try {
      const { consent_obtained, consent_status, ...rest } = values;
      const dob = values.dob.format("YYYY-MM-DD");
      if (isEdit && patient) {
        await updatePatient(patient.patient_id, { ...rest, dob, consent_status });
        message.success("Patient updated");
      } else {
        await createPatient({ ...rest, dob, consent_obtained: !!consent_obtained });
        message.success("Patient registered");
      }
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit Patient" : "New Patient"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={isEdit ? "Save" : "Register"}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="name" label="Full name" rules={[{ required: true, message: "Enter the patient's name" }]}>
          <Input autoFocus />
        </Form.Item>

        <Form.Item name="dob" label="Date of birth" rules={[{ required: true, message: "Enter date of birth" }]}>
          <DatePicker style={{ width: "100%" }} maxDate={dayjs()} />
        </Form.Item>

        <Form.Item name="gender" label="Gender" rules={[{ required: true, message: "Select a gender" }]}>
          <Select options={GENDER_OPTIONS} placeholder="Select gender" />
        </Form.Item>

        <Form.Item name="phone" label="Phone" rules={[{ required: true, message: "Enter a phone number" }]}>
          <Input />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="blood_group" label="Blood group">
          <Select options={BLOOD_GROUP_OPTIONS} placeholder="Select blood group" allowClear />
        </Form.Item>

        <Collapse
          ghost
          style={{ marginBottom: 16 }}
          items={[
            {
              key: "abha",
              label: "ABHA (optional)",
              children: (
                <>
                  <Form.Item name="abha_number" label="ABHA number">
                    <Input />
                  </Form.Item>
                  <Form.Item name="abha_address" label="ABHA address">
                    <Input />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />

        {isEdit ? (
          <Form.Item name="consent_status" label="Consent status">
            <Select options={CONSENT_STATUS_OPTIONS} />
          </Form.Item>
        ) : (
          <Form.Item name="consent_obtained" valuePropName="checked" initialValue={false}>
            <Checkbox>Consent obtained for treatment / data sharing</Checkbox>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
