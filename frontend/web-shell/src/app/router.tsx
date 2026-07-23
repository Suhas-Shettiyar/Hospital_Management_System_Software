import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell, { ProtectedRoute } from "./shell/AppShell";
import RootGate from "../features/landing/RootGate";
import { getModuleRoutes } from "./moduleRegistry";

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
  ]);
}
