"use client";

import { CartIcon } from "@/components/icons/CartIcon";
import { mobileTabNav, type MobileTabNavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pillSpring = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.8 };

const NOTCH_MASK =
  "radial-gradient(circle 40px at 50% 0, transparent 39px, #000 40px)";

function isTabActive(pathname: string, href: string, isNewList: boolean) {
  if (href === "/") return pathname === "/";
  if (href === "/lists") return pathname.startsWith("/lists") && !isNewList;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NewListFab() {
  return (
    <div className="relative flex justify-center">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-[calc(50%+10px)] rounded-full bg-primary/35 blur-2xl"
      />
      <motion.div
        initial={false}
        animate={{ y: -24 }}
        whileTap={{ scale: 0.9, y: -24, rotate: 180 }}
        transition={pillSpring}
      >
        <Link
          href={mobileTabNav.fab.href}
          aria-label={mobileTabNav.fab.label}
          className="nav-fab relative inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full ring-2 ring-emerald-700/15 dark:ring-white/15 touch-manipulation"
        >
          <CartIcon className="h-7 w-7 drop-shadow-sm [stroke-width:2.2]" />
        </Link>
      </motion.div>
    </div>
  );
}

function NavItem({ item, active }: { item: MobileTabNavItem; active: boolean }) {
  const { href, label, Icon } = item;

  return (
    <li>
      <Link
        href={href}
        className="relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 touch-manipulation select-none antialiased transition-colors duration-200"
      >
        {active && (
          <motion.span
            layoutId="navPill"
            transition={pillSpring}
            className="nav-pill absolute inset-x-1.5 inset-y-1 -z-0 rounded-[14px]"
          />
        )}
        <span className="nav-item-icon relative z-10 inline-flex h-[22px] w-[22px] items-center justify-center" data-active={active}>
          <Icon
            className="h-[22px] w-[22px]"
            strokeWidth={active ? 2.35 : 2.1}
            absoluteStrokeWidth
          />
        </span>
        <span
          className={cn(
            "nav-item-label relative z-10 text-[11px] leading-none",
            active ? "font-semibold" : "font-medium"
          )}
          data-active={active}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isNewList = pathname.startsWith("/lists/new");

  const slots: Array<MobileTabNavItem | { isFab: true }> = [
    mobileTabNav.left[0],
    mobileTabNav.left[1],
    { isFab: true },
    mobileTabNav.right[0],
    mobileTabNav.right[1],
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <nav aria-label="Navegação principal" className="pointer-events-auto relative w-full max-w-md">
        <div
          aria-hidden
          className="nav-bar-surface absolute inset-0 rounded-[28px] backdrop-blur-3xl backdrop-saturate-150"
          style={{
            WebkitMaskImage: NOTCH_MASK,
            maskImage: NOTCH_MASK,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
          style={{
            WebkitMaskImage: NOTCH_MASK,
            maskImage: NOTCH_MASK,
          }}
        />
        <LayoutGroup>
          <ul className="relative grid grid-cols-5 items-end px-1.5 pb-0.5">
            {slots.map((slot) => {
              if ("isFab" in slot) {
                return (
                  <li key="fab" className="flex justify-center">
                    <NewListFab />
                  </li>
                );
              }
              return (
                <NavItem
                  key={slot.href}
                  item={slot}
                  active={isTabActive(pathname, slot.href, isNewList)}
                />
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>
    </div>
  );
}
