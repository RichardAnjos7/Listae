import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function lineTotal(quantity: number, unitPrice: number | null) {
  if (unitPrice == null || Number.isNaN(unitPrice)) return 0;
  return quantity * unitPrice;
}

/** Converte preço em reais para string de centavos (ex.: 4.99 → "499"). */
export function priceToCentsDigits(price: number): string {
  return String(Math.round(price * 100));
}

/** Formata dígitos de centavos para exibição pt-BR (ex.: "499" → "4,99"). */
export function formatCentsDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return "";
  const cents = parseInt(clean, 10);
  if (Number.isNaN(cents)) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte dígitos de centavos em valor numérico (ex.: "499" → 4.99). */
export function centsDigitsToPrice(digits: string): number | null {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return null;
  const cents = parseInt(clean, 10);
  if (Number.isNaN(cents)) return null;
  return cents / 100;
}

/** Formata preço para exibição em input (ex.: 4.99 → "4,99"). */
export function formatPriceInput(price: number | null | undefined): string {
  if (price == null || Number.isNaN(price)) return "";
  return price.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
