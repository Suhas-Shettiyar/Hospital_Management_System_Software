/**
 * Design tokens — the single source of truth for the visual identity.
 * Identity: Feldgrau + Reseda green + Alabaster + Ash gray, with one warm
 * Gold accent reserved for primary CTAs, the active-nav indicator, and
 * highlights. The sage family stays calm and earthy everywhere else so the
 * gold reads as intentional emphasis, not noise.
 *
 * These feed Ant Design's ConfigProvider. Change the look here, nowhere else.
 */
import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

// Brand constants also exposed as CSS variables (see ThemeProvider) so our
// own (non-antd) components can use them.
export const brand = {
  // Feldgrau — mid tone usable for buttons/icons, hover darkens toward
  // the deep anchor shade; dark-mode primary lightens toward sage
  // so it stays legible on a dark background.
  primary: "#57695B",
  primaryHover: "#425040",
  primaryDark: "#9B9D85",
  primaryDarkHover: "#BABFAC",
  // Alabaster — soft pastel tint, used for selected/highlighted states.
  primarySoft: "#EDF1EA",
  primarySoftDark: "#2E3830",
  // Deep, fixed (not light/dark-mode dependent) Feldgrau used ONLY for
  // large solid-fill bands that need to hold white text (sidebar, landing
  // hero/closing, login modal chrome) — brand.primary itself stays a
  // lighter usable mid-tone for buttons and icons, so it needs a deeper
  // sibling for contrast here.
  surfaceFill: "#425040",
  // Reseda green — sparing secondary accent for supporting highlights.
  accent: "#798370",
  accentDark: "#9BAA8E",
  accentSoft: "#E5E9E0",
  accentSoftDark: "#333B2E",
  // Gold — the one warm, high-contrast hue against the sage palette;
  // reserved for primary CTAs, the active-nav indicator, and anything
  // that needs to visually pop rather than blend into the earthy greens.
  gold: "#C99A3A",
  goldHover: "#B3852A",
  goldDark: "#E0B563",
  goldSoft: "#FBF0DA",
  goldSoftDark: "#3D2F14",
  danger: "#D92D20",
  dangerDark: "#F1645A",
  success: "#1F9254",
  successDark: "#3ECB7E",
  successSoft: "#E7F5EE",
  successSoftDark: "#173D2A",
  warning: "#B76E00",
  warningDark: "#E0A030",
  warningSoft: "#FBF0DC",
  warningSoftDark: "#3A2A0F",
  info: "#2563EB",
  infoDark: "#5B93F5",
} as const;

// Ash gray / Alabaster — a soft sage-tinted neutral scale, used for
// text/borders/backgrounds so the whole app's "gray" reads as part of the
// same sage family instead of a cool office-gray or stark white.
export const gray = {
  light: ["#F5F6F3", "#EDEFEA", "#DDE1D8", "#BABFAC", "#9B9D85", "#798370", "#57695B", "#3A4438", "#232B22"],
  dark: ["#1D231C", "#2A322A", "#3A4438", "#57695B", "#798370", "#9B9D85", "#BABFAC", "#DDE1D8", "#F5F6F3"],
} as const;

export const shadow = {
  light: {
    xs: "0 1px 2px rgba(16,24,32,0.04)",
    sm: "0 2px 6px rgba(16,24,32,0.06)",
    md: "0 8px 24px rgba(16,24,32,0.08)",
    lg: "0 16px 40px rgba(16,24,32,0.12)",
  },
  dark: {
    xs: "0 1px 2px rgba(0,0,0,0.4)",
    sm: "0 2px 6px rgba(0,0,0,0.45)",
    md: "0 8px 24px rgba(0,0,0,0.5)",
    lg: "0 16px 40px rgba(0,0,0,0.6)",
  },
} as const;

export const radius = { control: 8, card: 12, modal: 16 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40, huge: 48, giant: 64 } as const;

export const motion = {
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  fast: "150ms",
  base: "220ms",
  slow: "320ms",
} as const;

// Self-hosted via @fontsource/inter (imported once in main.tsx) — no CDN
// dependency, safe for offline hospital deployments.
const fontStack =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const shared: ThemeConfig["token"] = {
  // Gold is the primary action color app-wide (buttons, links, focus rings)
  // so CTAs pop against the sage surfaces instead of blending into them.
  colorPrimary: brand.gold,
  colorInfo: brand.info,
  colorSuccess: brand.success,
  colorWarning: brand.warning,
  colorError: brand.danger,
  borderRadius: radius.control,
  borderRadiusLG: radius.card,
  fontFamily: fontStack,
  fontSize: 14,
  controlHeight: 34, // compact-but-comfortable input height
  wireframe: false,
};

export const lightTheme: ThemeConfig = {
  algorithm: [antdTheme.defaultAlgorithm, antdTheme.compactAlgorithm],
  token: {
    ...shared,
    colorBgLayout: gray.light[0],
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorText: gray.light[8],
    colorTextSecondary: gray.light[5],
    colorBorder: gray.light[3],
    colorBorderSecondary: gray.light[2],
  },
  components: {
    Layout: { headerBg: "#FFFFFF", siderBg: "#FFFFFF", bodyBg: gray.light[0] },
    Menu: {
      itemSelectedBg: brand.goldSoft, itemSelectedColor: brand.goldHover, itemHoverBg: gray.light[1],
      darkItemBg: "transparent", darkItemColor: "rgba(255,255,255,0.72)",
      darkItemHoverColor: "#FFFFFF", darkItemHoverBg: "rgba(255,255,255,0.08)",
      darkItemSelectedBg: "rgba(201,154,58,0.24)", darkItemSelectedColor: "#FFFFFF",
    },
    Table: { headerBg: gray.light[1], rowHoverBg: gray.light[0], cellPaddingBlockSM: 6 },
    Button: { primaryShadow: shadow.light.xs, borderRadius: radius.control },
    Input: { borderRadius: radius.control },
    Select: { borderRadius: radius.control },
    Card: { borderRadiusLG: radius.card, boxShadowTertiary: shadow.light.xs },
    Modal: { borderRadiusLG: radius.modal },
    Drawer: {},
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm],
  token: {
    ...shared,
    colorPrimary: brand.goldDark,
    colorInfo: brand.infoDark,
    colorSuccess: brand.successDark,
    colorWarning: brand.warningDark,
    colorError: brand.dangerDark,
    colorBgLayout: gray.dark[0],
    colorBgContainer: gray.dark[1],
    colorBgElevated: gray.dark[2],
    colorText: gray.dark[8],
    colorTextSecondary: gray.dark[6],
    colorBorder: gray.dark[3],
    colorBorderSecondary: gray.dark[2],
  },
  components: {
    Layout: { headerBg: gray.dark[1], siderBg: gray.dark[0], bodyBg: gray.dark[0] },
    Menu: {
      itemSelectedBg: brand.goldSoftDark, itemSelectedColor: brand.goldDark, itemHoverBg: gray.dark[2],
      darkItemBg: "transparent", darkItemColor: "rgba(255,255,255,0.72)",
      darkItemHoverColor: "#FFFFFF", darkItemHoverBg: "rgba(255,255,255,0.08)",
      darkItemSelectedBg: "rgba(224,181,99,0.24)", darkItemSelectedColor: "#FFFFFF",
    },
    Table: { headerBg: gray.dark[2], rowHoverBg: gray.dark[2] },
    Button: { primaryShadow: shadow.dark.xs, borderRadius: radius.control },
    Input: { borderRadius: radius.control },
    Select: { borderRadius: radius.control },
    Card: { borderRadiusLG: radius.card, boxShadowTertiary: shadow.dark.xs },
    Modal: { borderRadiusLG: radius.modal },
    Drawer: {},
  },
};
