import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LabOrdersPage from "./LabOrdersPage";
import NewLabOrderForm from "./NewLabOrderForm";

/** Standalone preview harness - lets a developer work on this remote
 * (npm run dev, port 5176) without the web-shell host running at all. This
 * is NOT what gets loaded by the host; the host loads module.tsx directly. */
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/lab"]}>
            <Routes>
              <Route path="/lab" element={<LabOrdersPage />} />
              <Route path="/lab/new" element={<NewLabOrderForm />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
);
