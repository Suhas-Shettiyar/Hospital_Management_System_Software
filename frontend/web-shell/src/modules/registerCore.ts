import { registerModule } from "../app/moduleRegistry";
import { dashboardModule } from "../features/dashboard/module";

/**
 * Register the modules that ship with the core. As you build department
 * packages (OPD, Lab, Pharmacy...), import and register them here — or, later,
 * let the runtime loader register federated remotes automatically.
 */
export function registerCoreModules() {
  registerModule(dashboardModule);
}
