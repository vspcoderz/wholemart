"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    // Only register in production builds — in dev the SW would cache stale
    // HTML and mask hot reloads.
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // offline support is best-effort; app works without it
      });
    }
  }, []);
  return null;
}
