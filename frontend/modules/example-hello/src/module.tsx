import { ExperimentOutlined } from "@ant-design/icons";
import type { HmsModule } from "./moduleContract";
import ExampleHelloPage from "./ExampleHelloPage";

/** This is the one thing exposed via federation (see vite.config.ts's
 * `exposes: { "./module": "./src/module.tsx" }`). The host dynamically
 * imports this and passes it straight to its own registerModule(). */
export const exampleHelloModule: HmsModule = {
  id: "example_hello", // must match backend's module_registry.module_id
  title: "Example Hello",
  icon: <ExperimentOutlined />,
  order: 50,
  routes: [{ path: "example-hello", element: <ExampleHelloPage /> }],
  menu: [{ path: "/example-hello", label: "Example Hello" }],
};
