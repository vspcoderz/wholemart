"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark";

const ModeContext = createContext<{
  mode: Mode;
  toggle: () => void;
}>({ mode: "light", toggle: () => {} });

export const useColorMode = () => useContext(ModeContext);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", mode === "dark");
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  return (
    <ModeContext.Provider
      value={{ mode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }}
    >
      {children}
    </ModeContext.Provider>
  );
}
