/**
 * Design tokens — the single source of truth for the visual identity.
 *
 * Identity: your supplied 5-swatch palette, an olive-sage monochromatic
 * ramp from dark to light — #414833 (darkest) · #737A5D · #A4AC86 ·
 * #CCBFA3 · #EBE3D2 (lightest). All 5 appear verbatim somewhere below. No
 * gold or any other accent hue is used anywhere — this is a strict
 * single-hue system, calm through restraint. "White" is replaced by a soft
 * near-white beige (computed, one shade lighter than #EBE3D2) everywhere a
 * card/container background is needed, per instruction.
 *
 * A few extra shades are DERIVED from the palette (darkened, same hue
 * family) purely to hit WCAG-legible contrast for secondary text and true
 * dark-mode backgrounds — the 5 swatches are all pale-to-mid tones, so
 * those two specific needs have to be computed rather than picked directly
 * from the set.
 *
 * Semantic colors (danger/success/warning/info) stay conventional red/green/
 * orange/blue — clinical alerts need to read as universal signals regardless
 * of brand hue.
 *
 * These feed Ant Design's ConfigProvider. Change the look here, nowhere else.
 */
import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

// Brand constants also exposed as CSS variables (see ThemeProvider) so our
// own (non-antd) components can use them.
export const brand = {
  // #414833 — the darkest swatch, doing double duty as both the button/
  // accent color AND the fixed deep band color (sidebar, hero, login modal)
  // — one anchor tone, not two. Contrasts very safely with white text
  // (~9.5:1). Dark mode instead uses #A4AC86, a lighter swatch that needs
  // dark (not white) button labels, since it now has to sit against a near-
  // black page rather than hold text on itself.
  primary: "#414833",
  primaryHover: "#343A26",
  primaryDark: "#A4AC86",
  primaryDarkHover: "#B4BC96",
  primarySoft: "#CCBFA3", // pale wash, selected/highlighted states
  primarySoftDark: "#333823",
  surfaceFill: "#414833",
  // A lighter stop of the SAME ramp (not a second hue) for the hero/closing
  // gradient, so that band has gentle depth without introducing any accent
  // beyond the given palette.
  surfaceFillAccent: "#737A5D",
  // A lighter tint of the same ramp, used only where a second visual weight
  // is needed alongside the main accent (e.g. two stat tiles side by side).
  accent: "#A4AC86",
  accentDark: "#B4BC96",
  accentSoft: "#CCBFA3",
  accentSoftDark: "#333823",
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

// The neutral ramp — your 5 given swatches (#EBE3D2, #CCBFA3, #A4AC86,
// #737A5D, #414833) placed at their natural lightness position, plus a
// handful of computed steps: a near-white beige (replaces "white" for
// card/container backgrounds) and a couple of darker olive shades for
// legible secondary text and a true dark-mode canvas, since nothing in the
// given set is dark enough for either. Index 0 = lightest, 8 = darkest
// (light array), mirrored for dark.
//
// The dark array's first 3 steps are deliberately spaced further apart than
// a simple even ramp would give (page → card → elevated): with everything
// at one muted hue, layers that are too close in value read as one flat
// mass instead of a layered UI. Page background sits near true black so the
// warmer, lighter sidebar (brand.surfaceFill, #414833 — set separately, not
// from this array) reads as a clearly distinct anchor band rather than
// blending into the content behind it.
export const gray = {
  light: ["#faf8f2", "#f5f0e6", "#ebe3d2", "#ccbfa3", "#a4ac86", "#737a5d", "#4b4f3c", "#3a3f2c", "#414833"],
  dark: ["#171a10", "#262b1b", "#343b26", "#4b5238", "#737a5d", "#a4ac86", "#ccbfa3", "#ebe3d2", "#f5f0e6"],
} as const;

export const shadow = {
  light: {
    xs: "0 1px 2px rgba(65,72,51,0.06)",
    sm: "0 2px 6px rgba(65,72,51,0.08)",
    md: "0 8px 24px rgba(65,72,51,0.10)",
    lg: "0 16px 40px rgba(65,72,51,0.16)",
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
  // AntD's default modal/drawer mask (~45% black) is too light to make the
  // dialog feel like the sole focus — GitHub/Instagram-style modals dim
  // much harder than that. Applies to every Modal/Drawer app-wide, not just
  // login, so the whole app is consistent.
  colorBgMask: "rgba(0,0,0,0.7)",
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
    // Explicit (not left to AntD default): brand.primary contrasts safely
    // with white text (~9.5:1), so white solid-button labels are legible.
    colorTextLightSolid: "#FFFFFF",
    colorBgLayout: gray.light[2],
    // "Instead of white use beige" — a near-white beige, not literal white.
    colorBgContainer: gray.light[1],
    colorBgElevated: gray.light[1],
    colorText: gray.light[8],
    colorTextSecondary: gray.light[6],
    colorBorder: gray.light[4],
    colorBorderSecondary: gray.light[3],
  },
  components: {
    Layout: { headerBg: gray.light[1], siderBg: gray.light[1], bodyBg: gray.light[2] },
    Menu: {
      itemSelectedBg: brand.primarySoft, itemSelectedColor: brand.primary, itemHoverBg: gray.light[0],
      darkItemBg: "transparent", darkItemColor: "rgba(255,255,255,0.72)",
      darkItemHoverColor: "#FFFFFF", darkItemHoverBg: "rgba(255,255,255,0.08)",
      darkItemSelectedBg: "rgba(65,72,51,0.28)", darkItemSelectedColor: "#FFFFFF",
    },
    Table: { headerBg: gray.light[0], rowHoverBg: gray.light[1], cellPaddingBlockSM: 6 },
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
    // The lighter dark-mode swatch (#A4AC86) needs dark (not white) label
    // text — AntD's algorithms don't infer this from colorPrimary's
    // lightness on their own, so it's set explicitly here (contrast ~7.4:1
    // against gray.dark[0]).
    colorTextLightSolid: gray.dark[0],
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
      darkItemSelectedBg: "rgba(164,172,134,0.28)", darkItemSelectedColor: "#FFFFFF",
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
