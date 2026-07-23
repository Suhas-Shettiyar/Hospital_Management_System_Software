import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "./opd.css";
import PatientSearchPage from "./PatientSearchPage";
import ConsultationWorkspace from "./ConsultationWorkspace";
import VisitDetailPage from "./VisitDetailPage";

/** Standalone preview harness - lets a developer work on this remote
 * (npm run dev, port 5175) without the web-shell host running at all. This
 * is NOT what gets loaded by the host; the host loads module.tsx directly.
 * Needs its own QueryClient/AntApp here since the host's providers aren't
 * present in this standalone context. */
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/opd"]}>
            <Routes>
              <Route path="/opd" element={<PatientSearchPage />} />
              <Route path="/opd/consult/:patientId" element={<ConsultationWorkspace />} />
              <Route path="/opd/visits/:visitId" element={<VisitDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
);
