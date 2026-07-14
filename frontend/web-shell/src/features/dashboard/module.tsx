import { DashboardOutlined } from "@ant-design/icons";
import type { HmsModule } from "../../app/moduleRegistry";
import DashboardPage from "./DashboardPage";

/** The dashboard registered as a core module — the template every department
 *  package (OPD, Lab, ...) will copy. */
export const dashboardModule: HmsModule = {
  id: "dashboard",
  title: "Dashboard",
  icon: <DashboardOutlined />,
  order: 0,
  routes: [{ path: "dashboard", element: <DashboardPage /> }],
  menu: [{ path: "/dashboard", label: "Dashboard" }],
};
