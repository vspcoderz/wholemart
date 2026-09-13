"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createContext, useContext, useState } from "react";
import { lightTheme, darkTheme } from "@/theme";

type Mode = "light" | "dark";

const ModeContext = createContext<{
  mode: Mode;
  toggle: () => void;
}>({ mode: "light", toggle: () => {} });

export const useColorMode = () => useContext(ModeContext);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("light");
  const theme = mode === "light" ? lightTheme : darkTheme;

  return (
    <ModeContext.Provider
      value={{ mode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }}
    >
      <AppRouterCacheProvider options={{ key: "mui" }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </AppRouterCacheProvider>
    </ModeContext.Provider>
  );
}
