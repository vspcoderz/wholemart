"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Revalidates the current route on an interval for near-realtime admin lists.
 * Pauses while the tab is hidden so idle tabs don't hammer the DB.
 */
export function usePollingRefresh(intervalMs = 15000) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer !== null) return;
      timer = setInterval(() => {
        if (!document.hidden) router.refresh();
      }, intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh(); // catch up immediately when coming back
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);
}
