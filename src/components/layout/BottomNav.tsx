"use client";

import { History, LayoutGrid, ListIcon, Search, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início", Icon: LayoutGrid },
  { href: "/lists", label: "Listas", Icon: ListIcon },
  { href: "/prices", label: "Preços", Icon: Search },
  { href: "/products", label: "Catálogo", Icon: ShoppingBasket },
  { href: "/history", label: "Histórico", Icon: History },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md safe-area-pb">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {links.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium gap-0.5 transition-colors ${
                active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
