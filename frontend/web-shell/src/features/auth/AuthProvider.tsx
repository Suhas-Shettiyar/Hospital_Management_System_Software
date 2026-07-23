import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "./authApi";
import { clearToken, getToken, setToken } from "../../lib/authToken";

export interface User {
  user_id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  is_verified: boolean;
}

interface AuthCtx {
  user: User | null;
  /** True only while restoring a session from a stored token on first load -
   * ProtectedRoute waits for this before deciding to redirect, so a valid
   * refreshed session isn't bounced to "/" before the check completes. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, restore a session from a stored token if one exists.
  // Never trust a locally-decoded token blindly - validate it against the
  // backend and fetch fresh user info.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me(token)
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token, user: loggedInUser } = await authApi.login(email, password);
    setToken(access_token);
    setUser(loggedInUser);
  };

  const logout = () => {
    // Purely client-side: the backend has no logout/revocation endpoint by
    // design (accepted tradeoff from the token-lifetime decision) - the
    // token just stops being sent, and remains valid server-side until its
    // own ~10h expiry.
    clearToken();
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
