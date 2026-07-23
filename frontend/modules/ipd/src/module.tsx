import { HeartOutlined } from "@ant-design/icons";
import type { HmsModule } from "./moduleContract";
import WardBoardPage from "./WardBoardPage";
import NewAdmissionForm from "./NewAdmissionForm";
import DischargeSummaryPrintView from "./DischargeSummaryPrintView";

/** This is the one thing exposed via federation (see vite.config.ts's
 * `exposes: { "./module": "./src/module.tsx" }`). The host dynamically
 * imports this and passes it straight to its own registerModule(). */
export const ipdModule: HmsModule = {
  id: "ipd", // must match backend's module_registry.module_id
  title: "IPD",
  icon: <HeartOutlined />,
  order: 25,
  routes: [
    { path: "ipd", element: <WardBoardPage /> },
    { path: "ipd/admit", element: <NewAdmissionForm /> },
    { path: "ipd/admissions/:admissionId/summary/print", element: <DischargeSummaryPrintView /> },
  ],
  menu: [
    { path: "/ipd", label: "Ward Board" },
    { path: "/ipd/admit", label: "New Admission" },
  ],
};
