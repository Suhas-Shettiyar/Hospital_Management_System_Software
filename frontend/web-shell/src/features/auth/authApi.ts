import type { User } from "./AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/** Extracts the backend's actual error detail (FastAPI's {"detail": "..."}
 * shape) instead of a generic message, so users see e.g. "Incorrect email
 * or password" rather than a made-up one. */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // response wasn't JSON - fall through to the generic message
  }
  return fallback;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, "Could not sign in. Please try again."));
  }
  return res.json() as Promise<TokenResponse>;
}

export async function me(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, "Session is no longer valid."));
  }
  return res.json() as Promise<User>;
}
