import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { FullPageSpinner } from "../../app/shell/AppShell";
import LandingPage from "./LandingPage";

/** Arbiter for "/": anonymous visitors see the landing page, authenticated
 * visitors (any role, patients included - the sidebar's own permission
 * filter decides what they see once inside) are sent straight to the app.
 * Gated on isLoading (same session-restore check ProtectedRoute waits on)
 * so a valid restored session doesn't flash the marketing page before
 * redirecting. */
export default function RootGate() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}
