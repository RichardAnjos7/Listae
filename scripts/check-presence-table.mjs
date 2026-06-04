import fs from "fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(".env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
if (!line) process.exit(1);
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const rows = await sql`
  select to_regclass('public.list_presence') as tbl
`;
console.log("list_presence:", rows[0]?.tbl ?? "MISSING");
