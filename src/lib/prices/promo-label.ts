/** Data de validade de promoção para exibição (dd/MM). */
export function formatPromoUntil(validUntil: string | null | undefined): string | null {
  if (!validUntil) return null;
  const d = new Date(validUntil);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
