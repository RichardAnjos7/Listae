/** Remove aspas e espaços extras comuns em .env.local */
export function readEnv(name: string): string {
  const raw = process.env[name];
  if (!raw?.trim()) {
    throw new Error(`Defina ${name} no .env.local`);
  }
  return raw.trim().replace(/^["']|["']$/g, "");
}
