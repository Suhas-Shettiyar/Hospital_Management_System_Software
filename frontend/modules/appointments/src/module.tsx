import { CalendarOutlined } from "@ant-design/icons";
import type { HmsModule } from "./moduleContract";
import QueuePage from "./QueuePage";
import NewAppointmentForm from "./NewAppointmentForm";

/** This is the one thing exposed via federation (see vite.config.ts's
 * `exposes: { "./module": "./src/module.tsx" }`). The host dynamically
 * imports this and passes it straight to its own registerModule(). */
export const appointmentsModule: HmsModule = {
  id: "appointments", // must match backend's module_registry.module_id
  title: "Appointments",
  icon: <CalendarOutlined />,
  order: 15,
  routes: [
    { path: "appointments", element: <QueuePage /> },
    { path: "appointments/new", element: <NewAppointmentForm /> },
  ],
  menu: [
    { path: "/appointments", label: "Queue" },
    { path: "/appointments/new", label: "Book Appointment" },
  ],
};
