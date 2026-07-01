import { History, LayoutGrid, ListIcon, ShoppingBasket, type LucideIcon } from "lucide-react";

export type MobileTabNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const mobileTabNav = {
  left: [
    { href: "/", label: "Início", Icon: LayoutGrid },
    { href: "/lists", label: "Listas", Icon: ListIcon },
  ] satisfies MobileTabNavItem[],
  right: [
    { href: "/products", label: "Catálogo", Icon: ShoppingBasket },
    { href: "/history", label: "Histórico", Icon: History },
  ] satisfies MobileTabNavItem[],
  fab: {
    href: "/lists/new",
    label: "Nova lista",
  },
} as const;
