import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const FRESHNESS_PT: Record<string, string> = {
  agora: "Atualizado agora",
  hoje: "Atualizado hoje",
  ontem: "Atualizado ontem",
  "esta semana": "Atualizado esta semana",
  antigo: "Preço antigo — use com cautela",
};

export function labelFromFreshnessKey(key: string | null | undefined): string {
  if (!key) return "—";
  return FRESHNESS_PT[key] ?? key;
}

export function labelFromRecordedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60 * 60 * 1000) {
    return `Atualizado há ${formatDistanceToNow(d, { locale: ptBR })}`;
  }
  if (diffMs < 24 * 60 * 60 * 1000) return "Atualizado hoje";
  if (diffMs < 48 * 60 * 60 * 1000) return "Atualizado ontem";
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return `Atualizado há ${formatDistanceToNow(d, { locale: ptBR })}`;
  }
  return `Atualizado há ${formatDistanceToNow(d, { locale: ptBR })}`;
}
