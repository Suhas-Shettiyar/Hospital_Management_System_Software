import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell, { ProtectedRoute } from "./shell/AppShell";
import RootGate from "../features/landing/RootGate";
import { getModuleRoutes } from "./moduleRegistry";
import PortalShell from "../features/portal/PortalShell";
import PortalHome from "../features/portal/PortalHome";
import MyRecordsPage from "../features/portal/MyRecordsPage";
import MyAppointmentsPage from "../features/portal/MyAppointmentsPage";

/** A factory, not a singleton: modules (including async-loaded remotes) must
 * all be registered before this is called, so bootstrap.tsx calls this after
 * awaiting loadRemoteModules() - not at module-import time. */
export type AppRouter = ReturnType<typeof createBrowserRouter>;

export function createAppRouter(): AppRouter {
  return createBrowserRouter([
    // RootGate owns "/": landing page for anonymous visitors, redirect to
    // /dashboard for authenticated ones. Login is modal-only now — there is
    // no standalone /login route.
    { path: "/", element: <RootGate /> },
    {
      path: "/",
      element: <ProtectedRoute><AppShell /></ProtectedRoute>,
      children: [
        ...getModuleRoutes(),
        { path: "*", element: <Navigate to="/dashboard" replace /> },
      ],
    },
    // A patient's distinct, simple "my records" experience - deliberately a
    // separate shell/branch, not registered via getModuleRoutes() (that
    // mechanism feeds the staff sidebar). See the Patient Portal plan.
    {
      path: "/portal",
      element: <ProtectedRoute><PortalShell /></ProtectedRoute>,
      children: [
        { index: true, element: <PortalHome /> },
        { path: "records", element: <MyRecordsPage /> },
        { path: "appointments", element: <MyAppointmentsPage /> },
        { path: "*", element: <Navigate to="/portal" replace /> },
      ],
    },
  ]);
}
