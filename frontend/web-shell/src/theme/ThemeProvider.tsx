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
    // The active-nav rail / focus-ring accent — no gold or any second hue,
    // just the one palette's primary tone (named "rail" for what it's
    // actually used for, not a color name).
    root.style.setProperty("--brand-rail", isDark ? brand.primaryDark : brand.primary);
    root.style.setProperty("--brand-rail-hover", isDark ? brand.primaryDarkHover : brand.primaryHover);
    root.style.setProperty("--brand-rail-soft", isDark ? brand.primarySoftDark : brand.primarySoft);
    // Logo badge glow: a soft blend of the palette's two weights (the given
    // dark swatch's paired light swatch), always the same regardless of app
    // mode — a decorative mark, not text-bearing, so it can stay a touch
    // richer than the flat shade used for buttons, without introducing any
    // color outside the given palette.
    root.style.setProperty(
      "--brand-glow",
      `radial-gradient(circle at 30% 30%, ${brand.primaryDark}, ${brand.accent})`
    );
    root.style.setProperty("--success-bg", isDark ? brand.successSoftDark : brand.successSoft);
    root.style.setProperty("--warning-bg", isDark ? brand.warningSoftDark : brand.warningSoft);
    root.style.setProperty("--info-color", isDark ? brand.infoDark : brand.info);
    // Fixed deep anchor tone (the darkest given swatch) for large solid-fill
    // bands that hold white text (sidebar, landing hero/closing, login
    // modal) — deliberately NOT mode-dependent. surfaceFillAccent is a
    // lighter stop of the SAME palette (not a second color), giving the
    // hero/closing bands gentle gradient depth.
    root.style.setProperty("--brand-surface-fill", brand.surfaceFill);
    root.style.setProperty("--brand-surface-fill-accent", brand.surfaceFillAccent);
    // Plain (non-antd) elements that sit on a fixed-beige surface regardless
    // of app mode (the public landing nav) still need explicit, correct text
    // color — leaving it to inherit risks the browser's dark color-scheme
    // UA default (near-white) landing on a light background.
    root.style.setProperty("--text-on-beige", gray.light[8]);
    // The landing nav stays a fixed light surface regardless of app mode
    // (public marketing page) — beige, not literal white, per instruction.
    root.style.setProperty("--surface-beige", gray.light[1]);

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
