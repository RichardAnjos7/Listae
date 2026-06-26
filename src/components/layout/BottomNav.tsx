"use client";

import { History, LayoutGrid, ListIcon, ShoppingBasket } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartIcon } from "@/components/icons/CartIcon";

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

  const isNewList = pathname.startsWith("/lists/new");

  const renderLink = ({ href, label, Icon }: (typeof links)[number]) => {
    const active =
      href === "/"
        ? pathname === "/"
        : pathname.startsWith(href) && !(href === "/lists" && isNewList);
    return (
      <Link
        key={href}
        href={href}
        className={`group relative flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium gap-0.5 transition-colors ${
          active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        {active && (
          <motion.span
            layoutId="nav-pill"
            aria-hidden
            className="absolute inset-x-2 top-2 bottom-2 -z-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-400/15"
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
          />
        )}
        <Icon
          className="h-5 w-5 transition-transform group-active:scale-90"
          strokeWidth={active ? 2.25 : 1.75}
        />
        {label}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0))] pointer-events-none">
      <div className="pointer-events-auto flex items-center h-16 w-full max-w-md rounded-[28px] border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        {left.map(renderLink)}

        <div className="flex-1 flex justify-center">
          <Link
            href="/lists/new"
            aria-label="Nova lista"
            className="flex items-center justify-center h-14 w-14 -mt-8 rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-600/40 ring-4 ring-white dark:ring-slate-900 hover:brightness-110 active:scale-95 transition"
          >
            <CartIcon className="h-7 w-7" />
          </Link>
        </div>

        {right.map(renderLink)}
      </div>
    </nav>
  );
}
