import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import WardBoardPage from "./WardBoardPage";
import NewAdmissionForm from "./NewAdmissionForm";
import DischargeSummaryPrintView from "./DischargeSummaryPrintView";

/** Standalone preview harness - lets a developer work on this remote
 * (npm run dev, port 5179) without the web-shell host running at all. This
 * is NOT what gets loaded by the host; the host loads module.tsx directly. */
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/ipd"]}>
            <Routes>
              <Route path="/ipd" element={<WardBoardPage />} />
              <Route path="/ipd/admit" element={<NewAdmissionForm />} />
              <Route path="/ipd/admissions/:admissionId/summary/print" element={<DischargeSummaryPrintView />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
);
