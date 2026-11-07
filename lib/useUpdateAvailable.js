import { useEffect, useState } from "react";

// True when a newer version of the app has been deployed since this page was loaded.
// Tabs that stay open for days otherwise keep running old code and miss new features.
export function useUpdateAvailable() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version } = await res.json();
        if (alive && version && version !== process.env.NEXT_PUBLIC_BUILD_ID) setStale(true);
      } catch {
        // offline or a blip: try again next time
      }
    }
    check();
    const timer = setInterval(check, 5 * 60 * 1000);
    const onFocus = () => document.visibilityState !== "hidden" && check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return stale;
}
