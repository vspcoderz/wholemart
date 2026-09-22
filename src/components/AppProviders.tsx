"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark";

const ModeContext = createContext<{
  mode: Mode;
  toggle: () => void;
}>({ mode: "light", toggle: () => {} });

export const useColorMode = () => useContext(ModeContext);

const STORAGE_KEY = "vf-theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Initial state mirrors what the blocking head script in layout.tsx already
  // applied to <html> — no effect ordering, no first-paint flash, no clobber.
  const [mode, setMode] = useState<Mode>(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark-mode")
      ? "dark"
      : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", mode === "dark");
    document.documentElement.style.colorScheme = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore (private mode etc.)
    }
  }, [mode]);

  return (
    <ModeContext.Provider
      value={{ mode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }}
    >
      {children}
    </ModeContext.Provider>
  );
}
