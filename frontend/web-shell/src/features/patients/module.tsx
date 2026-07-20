import { IdcardOutlined } from "@ant-design/icons";
import type { HmsModule } from "../../app/moduleRegistry";
import PatientsPage from "./PatientsPage";

export const patientsModule: HmsModule = {
  id: "patients",
  title: "Patients",
  icon: <IdcardOutlined />,
  order: 1,
  routes: [{ path: "patients", element: <PatientsPage /> }],
  menu: [{ path: "/patients", label: "Patients" }],
  permissions: ["patients:read"],
};
