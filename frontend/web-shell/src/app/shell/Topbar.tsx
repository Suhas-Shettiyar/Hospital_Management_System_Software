import { Layout, Space, Dropdown, Avatar, Button, Tooltip, Typography } from "antd";
import { BulbOutlined, MoonOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";
import { useThemeMode } from "../../theme/ThemeProvider";
import { useAuth } from "../../features/auth/AuthProvider";

export default function Topbar() {
  const { mode, toggle } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout.Header className="topbar">
      <div className="topbar-search"><GlobalSearch /></div>
      <Space size="middle" align="center">
        <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"}>
          <Button
            type="text"
            aria-label="Toggle theme"
            icon={mode === "dark" ? <BulbOutlined /> : <MoonOutlined />}
            onClick={toggle}
          />
        </Tooltip>
        <Dropdown
          menu={{
            items: [
              { key: "role", disabled: true, label: <Typography.Text type="secondary">Role: {user?.role}</Typography.Text> },
              { type: "divider" },
              { key: "logout", icon: <LogoutOutlined />, label: "Sign out",
                onClick: () => { logout(); navigate("/login", { replace: true }); } },
            ],
          }}
        >
          <Space className="topbar-user" style={{ cursor: "pointer" }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ background: "var(--brand-primary)" }} />
            <span className="topbar-username">{user?.displayName ?? "User"}</span>
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  );
}
