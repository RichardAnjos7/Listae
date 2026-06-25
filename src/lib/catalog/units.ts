export type ProductUnit = {
  value: string;
  label: string;
  /** Exibe campo numérico de quantidade ao selecionar a unidade */
  needsAmount: boolean;
  amountLabel: string;
  amountPlaceholder: string;
};

export const PRODUCT_UNITS: ProductUnit[] = [
  { value: "kg", label: "Quilograma (kg)", needsAmount: true, amountLabel: "Quantidade (kg)", amountPlaceholder: "Ex.: 1" },
  { value: "g", label: "Grama (g)", needsAmount: true, amountLabel: "Quantidade (g)", amountPlaceholder: "Ex.: 500" },
  { value: "mg", label: "Miligrama (mg)", needsAmount: true, amountLabel: "Quantidade (mg)", amountPlaceholder: "Ex.: 250" },
  { value: "L", label: "Litro (L)", needsAmount: true, amountLabel: "Quantidade (L)", amountPlaceholder: "Ex.: 2" },
  { value: "ml", label: "Mililitro (ml)", needsAmount: true, amountLabel: "Quantidade (ml)", amountPlaceholder: "Ex.: 500" },
  { value: "un", label: "Unidade", needsAmount: true, amountLabel: "Quantidade", amountPlaceholder: "Ex.: 1" },
];

const UNIT_VALUES = new Set(PRODUCT_UNITS.map((u) => u.value));

export function isValidProductUnit(unit: string): boolean {
  return UNIT_VALUES.has(unit);
}

export function formatPackageSize(unit: string, amount: number): string {
  if (unit === "un") {
    return amount === 1 ? "1 un" : `${formatAmount(amount)} un`;
  }
  return `${formatAmount(amount)}${unit}`;
}

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(n).replace(/\.?0+$/, "");
}

export function parsePackageSize(
  packageSize: string | null | undefined,
  unit: string
): { unit: string; amount: string } {
  const fallback = { unit: isValidProductUnit(unit) ? unit : "un", amount: "1" };
  if (!packageSize?.trim()) return fallback;

  const normalized = packageSize.trim().toLowerCase();
  const match = normalized.match(/^([\d.,]+)\s*(kg|g|mg|l|ml|un)$/i);
  if (match) {
    const parsedUnit = match[2] === "l" ? "L" : match[2].toLowerCase();
    const amount = match[1].replace(",", ".");
    return {
      unit: isValidProductUnit(parsedUnit) ? parsedUnit : fallback.unit,
      amount,
    };
  }

  return fallback;
}

export function parsePackageFromForm(formData: FormData): { unit: string; packageSize: string } {
  const unit = String(formData.get("unit") ?? "").trim();
  const amountRaw = String(formData.get("package_amount") ?? "").trim().replace(",", ".");

  if (!isValidProductUnit(unit)) {
    throw new Error("Selecione uma unidade válida");
  }

  const unitDef = PRODUCT_UNITS.find((u) => u.value === unit)!;
  if (!unitDef.needsAmount) {
    return { unit, packageSize: formatPackageSize(unit, 1) };
  }

  if (!amountRaw) {
    throw new Error("Informe a quantidade da embalagem");
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Quantidade inválida");
  }

  return { unit, packageSize: formatPackageSize(unit, amount) };
}
