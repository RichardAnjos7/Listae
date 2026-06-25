import Link from "next/link";

const LINKS = [
  { href: "/habits", label: "Meus hábitos", key: "habits" },
  { href: "/prices", label: "Preços na cidade", key: "prices" },
  { href: "/history", label: "Histórico", key: "history" },
] as const;

type DepthPage = (typeof LINKS)[number]["key"];

type Props = {
  current: DepthPage;
};

export function DepthNav({ current }: Props) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
      aria-label="Análises e preços"
    >
      {LINKS.map(({ href, label, key }) => {
        const isCurrent = key === current;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isCurrent
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
