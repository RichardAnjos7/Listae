import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function readEnv(name) {
  const raw = process.env[name];
  if (!raw?.trim()) {
    console.error(`${name} required`);
    process.exit(1);
  }
  return raw.trim().replace(/^["']|["']$/g, "");
}

const sql = neon(readEnv("DATABASE_URL"));

const statements = [
  "alter table public.users add column if not exists username text",
  `update public.users
   set username = lower(
     case
       when email like '%@%' then split_part(email, '@', 1)
       else email
     end
   )
   where username is null and password_hash is not null`,
  "alter table public.users alter column email drop not null",
  `create unique index if not exists users_username_unique on public.users (username)
   where username is not null`,
];

// Google auth (002) — idempotente
const googleStatements = [
  "alter table public.users alter column password_hash drop not null",
  "alter table public.users add column if not exists google_id text",
  `create unique index if not exists users_google_id_idx on public.users (google_id)
   where google_id is not null`,
];

for (const q of [...googleStatements, ...statements]) {
  await sql.query(q);
  console.log("ok:", q.slice(0, 55).replace(/\s+/g, " "));
}

console.log("Migrations applied.");
