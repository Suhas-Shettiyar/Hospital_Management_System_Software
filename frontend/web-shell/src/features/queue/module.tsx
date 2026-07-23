import { ClockCircleOutlined } from "@ant-design/icons";
import type { HmsModule } from "../../app/moduleRegistry";
import QueuePage from "./QueuePage";

export const queueModule: HmsModule = {
  id: "queue",
  title: "Queue",
  icon: <ClockCircleOutlined />,
  order: 2,
  routes: [{ path: "queue", element: <QueuePage /> }],
  menu: [{ path: "/queue", label: "Queue" }],
  permissions: ["queue:read"],
};
