"use client";

import { useEffect, useState } from "react";

export default function PwaRegistrar() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const basePath = location.pathname.startsWith("/pokeka-app") ? "/pokeka-app" : "";
      navigator.serviceWorker.register(`${basePath}/sw.js`).then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              setWaitingWorker(newWorker);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage("skipWaiting");
      window.location.reload();
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
