import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp } from "antd";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AuthProvider } from "./features/auth/AuthProvider";
import { queryClient } from "./lib/queryClient";
import { router } from "./app/router";

export default function App() {
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
