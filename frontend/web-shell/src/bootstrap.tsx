import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./index.css";
import { registerCoreModules } from "./modules/registerCore";
import { loadRemoteModules } from "./modules/loadRemoteModules";
import { fetchEnabledModuleIds } from "./lib/moduleRegistryApi";
import { createAppRouter } from "./app/router";

/** Modules (including async-loaded remotes) must all be registered before
 * the router is built, since getModuleRoutes()/getModules() are read
 * synchronously by createAppRouter()/Sidebar. That's why this whole
 * sequence is async and main.tsx just awaits it via a dynamic import. */
async function bootstrap() {
  registerCoreModules();

  const enabledIds = await fetchEnabledModuleIds();
  await loadRemoteModules(enabledIds);

  const router = createAppRouter();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App router={router} />
    </StrictMode>
  );
}

bootstrap();
