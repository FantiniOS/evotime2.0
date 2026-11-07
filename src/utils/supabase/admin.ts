import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Cria o cliente administrativo do Supabase com a SUPABASE_SERVICE_ROLE_KEY.
 * Este cliente roda exclusivamente no servidor (Server Actions / APIs)
 * para operações de gerenciamento de usuários (auth.admin) e bypass seguro de RLS.
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "") ||
    "https://shvqthjdjwtsvezveusi.supabase.co";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNodnF0aGpkand0c3ZlenZldXNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mzk2ODA5MiwiZXhwIjoyMTA5NTQ0MDkyfQ.4TvxeDJwhruOyok4kvP70fmwFZn8h5fp7Y-BPrJdi4M";

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
