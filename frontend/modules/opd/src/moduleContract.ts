/**
 * Local copy of the web-shell host's HmsModule/HmsMenuItem contract
 * (see frontend/web-shell/src/app/moduleRegistry.ts). Duplicated rather than
 * imported because this remote is a wholly separate Vite/npm project - that
 * separation is the point of federation. Structural typing (both sides use
 * the same shape) is all that's needed to keep them compatible.
 */
import type { ReactNode } from "react";
import type { RouteObject } from "react-router-dom";

export interface HmsMenuItem {
  path: string;
  label: string;
  icon?: ReactNode;
}

export interface HmsModule {
  id: string;
  title: string;
  routes: RouteObject[];
  menu?: HmsMenuItem[];
  icon?: ReactNode;
  permissions?: string[];
  order?: number;
}
