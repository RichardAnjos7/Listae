"use client";

import {
  centsDigitsToPrice,
  cn,
  formatCentsDigits,
  priceToCentsDigits,
} from "@/lib/utils";
import { useEffect, useState } from "react";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

const MAX_CENT_DIGITS = 9;

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  "aria-label": ariaLabel,
}: Props) {
  const [digits, setDigits] = useState(() =>
    value != null ? priceToCentsDigits(value) : ""
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDigits(value != null ? priceToCentsDigits(value) : "");
    }
  }, [value, focused]);

  const display = formatCentsDigits(digits);

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      value={display}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, "").slice(0, MAX_CENT_DIGITS);
        setDigits(next);
      }}
      onBlur={() => {
        setFocused(false);
        onChange(centsDigitsToPrice(digits));
      }}
      className={cn(
        "w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 tabular-nums",
        className
      )}
    />
  );
}
