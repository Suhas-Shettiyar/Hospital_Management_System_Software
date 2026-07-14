/**
 * THE MODULE CONTRACT.
 *
 * Every department/feature (OPD, Lab, Pharmacy, IPD, ...) is a "module" that
 * registers itself here. The shell reads this registry to build the navigation
 * and the router. This is the frontend counterpart of the backend's
 * install-as-a-package design: when we later move to runtime module federation,
 * a remote module will call registerModule() with the same shape — so the
 * contract we lock in now is what federation plugs into.
 *
 * A module must not import another module directly; they only share the core
 * (auth, patient record, theme). That keeps packages independently removable.
 */
import type { ReactNode } from "react";
import type { RouteObject } from "react-router-dom";

export interface HmsMenuItem {
  /** Route path this menu item navigates to (absolute, e.g. "/opd/register"). */
  path: string;
  /** Label shown in the sidebar. */
  label: string;
  /** Optional icon (antd icon element). */
  icon?: ReactNode;
}

export interface HmsModule {
  /** Stable unique id, e.g. "opd". */
  id: string;
  /** Human title, e.g. "Outpatient". */
  title: string;
  /** react-router routes contributed by this module (mounted under the shell). */
  routes: RouteObject[];
  /** Sidebar entries this module contributes. */
  menu?: HmsMenuItem[];
  /** Icon for the module's menu group. */
  icon?: ReactNode;
  /** Roles allowed to see/use this module (enforced later with auth). */
  permissions?: string[];
  /** Lower numbers appear first in the sidebar. */
  order?: number;
}

const registry = new Map<string, HmsModule>();

export function registerModule(mod: HmsModule): void {
  if (registry.has(mod.id)) {
    console.warn(`[moduleRegistry] module "${mod.id}" already registered; overwriting.`);
  }
  registry.set(mod.id, mod);
}

export function getModules(): HmsModule[] {
  return [...registry.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function getModuleRoutes(): RouteObject[] {
  return getModules().flatMap((m) => m.routes);
}
