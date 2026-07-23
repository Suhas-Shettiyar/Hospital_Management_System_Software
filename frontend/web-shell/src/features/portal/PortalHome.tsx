import { Link } from "react-router-dom";
import { Typography, Card, Row, Col } from "antd";
import { FileTextOutlined, CalendarOutlined } from "@ant-design/icons";
import { useAuth } from "../auth/AuthProvider";

export default function PortalHome() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Welcome, {user?.name}</Typography.Title>
        <Typography.Text type="secondary">Your health records, in one place</Typography.Text>
      </div>

      <Row gutter={16}>
        <Col span={12}>
          <Link to="/portal/records">
            <Card hoverable>
              <FileTextOutlined style={{ fontSize: 28, marginBottom: 8 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>My Records</Typography.Title>
              <Typography.Text type="secondary">Consultations, lab results, and bills</Typography.Text>
            </Card>
          </Link>
        </Col>
        <Col span={12}>
          <Link to="/portal/appointments">
            <Card hoverable>
              <CalendarOutlined style={{ fontSize: 28, marginBottom: 8 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>My Appointments</Typography.Title>
              <Typography.Text type="secondary">View or book a visit</Typography.Text>
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
}
