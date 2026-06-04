import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

/** Divide SQL respeitando blocos $$ ... $$ (funções PL/pgSQL). */
function splitSqlStatements(content) {
  const statements = [];
  let current = "";
  let i = 0;
  let dollarTag = null;

  while (i < content.length) {
    if (dollarTag) {
      const closeAt = content.indexOf(dollarTag, i);
      if (closeAt === -1) {
        current += content.slice(i);
        break;
      }
      current += content.slice(i, closeAt + dollarTag.length);
      i = closeAt + dollarTag.length;
      dollarTag = null;
      continue;
    }

    const rest = content.slice(i);
    const open = rest.match(/^\$([A-Za-z_]*)\$/);
    if (open) {
      dollarTag = open[0];
      current += open[0];
      i += open[0].length;
      continue;
    }

    const ch = content[i];
    if (ch === ";") {
      const stmt = current.trim();
      if (stmt.length > 0 && !stmt.split("\n").every((l) => l.trim().startsWith("--") || l.trim() === "")) {
        statements.push(stmt);
      }
      current = "";
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  const tail = current.trim();
  if (tail.length > 0 && !tail.split("\n").every((l) => l.trim().startsWith("--") || l.trim() === "")) {
    statements.push(tail);
  }

  return statements;
}

const sql = neon(url);
const dir = "neon/migrations";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const only = process.argv[2];

for (const file of files) {
  if (only && file !== only) continue;
  const migration = readFileSync(join(dir, file), "utf8");
  const parts = splitSqlStatements(migration);
  for (const part of parts) {
    await sql.query(part);
  }
  console.log(`Applied ${file} (${parts.length} statements)`);
}

console.log("Migrations done.");
