/**
 * Utilitário de Email Mapping para o Supabase Auth no EvoTime 2.0.
 * Permite que usuários façam login e se cadastrem apenas com "Nome de Usuário" (Username),
 * mapeando internamente para um e-mail com domínio interno fixo (@evotime.local) exigido pelo Supabase Auth.
 */

export const EVOTIME_AUTH_DOMAIN = "evotime.local";

/**
 * Sanitiza o nome de usuário:
 * Remove espaços em branco, converte para minúsculas e remove caracteres inválidos.
 */
export function sanitizeUsername(rawUsername: string): string {
  if (!rawUsername) return "";
  return rawUsername
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * Converte um username (ex: "carlos", "mariana.silva") para o e-mail mapeado exigido pelo Supabase.
 * Ex: "carlos" -> "carlos@evotime.local"
 * Ex: "  Carlos.Eduardo " -> "carlos.eduardo@evotime.local"
 * Se o usuário por ventura digitar um e-mail já formatado (ex: "carlos@evotime.local" ou institucional),
 * mantém e apenas sanitiza.
 */
export function usernameToEmail(usernameOrEmail: string): string {
  const sanitized = sanitizeUsername(usernameOrEmail);
  if (!sanitized) return "";
  if (sanitized.includes("@")) {
    return sanitized;
  }
  return `${sanitized}@${EVOTIME_AUTH_DOMAIN}`;
}

/**
 * Extrai o nome de usuário limpo a partir de um e-mail do Supabase.
 * Ex: "carlos@evotime.local" -> "carlos"
 * Ex: "coordenacao@escola.edu.br" -> "coordenacao"
 */
export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain || domain === EVOTIME_AUTH_DOMAIN) {
    return user || email;
  }
  return user || email;
}
