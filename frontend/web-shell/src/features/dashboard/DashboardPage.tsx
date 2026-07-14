import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Tag, Typography, Alert, Button, Space } from "antd";
import { ReloadOutlined, ApiOutlined } from "@ant-design/icons";
import { api } from "../../lib/api";

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
        <Col xs={12} md={6}><Card><Statistic title="Patients today" value={0} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="In queue" value={0} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Consultations" value={0} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Revenue (₹)" value={0} /></Card></Col>
      </Row>

      <Card
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
            <Tag color="green">● Backend connected</Tag>
            <span><b>Service:</b> {data.service}</span>
            <span><b>Version:</b> {data.version}</span>
            <span><b>Status:</b> {data.status}</span>
          </Space>
        )}
      </Card>
    </div>
  );
}
