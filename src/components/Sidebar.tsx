"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, TrendingUp, ArrowLeftRight, Settings, Menu, X, RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/cards", label: "カード一覧", icon: CreditCard },
  { href: "/prices", label: "価格トラッキング", icon: TrendingUp },
  { href: "/trades", label: "売買記録", icon: ArrowLeftRight },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage("skipWaiting");
            await new Promise((r) => setTimeout(r, 500));
            window.location.reload();
            return;
          }
        }
      }
      // Even without SW update, hard reload to get latest
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, []);

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-sidebar text-sidebar-text p-2 rounded-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed md:static z-40 h-full w-60 bg-sidebar text-sidebar-text flex flex-col transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-sidebar-hover">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-blue-400">Poke</span><span>Card</span>
          </h1>
          <p className="text-[11px] text-gray-400 tracking-wider mt-0.5">MANAGER</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "hover:bg-sidebar-hover"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-hover">
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={updating ? "animate-spin" : ""} />
            {updating ? "更新中..." : "アプリを更新"}
          </button>
        </div>
      </aside>
    </>
  );
}
