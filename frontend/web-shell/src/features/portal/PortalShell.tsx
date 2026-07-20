import { Outlet, useNavigate, Link } from "react-router-dom";
import { Layout, Space, Button, Typography } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../auth/AuthProvider";

/** Deliberately its own small layout, not a reuse of the staff AppShell's
 * Sidebar/Topbar - a patient should see a distinct, simple "my records"
 * experience, not the department-management chrome. See the Patient Portal
 * plan for why this is a separate route branch, not another sidebar entry. */
export default function PortalShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
        }}
      >
        <Link to="/portal" style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>
          MedCore HMS — My Health
        </Link>
        <Space>
          <Typography.Text style={{ color: "#fff" }}>{user?.name}</Typography.Text>
          <Button type="text" style={{ color: "#fff" }} icon={<LogoutOutlined />} onClick={onLogout}>
            Sign out
          </Button>
        </Space>
      </Layout.Header>
      <Layout.Content className="content surface-tint">
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
