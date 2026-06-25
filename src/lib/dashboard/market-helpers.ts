export function marketVsCheapest(
  avgTotal: number,
  minMarketAvg: number | null,
  marketCount: number
): { pct: number | null; direction: "up" | "down" | "flat" } {
  if (minMarketAvg == null || minMarketAvg <= 0 || marketCount < 2) {
    return { pct: null, direction: "flat" };
  }
  if (avgTotal <= minMarketAvg) return { pct: 0, direction: "flat" };
  const pct = Math.round(((avgTotal - minMarketAvg) / minMarketAvg) * 1000) / 10;
  return { pct, direction: "up" };
}

export function lastVsAvg(
  lastTotal: number | null,
  avgTotal: number,
  tripCount: number
): { pct: number | null; direction: "up" | "down" | "flat" } {
  if (lastTotal == null || tripCount < 2 || avgTotal <= 0) {
    return { pct: null, direction: "flat" };
  }
  const pct = Math.round(((lastTotal - avgTotal) / avgTotal) * 1000) / 10;
  if (pct === 0) return { pct: 0, direction: "flat" };
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : "down" };
}
