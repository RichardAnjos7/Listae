export type ParsedReceiptLine = {
  rawName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

const SKIP_PATTERN =
  /^(total|subtotal|desconto|troco|pagamento|cart[aã]o|dinheiro|pix|cpf|cnpj|nfce|nfc-e|serie|chave|valor|tributos|item|qtd|qtde|codigo|código|obrigado|volte|cmv|icms|pis|cofins)/i;

const PRICE_AT_END = /^(.+?)\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/;
const QTY_UNIT_PRICE =
  /^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(?:un|kg|g|l|ml)?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/i;

function parseBrMoney(value: string): number {
  const n = value.replace(/\./g, "").replace(",", ".");
  const v = Number.parseFloat(n);
  return Number.isFinite(v) ? v : 0;
}

function cleanName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/^\d+\s+/, "")
    .trim();
}

export function parseReceiptText(text: string): ParsedReceiptLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const results: ParsedReceiptLine[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (SKIP_PATTERN.test(line)) continue;
    if (!/\d[.,]\d{2}/.test(line)) continue;

    let rawName = "";
    let quantity = 1;
    let unitPrice = 0;
    let lineTotal = 0;

    const mQty = line.match(QTY_UNIT_PRICE);
    if (mQty) {
      rawName = cleanName(mQty[1]);
      quantity = Number.parseFloat(mQty[2].replace(",", ".")) || 1;
      unitPrice = parseBrMoney(mQty[3]);
      lineTotal = parseBrMoney(mQty[4]);
    } else {
      const mEnd = line.match(PRICE_AT_END);
      if (!mEnd) continue;
      rawName = cleanName(mEnd[1]);
      lineTotal = parseBrMoney(mEnd[2]);
      unitPrice = lineTotal;
    }

    if (rawName.length < 2 || unitPrice <= 0 || unitPrice > 50_000) continue;
    if (rawName.length > 120) continue;

    const key = `${rawName.toLowerCase()}|${unitPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (lineTotal <= 0) lineTotal = unitPrice * quantity;
    if (quantity <= 0) quantity = 1;

    results.push({ rawName, quantity, unitPrice, lineTotal });
  }

  return results.slice(0, 80);
}
