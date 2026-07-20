import { ShopOutlined } from "@ant-design/icons";
import type { HmsModule } from "./moduleContract";
import MedicinesPage from "./MedicinesPage";
import DispensePage from "./DispensePage";

/** This is the one thing exposed via federation (see vite.config.ts's
 * `exposes: { "./module": "./src/module.tsx" }`). The host dynamically
 * imports this and passes it straight to its own registerModule(). */
export const pharmacyModule: HmsModule = {
  id: "pharmacy", // must match backend's module_registry.module_id
  title: "Pharmacy",
  icon: <ShopOutlined />,
  order: 40,
  routes: [
    { path: "pharmacy", element: <MedicinesPage /> },
    { path: "pharmacy/dispense", element: <DispensePage /> },
  ],
  menu: [
    { path: "/pharmacy", label: "Medicines" },
    { path: "/pharmacy/dispense", label: "Dispense" },
  ],
};
