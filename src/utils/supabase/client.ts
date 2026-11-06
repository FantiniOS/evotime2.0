import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    const errorMsg = `[Supabase Client] Erro de Configuração: As seguintes variáveis de ambiente estão ausentes ou vazias no arquivo .env.local: ${missing.join(
      ", "
    )}. Por favor, configure as credenciais do Supabase para inicializar a conexão no cliente.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { url: url!, anonKey: anonKey! };
}

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
