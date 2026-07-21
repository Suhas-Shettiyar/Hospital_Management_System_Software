import { MedicineBoxOutlined } from "@ant-design/icons";
import type { HmsModule } from "./moduleContract";
import ConsultationsPage from "./ConsultationsPage";
import NewConsultationForm from "./NewConsultationForm";

/** This is the one thing exposed via federation (see vite.config.ts's
 * `exposes: { "./module": "./src/module.tsx" }`). The host dynamically
 * imports this and passes it straight to its own registerModule(). */
export const opdModule: HmsModule = {
  id: "opd", // must match backend's module_registry.module_id
  title: "OPD",
  icon: <MedicineBoxOutlined />,
  order: 20,
  routes: [
    { path: "opd", element: <ConsultationsPage /> },
    { path: "opd/new", element: <NewConsultationForm /> },
  ],
  menu: [
    { path: "/opd", label: "Consultations" },
    { path: "/opd/new", label: "New Consultation" },
  ],
  permissions: ["consultation:read"],
};
