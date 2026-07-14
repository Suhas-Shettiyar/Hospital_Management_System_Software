// Tiny fetch helper. Uses VITE_API_BASE (default "/api"), which Vite proxies
// to the FastAPI backend during development.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export interface HealthResponse { status: string; service: string; version: string; }

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Backend responded ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => get<HealthResponse>("/health"),
};
