import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Table, Tag, Button, Drawer, Descriptions, Space, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  listConsultations,
  getConsultation,
  getPatient,
  type ConsultationListItem,
} from "./opdApi";

export default function ConsultationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientFilter = searchParams.get("patient");
  const patientIdNum = patientFilter ? Number(patientFilter) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["opd", "consultations", patientIdNum],
    queryFn: () => listConsultations(patientIdNum),
  });

  const { data: filterPatient } = useQuery({
    queryKey: ["opd", "patient", patientIdNum],
    queryFn: () => getPatient(patientIdNum as number),
    enabled: patientIdNum !== undefined,
  });

  const detailId = searchParams.get("consult");
  const { data: detail } = useQuery({
    queryKey: ["opd", "consultation", detailId],
    queryFn: () => getConsultation(Number(detailId)),
    enabled: !!detailId,
  });

  const openDetail = (consultId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("consult", String(consultId));
    setSearchParams(next);
  };

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("consult");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {filterPatient ? `Consultations for ${filterPatient.name}` : "OPD Consultations"}
        </Typography.Title>
        <Typography.Text type="secondary">
          {filterPatient ? filterPatient.uhid : "Outpatient visit history"}
        </Typography.Text>
      </div>

      <Card styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(patientIdNum ? `/opd/new?patient=${patientIdNum}` : "/opd/new")}
          >
            New Consultation
          </Button>
        </div>

        <Table<ConsultationListItem>
          rowKey="consult_id"
          loading={isLoading}
          dataSource={data?.items ?? []}
          pagination={{ total: data?.total ?? 0, showSizeChanger: false }}
          onRow={(record) => ({ onClick: () => openDetail(record.consult_id), style: { cursor: "pointer" } })}
          columns={[
            { title: "Date", dataIndex: "consult_date", render: (d: string) => dayjs(d).format("DD MMM YYYY") },
            ...(patientIdNum ? [] : [{ title: "Patient ID", dataIndex: "patient_id" }]),
            { title: "Diagnosis", dataIndex: "diagnosis_text" },
            {
              title: "Prescription",
              dataIndex: "has_prescription",
              render: (has: boolean) => (has ? <Tag color="success">Has Rx</Tag> : <Tag>Advice only</Tag>),
            },
          ]}
        />
      </Card>

      <Drawer title="Consultation Details" open={!!detailId} onClose={closeDetail} width={480}>
        {detail && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Date">
                {dayjs(detail.consult_date).format("DD MMM YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="Chief complaint">{detail.chief_complaint}</Descriptions.Item>
              <Descriptions.Item label="Diagnosis">
                {detail.diagnosis_text}
                {detail.diagnosis_code ? ` (${detail.diagnosis_code})` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Notes">{detail.notes ?? "—"}</Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ margin: 0 }}>Prescription</Typography.Title>
            {detail.prescription ? (
              <>
                {detail.prescription.instructions && (
                  <Typography.Text type="secondary">{detail.prescription.instructions}</Typography.Text>
                )}
                <Table
                  size="small"
                  rowKey="item_id"
                  pagination={false}
                  dataSource={detail.prescription.items}
                  columns={[
                    { title: "Medicine", dataIndex: "med_name" },
                    { title: "Dose", dataIndex: "dose" },
                    { title: "Frequency", dataIndex: "frequency" },
                    { title: "Duration", dataIndex: "duration" },
                  ]}
                />
              </>
            ) : (
              <Typography.Text type="secondary">Advice only - no medicines prescribed.</Typography.Text>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
