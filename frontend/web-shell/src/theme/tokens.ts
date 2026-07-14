/**
 * Design tokens — the single source of truth for the visual identity.
 * Identity: warm & approachable (teal + marigold, soft warm neutrals, rounded)
 * but COMPACT and keyboard-first for all-day power users.
 *
 * These feed Ant Design's ConfigProvider. Change the look here, nowhere else.
 */
import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

// Brand constants also exposed as CSS variables (see ThemeProvider) so our
// own (non-antd) components can use them.
export const brand = {
  primary: "#1F9E8F", // calm teal — trustworthy, healthcare
  primaryDark: "#2BB6A5", // lighter teal for dark mode contrast
  accent: "#F4A259", // marigold — warm, friendly, culturally apt
  accentSoft: "#FBD9A8",
  danger: "#E5484D",
  success: "#3DA35D",
  warning: "#E8A317",
} as const;

// Friendly, humanist UI font with safe system fallbacks (offline-safe: if
// "Figtree"/"Nunito Sans" aren't installed/self-hosted, Segoe UI etc. render).
const fontStack =
  '"Figtree", "Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const shared: ThemeConfig["token"] = {
  colorPrimary: brand.primary,
  colorInfo: brand.primary,
  colorSuccess: brand.success,
  colorWarning: brand.warning,
  colorError: brand.danger,
  borderRadius: 10, // rounded = friendly
  fontFamily: fontStack,
  fontSize: 14,
  controlHeight: 34, // compact-but-comfortable input height
  wireframe: false,
};

export const lightTheme: ThemeConfig = {
  algorithm: [antdTheme.defaultAlgorithm, antdTheme.compactAlgorithm],
  token: {
    ...shared,
    colorBgLayout: "#FBF7F2", // warm off-white (not the cream cliché)
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorText: "#2B2622", // warm near-black
    colorTextSecondary: "#6B615A",
    colorBorder: "#E7DFD6", // warm border
    colorBorderSecondary: "#F0E9E1",
  },
  components: {
    Layout: { headerBg: "#FFFFFF", siderBg: "#FFFFFF", bodyBg: "#FBF7F2" },
    Menu: { itemSelectedBg: "#E9F6F3", itemSelectedColor: brand.primary },
    Table: { headerBg: "#F7F1EA", rowHoverBg: "#FBF7F2", cellPaddingBlockSM: 6 },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm],
  token: {
    ...shared,
    colorPrimary: brand.primaryDark,
    colorInfo: brand.primaryDark,
    colorBgLayout: "#171412", // warm charcoal, not blue-black
    colorBgContainer: "#211D1A",
    colorBgElevated: "#26221E",
    colorText: "#F2EDE7",
    colorTextSecondary: "#B8AEA5",
    colorBorder: "#3A332E",
    colorBorderSecondary: "#2C2724",
  },
  components: {
    Layout: { headerBg: "#211D1A", siderBg: "#1C1917", bodyBg: "#171412" },
    Menu: { itemSelectedBg: "#173D39", itemSelectedColor: brand.primaryDark },
    Table: { headerBg: "#26221E", rowHoverBg: "#1C1917" },
  },
};
