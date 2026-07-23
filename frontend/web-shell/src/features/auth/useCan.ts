import { useAuth } from "./AuthProvider";

/** Cosmetic convenience only - the backend's require(permission) dependency
 * is the real gate. This just avoids showing/enabling UI a user's role
 * can't act on anyway. */
export function useCan(permission: string): boolean {
  const { permissionSet } = useAuth();
  return permissionSet.has(permission);
}
