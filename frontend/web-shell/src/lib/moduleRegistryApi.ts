// Fetches the REAL backend module_registry state (not the static config-based
// enabled_modules list from "/") so the frontend knows which optional remote
// modules to actually try loading. Degrades gracefully to "no optional
// modules" on any failure - the app must still boot with just the core
// dashboard if the backend is down, unreachable, or slow.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

interface ModuleStatus {
  module_id: string;
  version: string;
  enabled: boolean;
}

export async function fetchEnabledModuleIds(): Promise<Set<string>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}/modules`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`/modules responded ${res.status}`);
    const modules: ModuleStatus[] = await res.json();
    return new Set(modules.filter((m) => m.enabled).map((m) => m.module_id));
  } catch (err) {
    console.warn("[modules] /api/modules unreachable; degrading to core-only modules", err);
    return new Set();
  }
}
