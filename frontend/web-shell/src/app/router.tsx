import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell, { ProtectedRoute } from "./shell/AppShell";
import LoginPage from "../features/auth/LoginPage";
import { getModuleRoutes } from "./moduleRegistry";
import { registerCoreModules } from "../modules/registerCore";

// Register modules first so the registry is populated before routes are read.
registerCoreModules();

/** Public /login + a protected shell that hosts all module routes. */
export const router = createBrowserRouter([
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
