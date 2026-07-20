/**
 * Local equivalent of the web-shell host's useCan(). This remote can't
 * import the host's AuthProvider/useCan (federation isolation - see
 * moduleContract.ts), so it fetches its own /auth/me via the shared JWT in
 * localStorage and caches it with react-query (a shared singleton, so this
 * doesn't add a second query-client instance's worth of network chatter
 * beyond the host's own /me call).
 *
 * Cosmetic convenience only - the backend's require(permission) dependency
 * is the real gate.
 */
export declare function useCan(permission: string): boolean;
