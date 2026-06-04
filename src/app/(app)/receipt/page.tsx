import { ReceiptOcrClient } from "@/components/receipt/ReceiptOcrClient";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import Link from "next/link";

export default async function ReceiptPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const markets = await sql`
    select id, name from supermarkets where user_id = ${userId} order by name
  `;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Escanear nota</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          OCR lê produtos e preços; você revisa e grava no histórico e na base compartilhada.
        </p>
      </div>

      <ReceiptOcrClient
        markets={markets.map((m) => ({ id: m.id as string, name: m.name as string }))}
      />

      <p className="text-xs text-slate-500 text-center">
        Cadastre mercados em{" "}
        <Link href="/lists/new" className="text-emerald-600 font-medium">
          Nova lista
        </Link>{" "}
        · Produtos sem match devem estar no{" "}
        <Link href="/products" className="text-emerald-600 font-medium">
          catálogo
        </Link>
      </p>
    </div>
  );
}
