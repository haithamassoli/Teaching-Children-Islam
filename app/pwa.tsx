"use client";

import { useEffect } from "react";

export default function Pwa() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => console.warn("Offline support could not be enabled."));
    }
  }, []);
  return null;
}
