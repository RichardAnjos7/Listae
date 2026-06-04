import { getSql } from "@/lib/db";

let ensured = false;

/** Garante que list_presence existe (Neon serverless não executa migrações multi-statement via unsafe). */
export async function ensureListPresenceTable() {
  if (ensured) return;
  const sql = getSql();
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
  ensured = true;
}

export async function upsertListPresence(listId: string, userId: string, userName: string) {
  await ensureListPresenceTable();
  const sql = getSql();
  await sql`
    insert into list_presence (list_id, user_id, user_name, last_seen_at)
    values (${listId}, ${userId}, ${userName}, now())
    on conflict (list_id, user_id)
    do update set user_name = excluded.user_name, last_seen_at = now()
  `;
}

export async function fetchListPresence(listId: string) {
  await ensureListPresenceTable();
  const sql = getSql();
  return sql`
    select user_id, user_name, last_seen_at
    from list_presence
    where list_id = ${listId}
      and last_seen_at > now() - interval '30 seconds'
    order by user_name
  `;
}

export async function deleteListPresenceForList(listId: string) {
  await ensureListPresenceTable();
  const sql = getSql();
  await sql`delete from list_presence where list_id = ${listId}`;
}
