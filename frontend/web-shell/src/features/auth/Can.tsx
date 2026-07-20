import type { ReactNode } from "react";
import { useCan } from "./useCan";

interface CanProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Conditionally renders children only if the current user has `permission`.
 * Cosmetic convenience only - see useCan.ts. */
export function Can({ permission, children, fallback = null }: CanProps) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>;
}
