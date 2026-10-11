import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/demo/mode";
import { createDemoClient } from "@/lib/demo/client";

/**
 * Client « service role » : contourne la RLS.
 * À utiliser uniquement dans des server actions / routes API après validation des entrées
 * (inscriptions publiques, formulaire de contact, webhook HelloAsso).
 */
export function createAdminClient(): SupabaseClient {
  if (isDemoMode()) return createDemoClient() as unknown as SupabaseClient;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
