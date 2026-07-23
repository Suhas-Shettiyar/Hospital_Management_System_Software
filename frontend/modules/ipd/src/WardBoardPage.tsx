import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Typography, Card, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, App as AntApp } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  listBeds,
  createWard,
  createBed,
  type BedBoardItem,
  type WardType,
} from "./ipdApi";
import AdmissionDetailDrawer from "./AdmissionDetailDrawer";
import { useCan } from "./useCan";

const WARD_TYPE_OPTIONS: { value: WardType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "icu", label: "ICU" },
  { value: "private", label: "Private" },
  { value: "semi_private", label: "Semi-Private" },
];

const BED_COLOR: Record<string, string> = {
  vacant: "#e6f7ea",
  occupied: "#fdecea",
  maintenance: "#f0f0f0",
};

const BED_BORDER: Record<string, string> = {
  vacant: "#52c41a",
  occupied: "#ff4d4f",
  maintenance: "#bfbfbf",
};

export default function WardBoardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [wardModalOpen, setWardModalOpen] = useState(false);
  const [bedModalWardId, setBedModalWardId] = useState<number | null>(null);
  const [wardForm] = Form.useForm();
  const [bedForm] = Form.useForm();
  const canWrite = useCan("ipd:write");

  const { data: beds, isLoading } = useQuery({ queryKey: ["ipd", "beds"], queryFn: listBeds });

  const wardGroups = useMemo(() => {
    const groups = new Map<number, { ward_name: string; ward_type: string; beds: BedBoardItem[] }>();
    for (const bed of beds ?? []) {
      if (!groups.has(bed.ward_id)) {
        groups.set(bed.ward_id, { ward_name: bed.ward_name, ward_type: bed.ward_type, beds: [] });
      }
      groups.get(bed.ward_id)!.beds.push(bed);
    }
    return [...groups.entries()];
  }, [beds]);

  const createWardMutation = useMutation({
    mutationFn: createWard,
    onSuccess: () => {
      message.success("Ward added");
      wardForm.resetFields();
      setWardModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["ipd"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not add ward."),
  });

  const createBedMutation = useMutation({
    mutationFn: (bed_number: string) => createBed(bedModalWardId as number, { bed_number }),
    onSuccess: () => {
      message.success("Bed added");
      bedForm.resetFields();
      setBedModalWardId(null);
      queryClient.invalidateQueries({ queryKey: ["ipd"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not add bed."),
  });

  const detailAdmissionId = searchParams.get("admission");
  const openDetail = (admissionId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("admission", String(admissionId));
    setSearchParams(next);
  };
  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("admission");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Ward Board</Typography.Title>
        <Typography.Text type="secondary">Beds, admissions, and current occupancy</Typography.Text>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} disabled={!canWrite} onClick={() => setWardModalOpen(true)}>
          Add Ward
        </Button>
        <Button type="primary" disabled={!canWrite} onClick={() => navigate("/ipd/admit")}>
          New Admission
        </Button>
      </Space>

      {!isLoading && wardGroups.length === 0 && (
        <Card><Typography.Text type="secondary">No wards set up yet. Add one to get started.</Typography.Text></Card>
      )}

      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {wardGroups.map(([wardId, group]) => (
          <Card
            key={wardId}
            title={`${group.ward_name} (${group.ward_type})`}
            extra={<Button size="small" disabled={!canWrite} onClick={() => setBedModalWardId(wardId)}>Add Bed</Button>}
          >
            <Space wrap size="middle">
              {group.beds.map((bed) => (
                <div
                  key={bed.bed_id}
                  onClick={() => {
                    if (bed.status === "vacant" && canWrite) navigate(`/ipd/admit?bed=${bed.bed_id}`);
                    else if (bed.status === "occupied" && bed.admission_id) openDetail(bed.admission_id);
                  }}
                  style={{
                    width: 140,
                    padding: 12,
                    borderRadius: 8,
                    background: BED_COLOR[bed.status],
                    border: `2px solid ${BED_BORDER[bed.status]}`,
                    cursor: bed.status === "occupied" || (bed.status === "vacant" && canWrite) ? "pointer" : "default",
                  }}
                >
                  <Typography.Text strong>Bed {bed.bed_number}</Typography.Text>
                  <div>
                    <Tag color={bed.status === "vacant" ? "success" : bed.status === "occupied" ? "error" : "default"}>
                      {bed.status}
                    </Tag>
                  </div>
                  {bed.patient_name && (
                    <Typography.Text style={{ display: "block", marginTop: 4 }} ellipsis>
                      {bed.patient_name}
                    </Typography.Text>
                  )}
                </div>
              ))}
            </Space>
          </Card>
        ))}
      </Space>

      <Modal
        title="Add Ward"
        open={wardModalOpen}
        onCancel={() => setWardModalOpen(false)}
        onOk={() => wardForm.submit()}
        okText="Add"
        confirmLoading={createWardMutation.isPending}
        destroyOnHidden
      >
        <Form form={wardForm} layout="vertical" onFinish={(values) => createWardMutation.mutate(values)} requiredMark={false}>
          <Form.Item name="name" label="Ward name" rules={[{ required: true, message: "Enter a ward name" }]}>
            <Input placeholder="e.g. General Ward A" autoFocus />
          </Form.Item>
          <Form.Item name="ward_type" label="Ward type" rules={[{ required: true, message: "Select a type" }]}>
            <Select options={WARD_TYPE_OPTIONS} placeholder="Select type" />
          </Form.Item>
          <Form.Item name="daily_rate" label="Daily rate (₹)" rules={[{ required: true, message: "Enter the daily rate" }]}>
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Bed"
        open={bedModalWardId !== null}
        onCancel={() => setBedModalWardId(null)}
        onOk={() => bedForm.submit()}
        okText="Add"
        confirmLoading={createBedMutation.isPending}
        destroyOnHidden
      >
        <Form form={bedForm} layout="vertical" onFinish={(values) => createBedMutation.mutate(values.bed_number)} requiredMark={false}>
          <Form.Item name="bed_number" label="Bed number" rules={[{ required: true, message: "Enter a bed number" }]}>
            <Input placeholder="e.g. A1" autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      <AdmissionDetailDrawer admissionId={detailAdmissionId ? Number(detailAdmissionId) : null} onClose={closeDetail} />
    </div>
  );
}
