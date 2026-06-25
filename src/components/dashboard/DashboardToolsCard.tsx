import { ScanLine, Search, TrendingUp } from "lucide-react";
import Link from "next/link";

export function DashboardToolsCard() {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500 px-1 mb-2">Ferramentas</p>
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/prices"
          className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 px-1 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Search className="h-5 w-5 text-emerald-600" />
          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Buscar preços</span>
        </Link>
        <Link
          href="/receipt"
          className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 px-1 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ScanLine className="h-5 w-5 text-emerald-600" />
          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Escanear nota</span>
        </Link>
        <Link
          href="/habits"
          className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 px-1 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Meus hábitos</span>
        </Link>
      </div>
    </section>
  );
}
