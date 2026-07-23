import { ExperimentOutlined } from "@ant-design/icons";
import type { HmsModule } from "./moduleContract";
import LabOrdersPage from "./LabOrdersPage";
import NewLabOrderForm from "./NewLabOrderForm";

/** This is the one thing exposed via federation (see vite.config.ts's
 * `exposes: { "./module": "./src/module.tsx" }`). The host dynamically
 * imports this and passes it straight to its own registerModule(). */
export const labModule: HmsModule = {
  id: "lab", // must match backend's module_registry.module_id
  title: "Lab",
  icon: <ExperimentOutlined />,
  order: 30,
  routes: [
    { path: "lab", element: <LabOrdersPage /> },
    { path: "lab/new", element: <NewLabOrderForm /> },
  ],
  menu: [
    { path: "/lab", label: "Lab Orders" },
    { path: "/lab/new", label: "New Lab Order" },
  ],
  permissions: ["lab:read"],
};
