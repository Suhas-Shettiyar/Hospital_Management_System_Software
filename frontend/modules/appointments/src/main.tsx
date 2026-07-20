import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import QueuePage from "./QueuePage";
import NewAppointmentForm from "./NewAppointmentForm";

/** Standalone preview harness - lets a developer work on this remote
 * (npm run dev, port 5178) without the web-shell host running at all. This
 * is NOT what gets loaded by the host; the host loads module.tsx directly. */
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/appointments"]}>
            <Routes>
              <Route path="/appointments" element={<QueuePage />} />
              <Route path="/appointments/new" element={<NewAppointmentForm />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
);
