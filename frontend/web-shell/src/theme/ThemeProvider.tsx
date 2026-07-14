import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import { brand, darkTheme, lightTheme } from "./tokens";

type Mode = "light" | "dark";
interface ThemeCtx { mode: Mode; toggle: () => void; setMode: (m: Mode) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "hms-theme-mode";

function getInitialMode(): Mode {
  const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(getInitialMode);

  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  };
  const toggle = () => setMode(mode === "light" ? "dark" : "light");

  // Expose brand colors + mode as CSS variables for our own components.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", mode === "dark" ? brand.primaryDark : brand.primary);
    root.style.setProperty("--brand-accent", brand.accent);
    root.style.setProperty("--brand-accent-soft", brand.accentSoft);
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(() => ({ mode, toggle, setMode }), [mode]);

  return (
    <Ctx.Provider value={value}>
      <ConfigProvider theme={mode === "dark" ? darkTheme : lightTheme}>{children}</ConfigProvider>
    </Ctx.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeProvider");
  return ctx;
}
