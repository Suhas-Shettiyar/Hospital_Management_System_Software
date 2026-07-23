import type { ReactNode } from "react";
import { useState } from "react";
import { Layout, Spin } from "antd";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../features/auth/AuthProvider";

/** Every module renders inside this frame. Sidebar visibility is owned here
 * (not inside Sidebar itself) because collapsing hides the sidebar
 * completely — the toggle to bring it back has to live somewhere that
 * stays on screen, which is the Topbar. */
export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!sidebarCollapsed && <Sidebar onCollapse={() => setSidebarCollapsed(true)} />}
      <Layout>
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onExpandSidebar={() => setSidebarCollapsed(false)}
        />
        <Layout.Content className="content surface-tint">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

/** Shared full-viewport loading state — used here and by RootGate, since
 * both are waiting on the same session-restore check. */
export function FullPageSpinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Spin size="large" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  // Wait for the initial session-restore check (stored token -> /api/auth/me)
  // before deciding to redirect - otherwise a valid refreshed session would
  // flash to "/" and bounce back once the check resolves.
  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
