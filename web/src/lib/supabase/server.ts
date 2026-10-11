import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/demo/mode";
import { createDemoClient } from "@/lib/demo/client";

/** Client Supabase côté serveur, agissant avec la session de l'utilisateur (RLS appliquée). */
export async function createClient(): Promise<SupabaseClient> {
  if (isDemoMode()) return createDemoClient() as unknown as SupabaseClient;

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : le middleware rafraîchit la session.
          }
        },
      },
    },
  );
}
