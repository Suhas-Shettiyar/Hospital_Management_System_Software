import { MedicineBoxOutlined } from "@ant-design/icons";
import "./opd.css";
import type { HmsModule } from "./moduleContract";
import PatientSearchPage from "./PatientSearchPage";
import ConsultationWorkspace from "./ConsultationWorkspace";
import VisitDetailPage from "./VisitDetailPage";

/** This is the one thing exposed via federation (see vite.config.ts's
 * `exposes: { "./module": "./src/module.tsx" }`). The host dynamically
 * imports this and passes it straight to its own registerModule(). */
export const opdModule: HmsModule = {
  id: "opd", // must match backend's module_registry.module_id
  title: "Outpatient",
  icon: <MedicineBoxOutlined />,
  order: 10,
  routes: [
    { path: "opd", element: <PatientSearchPage /> },
    { path: "opd/consult/:patientId", element: <ConsultationWorkspace /> },
    { path: "opd/visits/:visitId", element: <VisitDetailPage /> },
  ],
  menu: [{ path: "/opd", label: "Outpatient" }],
  permissions: ["patients:read"],
};
