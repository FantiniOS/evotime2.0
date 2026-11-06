import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Compatível com Next.js 15/16 (cookies() assíncrono com await obrigatório).
 * Inclui tratamento defensivo para nunca estourar Erro 500 na renderização.
 */
export async function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "https://shvqthjdjwtsvezveusi.supabase.co";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "sb_publishable_h0ARw8QXKDMAu5xySbrViw_n6zGv0u5";

  // No Next.js 15+, cookies() retorna uma Promise que deve ser aguardada com await
  let cookieStore: any;
  try {
    cookieStore = await cookies();
  } catch (cookieErr) {
    console.error("[Supabase Server] Aviso ao ler cookies assíncronos:", cookieErr);
    cookieStore = {
      getAll: () => [],
      set: () => {},
    };
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        try {
          return cookieStore?.getAll() ?? [];
        } catch {
          return [];
        }
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore?.set(name, value, options)
          );
        } catch {
          // O método setAll em Server Components é somente leitura e pode ser ignorado
          // com segurança caso a atualização ocorra via Middleware.
        }
      },
    },
  });
}
