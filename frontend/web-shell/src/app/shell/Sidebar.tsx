import { useMemo, useState } from "react";
import { Layout, Menu } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { getModules } from "../moduleRegistry";

/** The sidebar is generated from registered modules — add a module, get a nav
 *  entry for free. Nothing here is hard-coded per department. */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const items: MenuProps["items"] = useMemo(
    () =>
      getModules().map((m) => {
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
    [navigate]
  );

  return (
    <Layout.Sider
      theme="light"
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={228}
      className="sidebar"
    >
      <div className="sidebar-brand">
        <span className="sidebar-logo">M</span>
        {!collapsed && <span className="sidebar-name">MedCore</span>}
      </div>
      <Menu mode="inline" selectedKeys={[location.pathname]} items={items} style={{ borderInlineEnd: 0 }} />
    </Layout.Sider>
  );
}
