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
  const [mode, setMode] = useState<Mode>("light");

  // Restore saved preference (or OS setting) after mount to avoid SSR mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setMode(saved);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setMode("dark");
      }
    } catch {
      // private mode etc. — stay light
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", mode === "dark");
    document.documentElement.style.colorScheme = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
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
