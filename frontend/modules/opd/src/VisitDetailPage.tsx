import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Skeleton, Space, Tag, Typography } from "antd";
import { ArrowLeftOutlined, MedicineBoxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { opdApi } from "./api";

/** Read-only view of a past (or in-progress) visit, reached from the
 * consultation workspace's visit-history sidebar. */
export default function VisitDetailPage() {
  const { visitId: visitIdParam } = useParams();
  const visitId = Number(visitIdParam);
  const navigate = useNavigate();

  const { data: visit, isLoading, isError } = useQuery({
    queryKey: ["opd", "visit", visitId],
    queryFn: () => opdApi.getVisit(visitId),
    enabled: Number.isFinite(visitId),
  });

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (isError || !visit) {
    return <Alert type="error" showIcon message="Could not load this visit" />;
  }

  return (
    <div className="page">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/opd/consult/${visit.patient_id}`)}>
          Back to consultation
        </Button>
      </Space>

      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Visit on {dayjs(visit.created_at).format("DD MMM YYYY, HH:mm")}
        </Typography.Title>
        <Tag color={visit.status === "completed" ? "green" : "gold"}>{visit.status}</Tag>
      </div>

      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card size="small" title="Chief complaint">
          {visit.chief_complaint || <Typography.Text type="secondary">Not recorded</Typography.Text>}
        </Card>

        <Card size="small" title="Diagnosis">
          {visit.diagnoses.length === 0 && <Typography.Text type="secondary">No diagnosis recorded</Typography.Text>}
          {visit.diagnoses.map((d) => (
            <div key={d.diagnosis_id}>
              {d.icd10_code && <Tag color="blue">{d.icd10_code}</Tag>}
              {d.description}
            </div>
          ))}
        </Card>

        <Card size="small" title={<span><MedicineBoxOutlined /> Prescription</span>}>
          {visit.prescriptions.length === 0 && (
            <Typography.Text type="secondary">No prescription recorded</Typography.Text>
          )}
          {visit.prescriptions.map((rx) => (
            <Card key={rx.prescription_id} size="small" type="inner" title={dayjs(rx.created_at).format("DD MMM, HH:mm")}>
              {rx.items.map((item) => (
                <div key={item.item_id} className="opd-rx-line">
                  <b>{item.medicine_name}</b>
                  {item.dose && <span> — {item.dose}</span>}
                  {item.frequency && <span>, {item.frequency}</span>}
                  {item.duration && <span>, {item.duration}</span>}
                </div>
              ))}
            </Card>
          ))}
        </Card>
      </Space>
    </div>
  );
}
