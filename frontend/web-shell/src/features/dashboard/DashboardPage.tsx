import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Tag, Typography, Alert, Button, Space } from "antd";
import {
  ReloadOutlined,
  ApiOutlined,
  TeamOutlined,
  FieldTimeOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";
import { useCountUp } from "../../lib/useCountUp";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  tint: string;
  color: string;
  prefix?: string;
}

function StatCard({ title, value, icon, tint, color, prefix }: StatCardProps) {
  const animated = useCountUp(value);
  return (
    <Card className="hoverable-lift" styles={{ body: { padding: 20 } }}>
      <Space align="start" size={14}>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            width: 40,
            height: 40,
            borderRadius: 10,
            background: tint,
            color,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <Statistic title={title} value={animated} prefix={prefix} />
      </Space>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
  });

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Dashboard</Typography.Title>
        <Typography.Text type="secondary">Overview of today's activity</Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <StatCard title="Patients today" value={0} icon={<TeamOutlined />}
                    tint="var(--brand-accent-soft)" color="var(--brand-accent)" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="In queue" value={0} icon={<FieldTimeOutlined />}
                    tint="var(--warning-bg)" color="var(--brand-primary)" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Consultations" value={0} icon={<MedicineBoxOutlined />}
                    tint="var(--success-bg)" color="var(--brand-primary)" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Revenue" value={0} prefix="₹" icon={<DollarOutlined />}
                    tint="var(--success-bg)" color="var(--info-color)" />
        </Col>
      </Row>

      <Card
        className="hoverable-lift"
        style={{ marginTop: 16 }}
        title={<Space><ApiOutlined /> System status</Space>}
        extra={<Button size="small" icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>Retry</Button>}
      >
        {isLoading && <Typography.Text>Checking backend…</Typography.Text>}
        {isError && (
          <Alert type="error" showIcon message="Backend not reachable"
                 description={`Start the backend: uvicorn app.main:app --reload  (${(error as Error).message})`} />
        )}
        {data && (
          <Space size="large" wrap>
            <Tag color="success">● Backend connected</Tag>
            <span><b>Service:</b> {data.service}</span>
            <span><b>Version:</b> {data.version}</span>
            <span><b>Status:</b> {data.status}</span>
          </Space>
        )}
      </Card>
    </div>
  );
}
