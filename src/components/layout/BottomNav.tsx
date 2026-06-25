"use client";

import { History, LayoutGrid, ListIcon, ShoppingBasket, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início", Icon: LayoutGrid },
  { href: "/lists", label: "Listas", Icon: ListIcon },
  { href: "/products", label: "Catálogo", Icon: ShoppingBasket },
  { href: "/history", label: "Histórico", Icon: History },
];

export function BottomNav() {
  const pathname = usePathname();
  const left = links.slice(0, 2);
  const right = links.slice(2);

  const renderLink = ({ href, label, Icon }: (typeof links)[number]) => {
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
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md safe-area-pb">
      <div className="flex items-center h-14 max-w-lg mx-auto">
        {left.map(renderLink)}

        <div className="flex-1 flex justify-center">
          <Link
            href="/lists/new"
            aria-label="Nova lista"
            className="flex items-center justify-center h-14 w-14 -mt-6 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-white dark:ring-slate-900 hover:bg-emerald-700 active:scale-95 transition"
          >
            <ShoppingCart className="h-6 w-6" strokeWidth={2.25} />
          </Link>
        </div>

        {right.map(renderLink)}
      </div>
    </nav>
  );
}
