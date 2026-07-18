import type { ReactNode } from "react";
import { Layout, Spin } from "antd";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../features/auth/AuthProvider";

/** Every module renders inside this frame. */
export default function AppShell() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar />
      <Layout>
        <Topbar />
        <Layout.Content className="content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  // Wait for the initial session-restore check (stored token -> /api/auth/me)
  // before deciding to redirect - otherwise a valid refreshed session would
  // flash to /login and bounce back once the check resolves.
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
