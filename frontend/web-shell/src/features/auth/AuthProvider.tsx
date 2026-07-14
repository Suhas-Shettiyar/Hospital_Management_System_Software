import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface User {
  username: string;
  displayName: string;
  role: string;
}

interface AuthCtx {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

/**
 * Stub auth. Accepts any non-empty credentials and creates a local session.
 * TODO (Phase 1): replace login() with a real call to POST /api/auth/login
 * once fastapi-users is wired on the backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, _password: string) => {
    // Placeholder until backend auth exists.
    await new Promise((r) => setTimeout(r, 250));
    setUser({ username, displayName: username, role: "admin" });
  };
  const logout = () => setUser(null);

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
