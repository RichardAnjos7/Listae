import { neon } from "@neondatabase/serverless";
import { readEnv } from "@/lib/env";

export function getSql() {
  return neon(readEnv("DATABASE_URL"));
}
