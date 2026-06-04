"use server";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSession, createSession, getSessionUserId } from "@/lib/auth/session";
import { normalizeUsername, validateUsername } from "@/lib/auth/username";
import { getSql } from "@/lib/db";
import { redirect } from "next/navigation";

export async function signUpAction(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const next = String(formData.get("next") ?? "/");

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (!password) return { error: "Usuário e senha são obrigatórios." };
  if (password !== passwordConfirm) {
    return { error: "As senhas não coincidem." };
  }

  let sql;
  try {
    sql = getSql();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro de configuração do servidor." };
  }

  let existing;
  try {
    existing = await sql`
      select id, password_hash, google_id from users where username = ${username} limit 1
    `;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("username")) {
      return {
        error:
          "Banco desatualizado: execute node --env-file=.env.local scripts/apply-003-username.mjs",
      };
    }
    throw e;
  }

  if (existing.length > 0) {
    const row = existing[0] as { password_hash: string | null; google_id: string | null };
    if (row.google_id && !row.password_hash) {
      return { error: "Este usuário já usa login com Google. Clique em Continuar com Google." };
    }
    return { error: "Este usuário já está cadastrado." };
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    insert into users (username, email, password_hash)
    values (${username}, null, ${passwordHash})
    returning id
  `;
  const userId = rows[0].id as string;
  await sql`insert into profiles (id, name) values (${userId}, ${username})`;
  await createSession(userId);
  redirect(next.startsWith("/") ? next : "/");
}

export async function signInAction(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (!password) return { error: "Usuário e senha são obrigatórios." };

  let sql;
  try {
    sql = getSql();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro de configuração do servidor." };
  }

  let rows;
  try {
    rows = await sql`
      select id, password_hash from users where username = ${username} limit 1
    `;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("username")) {
      return {
        error:
          "Banco desatualizado: execute node --env-file=.env.local scripts/apply-003-username.mjs",
      };
    }
    throw e;
  }

  const user = rows[0] as { id: string; password_hash: string | null } | undefined;
  if (!user) {
    return { error: "Usuário ou senha inválidos." };
  }
  if (!user.password_hash) {
    return { error: "Esta conta usa login com Google. Clique em Continuar com Google." };
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    return { error: "Usuário ou senha inválidos." };
  }

  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}

export async function getCurrentUserId() {
  return getSessionUserId();
}
