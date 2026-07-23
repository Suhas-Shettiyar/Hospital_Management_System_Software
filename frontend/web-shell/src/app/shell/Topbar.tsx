import { Layout, Space, Dropdown, Avatar, Button, Tooltip, Typography } from "antd";
import { BulbOutlined, MoonOutlined, UserOutlined, LogoutOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";
import { useThemeMode } from "../../theme/ThemeProvider";
import { useAuth } from "../../features/auth/AuthProvider";
import { useCan } from "../../features/auth/useCan";

interface TopbarProps {
  sidebarCollapsed: boolean;
  onExpandSidebar: () => void;
}

export default function Topbar({ sidebarCollapsed, onExpandSidebar }: TopbarProps) {
  const { mode, toggle } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // GlobalSearch calls the patients:read-gated /api/patients endpoint - a
  // role without that permission (e.g. a patient-portal login) would only
  // get a useless always-empty/403'ing search box, so hide it entirely.
  const canSearchPatients = useCan("patients:read");

  return (
    <Layout.Header className="topbar">
      {/* Only shown once the sidebar is fully hidden — it's the sidebar's
       * own top-of-brand button otherwise. */}
      {sidebarCollapsed && (
        <Tooltip title="Show navigation">
          <Button type="text" aria-label="Show navigation" icon={<MenuUnfoldOutlined />} onClick={onExpandSidebar} />
        </Tooltip>
      )}
      <div className="topbar-search">{canSearchPatients && <GlobalSearch />}</div>
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
                onClick: () => { logout(); navigate("/", { replace: true }); } },
            ],
          }}
        >
          <Space className="topbar-user" style={{ cursor: "pointer" }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ background: "var(--brand-primary)" }} />
            <span className="topbar-username">{user?.name ?? "User"}</span>
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  );
}
