import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import { brand, darkTheme, gray, lightTheme, shadow } from "./tokens";

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

  // Expose brand colors, shadows, gray scale + mode as CSS variables so our
  // own (non-antd) components — including the OPD remote — can theme
  // without duplicating light/dark logic.
  useEffect(() => {
    const root = document.documentElement;
    const isDark = mode === "dark";
    root.style.setProperty("--brand-primary", isDark ? brand.primaryDark : brand.primary);
    root.style.setProperty("--brand-primary-hover", isDark ? brand.primaryDarkHover : brand.primaryHover);
    root.style.setProperty("--brand-accent", isDark ? brand.accentDark : brand.accent);
    root.style.setProperty("--brand-accent-dark", brand.accentDark);
    root.style.setProperty("--brand-accent-soft", isDark ? brand.accentSoftDark : brand.accentSoft);
    // Gold — the one warm hue against the sage palette, reserved for CTAs,
    // the active-nav rail, and anything that needs to visually pop.
    root.style.setProperty("--brand-gold", isDark ? brand.goldDark : brand.gold);
    root.style.setProperty("--brand-gold-hover", brand.goldHover);
    root.style.setProperty("--brand-gold-soft", isDark ? brand.goldSoftDark : brand.goldSoft);
    root.style.setProperty(
      "--brand-glow",
      isDark
        ? `radial-gradient(circle at 30% 30%, ${brand.goldDark}, ${brand.gold})`
        : `radial-gradient(circle at 30% 30%, ${brand.gold}, ${brand.goldHover})`
    );
    root.style.setProperty("--success-bg", isDark ? brand.successSoftDark : brand.successSoft);
    root.style.setProperty("--warning-bg", isDark ? brand.warningSoftDark : brand.warningSoft);
    root.style.setProperty("--info-color", isDark ? brand.infoDark : brand.info);
    // Fixed deep Feldgrau for large solid-fill bands that hold white text
    // (sidebar, landing hero/closing, login modal) — deliberately NOT
    // mode-dependent, since brand.primary itself stays a lighter usable
    // mid-tone for buttons and icons.
    root.style.setProperty("--brand-surface-fill", brand.surfaceFill);

    const s = isDark ? shadow.dark : shadow.light;
    root.style.setProperty("--shadow-xs", s.xs);
    root.style.setProperty("--shadow-sm", s.sm);
    root.style.setProperty("--shadow-md", s.md);
    root.style.setProperty("--shadow-lg", s.lg);

    const g = isDark ? gray.dark : gray.light;
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 900];
    g.forEach((value, i) => root.style.setProperty(`--gray-${steps[i]}`, value));

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
