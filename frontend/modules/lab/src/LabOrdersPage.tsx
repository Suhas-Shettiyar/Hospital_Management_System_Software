import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography,
  Table,
  Tag,
  Button,
  Drawer,
  Modal,
  Descriptions,
  Space,
  Card,
  Segmented,
  Form,
  Input,
  App as AntApp,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  listLabOrders,
  getLabOrder,
  getPatient,
  enterLabResult,
  type LabOrderListItem,
  type LabOrderStatus,
  type LabResultIn,
} from "./labApi";
import { useCan } from "./useCan";

type StatusFilter = LabOrderStatus | "all";

const STATUS_COLOR: Record<LabOrderStatus, string> = {
  ordered: "warning",
  completed: "success",
};

export default function LabOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ordered");
  const [resultForm] = Form.useForm<LabResultIn>();
  const canWrite = useCan("lab:write");

  const patientFilter = searchParams.get("patient");
  const patientIdNum = patientFilter ? Number(patientFilter) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["lab", "orders", patientIdNum, statusFilter],
    queryFn: () =>
      listLabOrders({
        patientId: patientIdNum,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const { data: filterPatient } = useQuery({
    queryKey: ["lab", "patient", patientIdNum],
    queryFn: () => getPatient(patientIdNum as number),
    enabled: patientIdNum !== undefined,
  });

  const detailId = searchParams.get("order");
  const { data: detail } = useQuery({
    queryKey: ["lab", "order", detailId],
    queryFn: () => getLabOrder(Number(detailId)),
    enabled: !!detailId,
  });

  const [resultOrderId, setResultOrderId] = useState<number | null>(null);

  const submitResult = useMutation({
    mutationFn: (values: LabResultIn) => enterLabResult(resultOrderId as number, values),
    onSuccess: () => {
      message.success("Result saved");
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] });
      setResultOrderId(null);
      resultForm.resetFields();
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : "Could not save result.");
    },
  });

  const openDetail = (orderId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("order", String(orderId));
    setSearchParams(next);
  };

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("order");
    setSearchParams(next, { replace: true });
  };

  const onRowClick = (record: LabOrderListItem) => {
    if (record.status === "ordered") {
      setResultOrderId(record.order_id);
    } else {
      openDetail(record.order_id);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {filterPatient ? `Lab Orders for ${filterPatient.name}` : "Lab Orders"}
        </Typography.Title>
        <Typography.Text type="secondary">
          {filterPatient ? filterPatient.uhid : "Test orders and results queue"}
        </Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <Segmented
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { label: "Awaiting Result", value: "ordered" },
              { label: "Completed", value: "completed" },
              { label: "All", value: "all" },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite}
            onClick={() => navigate(patientIdNum ? `/lab/new?patient=${patientIdNum}` : "/lab/new")}
          >
            New Lab Order
          </Button>
        </div>

        <Table<LabOrderListItem>
          rowKey="order_id"
          loading={isLoading}
          dataSource={data?.items ?? []}
          pagination={{ total: data?.total ?? 0, showSizeChanger: false }}
          onRow={(record) => ({ onClick: () => onRowClick(record), style: { cursor: "pointer" } })}
          columns={[
            { title: "Ordered", dataIndex: "ordered_at", render: (d: string) => dayjs(d).format("DD MMM YYYY HH:mm") },
            ...(patientIdNum ? [] : [{ title: "Patient ID", dataIndex: "patient_id" as const }]),
            { title: "Test", dataIndex: "test_name" },
            {
              title: "Status",
              dataIndex: "status",
              render: (s: LabOrderStatus) => <Tag color={STATUS_COLOR[s]}>{s === "ordered" ? "Awaiting Result" : "Completed"}</Tag>,
            },
          ]}
        />
      </Card>

      <Modal
        title="Enter Result"
        open={resultOrderId !== null}
        onCancel={() => setResultOrderId(null)}
        onOk={() => resultForm.submit()}
        confirmLoading={submitResult.isPending}
        okText="Save Result"
        okButtonProps={{ disabled: !canWrite }}
      >
        <Form form={resultForm} layout="vertical" onFinish={(values) => submitResult.mutate(values)}>
          <Form.Item
            name="result_data"
            label="Result"
            rules={[{ required: true, message: "Enter the result" }]}
          >
            <Input.TextArea rows={4} autoFocus disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="reference_range" label="Reference range (optional)">
            <Input placeholder="e.g. 4-11 x10^9/L" disabled={!canWrite} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="Lab Order Details" open={!!detailId} onClose={closeDetail} width={480}>
        {detail && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Test">
                {detail.test_name}
                {detail.test_code ? ` (${detail.test_code})` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Ordered">
                {dayjs(detail.ordered_at).format("DD MMM YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[detail.status]}>
                  {detail.status === "ordered" ? "Awaiting Result" : "Completed"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ margin: 0 }}>Result</Typography.Title>
            {detail.result ? (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Value">
                  <div style={{ whiteSpace: "pre-wrap" }}>{detail.result.result_data}</div>
                </Descriptions.Item>
                {detail.result.reference_range && (
                  <Descriptions.Item label="Reference range">{detail.result.reference_range}</Descriptions.Item>
                )}
                <Descriptions.Item label="Uploaded">
                  {dayjs(detail.result.uploaded_at).format("DD MMM YYYY HH:mm")}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Typography.Text type="secondary">No result recorded yet.</Typography.Text>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
