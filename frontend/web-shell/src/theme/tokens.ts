/**
 * Design tokens — the single source of truth for the visual identity.
 * Identity: Pine Tree + Khaki Green + Macaron + Misty — an earthy, natural
 * enterprise palette. Pine anchors solid-fill chrome (sidebar, hero bands),
 * khaki green is the sparing accent, macaron is the soft pastel tint used
 * for highlighted/selected states, and misty is the neutral grey-green
 * scale for text/borders/backgrounds.
 *
 * These feed Ant Design's ConfigProvider. Change the look here, nowhere else.
 */
import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

// Brand constants also exposed as CSS variables (see ThemeProvider) so our
// own (non-antd) components can use them.
export const brand = {
  // Pine Tree — mid tone usable for buttons/icons, hover darkens toward
  // the deep anchor shade; dark-mode primary lightens toward khaki-green
  // so it stays legible on a dark background.
  primary: "#2D6A4F",
  primaryHover: "#1B4332",
  primaryDark: "#8FBB9C",
  primaryDarkHover: "#A9CBAF",
  // Macaron — soft pastel mint tint, used for selected/highlighted states.
  primarySoft: "#E3F0E8",
  primarySoftDark: "#20362B",
  // Deep, fixed (not light/dark-mode dependent) Pine Tree used ONLY for
  // large solid-fill bands that need to hold white text (sidebar, landing
  // hero/closing, login modal chrome) — brand.primary itself stays a
  // lighter usable mid-tone for buttons and icons, so it needs a deeper
  // sibling for contrast here.
  surfaceFill: "#1B4332",
  // Khaki Green — sparing accent for CTAs/highlights.
  accent: "#8A9A5B",
  accentDark: "#A6B87A",
  accentSoft: "#EFF1DE",
  accentSoftDark: "#33361F",
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

// Misty — a soft grey-green neutral scale, used for text/borders/backgrounds
// so the whole app's "gray" reads as an earthy misty tone instead of a
// cool office-gray, stark white, or the prior lavender tint.
export const gray = {
  light: ["#F7F9F7", "#EEF2EE", "#E1E8E1", "#CBD6CB", "#A8B8A8", "#7E8F7E", "#5A6B5A", "#3A473A", "#1F2A1F"],
  dark: ["#1F2A1F", "#2A362A", "#354235", "#455245", "#5C6B5C", "#8A9A8A", "#AEBCAE", "#D3DDD3", "#EEF2EE"],
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
  colorPrimary: brand.primary,
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
      itemSelectedBg: brand.primarySoft, itemSelectedColor: brand.primaryHover, itemHoverBg: gray.light[1],
      darkItemBg: "transparent", darkItemColor: "rgba(255,255,255,0.72)",
      darkItemHoverColor: "#FFFFFF", darkItemHoverBg: "rgba(255,255,255,0.08)",
      darkItemSelectedBg: "rgba(255,255,255,0.16)", darkItemSelectedColor: "#FFFFFF",
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
    colorPrimary: brand.primaryDark,
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
      itemSelectedBg: brand.primarySoftDark, itemSelectedColor: brand.primaryDark, itemHoverBg: gray.dark[2],
      darkItemBg: "transparent", darkItemColor: "rgba(255,255,255,0.72)",
      darkItemHoverColor: "#FFFFFF", darkItemHoverBg: "rgba(255,255,255,0.08)",
      darkItemSelectedBg: "rgba(255,255,255,0.16)", darkItemSelectedColor: "#FFFFFF",
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
