import { useQuery } from "@tanstack/react-query";
import { Card, Empty, List, Skeleton, Tag, Typography } from "antd";
import { HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { opdApi } from "./api";

interface Props {
  patientId: number;
  activeVisitId?: number;
  onSelectVisit: (visitId: number) => void;
}

/** Past visits for the current patient, shown alongside the active
 * consultation so the doctor has context without leaving the workspace. */
export default function VisitHistoryList({ patientId, activeVisitId, onSelectVisit }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["opd", "visits", "by-patient", patientId],
    queryFn: () => opdApi.listVisitsForPatient(patientId),
  });

  const pastVisits = (data ?? []).filter((v) => v.visit_id !== activeVisitId);

  return (
    <Card
      size="small"
      title={<span><HistoryOutlined /> Visit history</span>}
      styles={{ body: { maxHeight: 360, overflowY: "auto" } }}
    >
      {isLoading && <Skeleton active paragraph={{ rows: 2 }} />}

      {!isLoading && pastVisits.length === 0 && (
        <Empty description="No previous visits" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {!isLoading && pastVisits.length > 0 && (
        <List
          size="small"
          dataSource={pastVisits}
          renderItem={(visit) => (
            <List.Item
              key={visit.visit_id}
              className="opd-history-row hoverable-lift"
              onClick={() => onSelectVisit(visit.visit_id)}
            >
              <List.Item.Meta
                title={
                  <span>
                    {dayjs(visit.created_at).format("DD MMM YYYY")}{" "}
                    <Tag color={visit.status === "completed" ? "green" : "gold"}>{visit.status}</Tag>
                  </span>
                }
                description={
                  <Typography.Text type="secondary" ellipsis>
                    {visit.chief_complaint || "No complaint recorded"}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
