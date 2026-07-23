import { FileTextOutlined, CalendarOutlined } from "@ant-design/icons";
import type { HmsModule } from "../../app/moduleRegistry";
import MyRecordsPage from "./MyRecordsPage";
import MyAppointmentsPage from "./MyAppointmentsPage";

/** A patient's own view - same AppShell/Sidebar/Dashboard chrome every other
 * role gets, gated by the "portal:self" permission only role=patient
 * carries (see backend/app/core/auth/permissions.py). No staff module
 * declares that permission, so this is the only thing a patient sees in the
 * sidebar besides Dashboard - same mechanism as any other role, not a
 * bespoke shell. The actual data scoping (a patient only ever sees their
 * own records) is enforced server-side by identity in
 * app/core/patient_portal/router.py, not by this permission string. */
export const portalModule: HmsModule = {
  id: "portal",
  title: "My Health",
  icon: <FileTextOutlined />,
  order: 2,
  routes: [
    { path: "portal/records", element: <MyRecordsPage /> },
    { path: "portal/appointments", element: <MyAppointmentsPage /> },
  ],
  menu: [
    { path: "/portal/records", label: "My Records", icon: <FileTextOutlined /> },
    { path: "/portal/appointments", label: "My Appointments", icon: <CalendarOutlined /> },
  ],
  permissions: ["portal:self"],
};
