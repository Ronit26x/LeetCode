"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { THEMES } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      themes={[...THEMES]}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="recur-theme"
    >
      <TooltipProvider delay={300}>{children}</TooltipProvider>
      <Toaster position="bottom-center" />
    </ThemeProvider>
  );
}
