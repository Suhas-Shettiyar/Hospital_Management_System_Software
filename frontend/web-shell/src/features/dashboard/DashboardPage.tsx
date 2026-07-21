import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Tag, Typography, Alert, Button, Space } from "antd";
import {
  ReloadOutlined,
  ApiOutlined,
  TeamOutlined,
  FieldTimeOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
  CalendarOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";
import { useCountUp } from "../../lib/useCountUp";
import { useCan } from "../auth/useCan";
import { listMyAppointments, listMyBills, listMyLabOrders, listMyConsultations } from "../portal/portalApi";

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

function PatientStatCards() {
  const { data: appointments } = useQuery({ queryKey: ["portal", "appointments"], queryFn: listMyAppointments });
  const { data: bills } = useQuery({ queryKey: ["portal", "bills"], queryFn: listMyBills });
  const { data: labOrders } = useQuery({ queryKey: ["portal", "lab-orders"], queryFn: listMyLabOrders });
  const { data: consultations } = useQuery({ queryKey: ["portal", "consultations"], queryFn: listMyConsultations });

  const upcoming = (appointments?.items ?? []).filter((a) => a.status === "scheduled").length;
  const pendingBills = (bills?.items ?? []).filter((b) => b.status === "finalized").length;
  const awaitingResults = (labOrders?.items ?? []).filter((o) => o.status === "ordered").length;
  const totalConsultations = consultations?.total ?? 0;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <StatCard title="Upcoming appointments" value={upcoming} icon={<CalendarOutlined />}
                  tint="var(--brand-accent-soft)" color="var(--brand-accent)" />
      </Col>
      <Col xs={12} md={6}>
        <StatCard title="Bills awaiting payment" value={pendingBills} icon={<DollarOutlined />}
                  tint="var(--warning-bg)" color="var(--brand-primary)" />
      </Col>
      <Col xs={12} md={6}>
        <StatCard title="Lab results pending" value={awaitingResults} icon={<ExperimentOutlined />}
                  tint="var(--success-bg)" color="var(--brand-primary)" />
      </Col>
      <Col xs={12} md={6}>
        <StatCard title="Consultations" value={totalConsultations} icon={<MedicineBoxOutlined />}
                  tint="var(--success-bg)" color="var(--info-color)" />
      </Col>
    </Row>
  );
}

function StaffStatCards() {
  return (
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
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
  });
  const isPatient = useCan("portal:self");

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Dashboard</Typography.Title>
        <Typography.Text type="secondary">Overview of today's activity</Typography.Text>
      </div>

      {isPatient ? <PatientStatCards /> : <StaffStatCards />}

      {!isPatient && (
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
      )}
    </div>
  );
}
