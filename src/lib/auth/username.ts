const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!username) return "Usuário e senha são obrigatórios.";
  if (!USERNAME_PATTERN.test(username)) {
    return "Usuário deve ter 3–32 caracteres (letras minúsculas, números e _).";
  }
  return null;
}
