import { formatPromoUntil } from "@/lib/prices/promo-label";
import { formatBRL } from "@/lib/utils";

type Props = {
  unitPrice: number;
  isPromotion?: boolean;
  validUntil?: string | null;
  className?: string;
  priceClassName?: string;
};

export function LiveFeedPriceCell({
  unitPrice,
  isPromotion,
  validUntil,
  className = "text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums",
  priceClassName,
}: Props) {
  const until = isPromotion ? formatPromoUntil(validUntil) : null;

  return (
    <span className={`flex flex-col items-end gap-0.5 shrink-0 ${className}`}>
      {isPromotion && (
        <span className="text-[9px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 leading-none">
          Promo{until ? ` até ${until}` : ""}
        </span>
      )}
      <span className={priceClassName}>{formatBRL(unitPrice)}</span>
    </span>
  );
}
