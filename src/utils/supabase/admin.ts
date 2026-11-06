import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Cria o cliente administrativo do Supabase com a SUPABASE_SERVICE_ROLE_KEY.
 * Este cliente roda exclusivamente no servidor (Server Actions / APIs)
 * para operações de gerenciamento de usuários (auth.admin) e bypass seguro de RLS.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    const errorMsg =
      "[Supabase Admin] Variável NEXT_PUBLIC_SUPABASE_URL não configurada no .env.local.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!serviceRoleKey) {
    const errorMsg =
      "A chave SUPABASE_SERVICE_ROLE_KEY não está preenchida no .env.local. Obtenha a chave 'service_role' no painel do Supabase (Project Settings > API > Project API keys) para cadastrar novos usuários da equipe.";
    console.error(`[Supabase Admin] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
