"use client";

import { useEffect, useState } from "react";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Initialize from browser state when available
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      setIsOnline(navigator.onLine);
    }

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[1000]">
      <div className="mx-auto max-w-screen-2xl">
        <div className="bg-red-600 text-white text-sm px-4 py-2 text-center">
          You are currently offline. Some features may not work. We will retry automatically when you are back online.
        </div>
      </div>
    </div>
  );
}

