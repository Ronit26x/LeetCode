"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, SunDim } from "@phosphor-icons/react/dist/ssr";
import { SegmentedControl } from "@/components/common/segmented-control";
import { THEME_HEX, THEME_LABELS, type Theme, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; icon: React.ReactNode }[] = [
  { value: "light", icon: <Sun size={16} /> },
  { value: "dim", icon: <SunDim size={16} /> },
  { value: "dark", icon: <Moon size={16} /> },
  { value: "system", icon: <Monitor size={16} /> },
];

const noopSubscribe = () => () => {};

/** True after hydration; false during SSR and the first client render. */
export function useMounted() {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Keeps the browser chrome (PWA status bar) in the current palette. */
function useThemeColorMeta() {
  const { resolvedTheme } = useTheme();
  React.useEffect(() => {
    const t = (resolvedTheme ?? "light") as Theme;
    const hex = THEME_HEX[t] ?? THEME_HEX.light;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = hex;
    document.head.appendChild(meta);
  }, [resolvedTheme]);
}

export function ThemeSwitch({
  size = "sm",
  showLabels = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  useThemeColorMeta();
  return (
    <SegmentedControl<ThemeChoice>
      aria-label="Theme"
      size={size}
      className={className}
      fullWidth={showLabels}
      value={mounted ? ((theme as ThemeChoice) ?? "system") : undefined}
      onValueChange={(v) => setTheme(v)}
      options={OPTIONS.map((o) => ({
        value: o.value,
        label: THEME_LABELS[o.value],
        icon: o.icon,
        iconOnly: !showLabels,
      }))}
    />
  );
}
