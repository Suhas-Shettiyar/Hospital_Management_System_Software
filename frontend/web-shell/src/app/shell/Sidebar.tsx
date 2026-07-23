import { useMemo } from "react";
import { Layout, Menu, Button } from "antd";
import { MenuFoldOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { getModules } from "../moduleRegistry";
import { useAuth } from "../../features/auth/AuthProvider";

interface SidebarProps {
  /** AppShell unmounts the sidebar entirely on collapse — this only fires
   * the request, it doesn't own the collapsed state. */
  onCollapse: () => void;
}

/** The sidebar is generated from registered modules — add a module, get a nav
 *  entry for free. Nothing here is hard-coded per department.
 *
 *  Permission filtering here is cosmetic only (hides nav a role can't use);
 *  the backend's require(permission) dependency is the real gate. A module
 *  with no `permissions` declared stays visible to everyone, so existing
 *  modules that haven't opted in yet don't disappear. */
export default function Sidebar({ onCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { permissionSet } = useAuth();

  const items: MenuProps["items"] = useMemo(
    () =>
      getModules()
        .filter((m) => !m.permissions || m.permissions.some((p) => permissionSet.has(p)))
        .map((m) => {
          const entries = m.menu ?? [];
          if (entries.length <= 1) {
            const only = entries[0];
            return { key: only?.path ?? m.id, icon: m.icon, label: m.title,
                     onClick: () => only && navigate(only.path) };
          }
          return {
            key: m.id, icon: m.icon, label: m.title,
            children: entries.map((e) => ({ key: e.path, label: e.label, icon: e.icon,
                      onClick: () => navigate(e.path) })),
          };
        }),
    [navigate, permissionSet]
  );


  return (
    <Layout.Sider theme="dark" width={228} className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">M</span>
        <span className="sidebar-name">MedCore</span>
        {/* Collapsing hides the whole sidebar (see AppShell) — this button
         * only requests that, the Topbar hosts the matching expand trigger
         * since it's the thing that stays on screen afterward. */}
        <Button type="text" className="sidebar-toggle" icon={<MenuFoldOutlined />} onClick={onCollapse} />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={items}
        style={{ borderInlineEnd: 0, background: "transparent" }}
      />
    </Layout.Sider>
  );
}
