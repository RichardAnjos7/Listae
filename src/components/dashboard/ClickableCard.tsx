import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  showChevron?: boolean;
};

export function ClickableCard({ href, children, className = "", showChevron = true }: Props) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl shadow-sm transition-colors hover:border-emerald-300 dark:hover:border-emerald-800 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {showChevron && (
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" aria-hidden />
        )}
      </div>
    </Link>
  );
}
