import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp } from "antd";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AuthProvider } from "./features/auth/AuthProvider";
import { queryClient } from "./lib/queryClient";
import type { AppRouter } from "./app/router";

/** router is a prop, not an internal import: it must be built AFTER modules
 * (including async-loaded remotes) are registered - see bootstrap.tsx. */
export default function App({ router }: { router: AppRouter }) {
  return (
    <ThemeProvider>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ThemeProvider>
  );
}
