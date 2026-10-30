"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores";
import { isThemeId } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (!isThemeId(theme)) return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <>{children}</>;
}
