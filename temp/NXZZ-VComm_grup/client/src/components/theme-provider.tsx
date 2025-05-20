import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
  enableSystem?: boolean;
  attribute?: "class" | "data-theme" | "data-mode";
}

export function ThemeProvider({ 
  children, 
  defaultTheme = "system", 
  storageKey = "theme", 
  enableSystem = true, 
  attribute = "class",
  ...props 
}: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}