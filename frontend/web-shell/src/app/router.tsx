import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell, { ProtectedRoute } from "./shell/AppShell";
import LoginPage from "../features/auth/LoginPage";
import { getModuleRoutes } from "./moduleRegistry";

/** A factory, not a singleton: modules (including async-loaded remotes) must
 * all be registered before this is called, so bootstrap.tsx calls this after
 * awaiting loadRemoteModules() - not at module-import time. */
export type AppRouter = ReturnType<typeof createBrowserRouter>;

export function createAppRouter(): AppRouter {
  return createBrowserRouter([
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: <ProtectedRoute><AppShell /></ProtectedRoute>,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        ...getModuleRoutes(),
        { path: "*", element: <Navigate to="/dashboard" replace /> },
      ],
    },
  ]);
}
