"use client";

import { type ReactNode, useEffect, useState } from "react";

export default function Connectivity({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <>
      {!online && (
        <div className="offline-banner" role="alert">
          لا يوجد اتصال بالإنترنت. أعد الاتصال لإكمال الرحلة.
          <button type="button" onClick={() => setOnline(navigator.onLine)}>
            إعادة المحاولة
          </button>
        </div>
      )}
      {children}
    </>
  );
}
