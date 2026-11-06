import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    const errorMsg = `[Supabase Server] Erro de Configuração: As seguintes variáveis de ambiente estão ausentes ou vazias no arquivo .env.local: ${missing.join(
      ", "
    )}. Por favor, configure as credenciais do Supabase para inicializar a conexão no servidor.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { url: url!, anonKey: anonKey! };
}

export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // O método `setAll` foi chamado a partir de um Server Component.
          // Isso pode ser ignorado caso haja um middleware atualizando as sessões.
        }
      },
    },
  });
}
