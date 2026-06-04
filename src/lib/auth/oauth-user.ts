import type { GoogleUserInfo } from "@/lib/auth/google";
import { getSql } from "@/lib/db";

export async function findOrCreateUserFromGoogle(googleUser: GoogleUserInfo) {
  const sql = getSql();
  const email = googleUser.email.trim().toLowerCase();
  const name = googleUser.name?.trim() || email.split("@")[0] || "Usuário";
  const avatarUrl = googleUser.picture ?? null;

  const byGoogle = await sql`
    select id from users where google_id = ${googleUser.id} limit 1
  `;
  if (byGoogle.length > 0) {
    const userId = byGoogle[0].id as string;
    await sql`
      update profiles
      set name = ${name}, avatar_url = coalesce(${avatarUrl}, avatar_url)
      where id = ${userId}
    `;
    return userId;
  }

  const byEmail = await sql`
    select id, google_id, password_hash from users where email = ${email} limit 1
  `;
  if (byEmail.length > 0) {
    const row = byEmail[0] as {
      id: string;
      google_id: string | null;
      password_hash: string | null;
    };
    if (row.google_id && row.google_id !== googleUser.id) {
      throw new Error("Este e-mail já está vinculado a outra conta Google.");
    }
    await sql`
      update users set google_id = ${googleUser.id} where id = ${row.id}
    `;
    await sql`
      update profiles
      set name = ${name}, avatar_url = coalesce(${avatarUrl}, avatar_url)
      where id = ${row.id}
    `;
    return row.id;
  }

  const rows = await sql`
    insert into users (username, email, password_hash, google_id)
    values (null, ${email}, null, ${googleUser.id})
    returning id
  `;
  const userId = rows[0].id as string;
  await sql`
    insert into profiles (id, name, avatar_url)
    values (${userId}, ${name}, ${avatarUrl})
  `;
  return userId;
}
