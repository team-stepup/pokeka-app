"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, TrendingUp, ArrowLeftRight, Settings, Menu, X } from "lucide-react";
import { useState } from "react";

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
        <div className="p-5 border-b border-sidebar-hover">
          <h1 className="text-xl font-bold">PokeCard Manager</h1>
          <p className="text-xs text-muted mt-1">ポケカ管理アプリ</p>
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
      </aside>
    </>
  );
}
