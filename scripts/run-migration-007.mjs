import fs from "fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(".env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.error("DATABASE_URL não encontrado em .env.local");
  process.exit(1);
}
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

await sql`
  create table if not exists public.list_presence (
    list_id uuid not null references public.shopping_lists (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    user_name text not null default '',
    last_seen_at timestamptz not null default now(),
    primary key (list_id, user_id)
  )
`;
await sql`
  create index if not exists list_presence_list_seen_idx
    on public.list_presence (list_id, last_seen_at desc)
`;

const rows = await sql`select to_regclass('public.list_presence') as tbl`;
console.log("Migration 007 aplicada. Tabela:", rows[0]?.tbl ?? "FALHOU");
