import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Compatível com Next.js 15/16 (cookies() assíncrono com await obrigatório).
 * Garante que cookies assíncronos sejam lidos e gerenciados adequadamente sem quebrar requisições POST.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "") ||
    "https://shvqthjdjwtsvezveusi.supabase.co";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") ||
    "sb_publishable_h0ARw8QXKDMAu5xySbrViw_n6zGv0u5";

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        try {
          return cookieStore.getAll();
        } catch (err) {
          console.error("Erro ao obter cookies no Supabase Server Client:", err);
          return [];
        }
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // O método `setAll` pode ser chamado a partir de um Server Component durante SSR
          // onde a escrita de cookies é desabilitada. Em Server Actions (POST), funciona normalmente.
        }
      },
    },
  });
}
