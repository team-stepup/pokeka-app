"use client";

import { useEffect, useState, useCallback } from "react";

export default function PwaRegistrar() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const checkWaiting = useCallback((reg: ServiceWorkerRegistration) => {
    if (reg.waiting && navigator.serviceWorker.controller) {
      setUpdateAvailable(true);
      setRegistration(reg);
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const basePath = location.pathname.startsWith("/pokeka-app") ? "/pokeka-app" : "";

    navigator.serviceWorker.register(`${basePath}/sw.js`, { updateViaCache: "none" }).then((reg) => {
      setRegistration(reg);

      // Check if there's already a waiting worker
      checkWaiting(reg);

      // Listen for new updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            setRegistration(reg);
          }
        });
      });

      // Check for updates every 60 seconds
      setInterval(() => reg.update(), 60 * 1000);
    });

    // Also detect controller change (another tab triggered update)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, [checkWaiting]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage("skipWaiting");
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm">
      <span>新しいバージョンがあります</span>
      <button
        onClick={handleUpdate}
        className="bg-white text-primary px-3 py-1 rounded-lg font-medium hover:bg-blue-50"
      >
        更新する
      </button>
    </div>
  );
}
