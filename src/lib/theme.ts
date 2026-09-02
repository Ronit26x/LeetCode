export const THEMES = ["light", "dim", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export type ThemeChoice = Theme | "system";

/** Background colors as hex, for the PWA manifest and the theme-color meta tag. */
export const THEME_HEX: Record<Theme, string> = {
  light: "#fbfaf8",
  dim: "#2a2623",
  dark: "#111214",
};

export const ACCENT_HEX = "#3d5dc4";

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "Light",
  dim: "Dim",
  dark: "Dark",
  system: "System",
};
