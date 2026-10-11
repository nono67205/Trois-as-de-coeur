"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../actions";

const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/espace-benevole";
};

export async function loginWithPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Saisissez votre email et votre mot de passe." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: "Email ou mot de passe incorrect." };
  redirect(safeNext(form.get("next")));
}

export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { ok: false, message: "Adresse email invalide." };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}`,
      data: { full_name: String(form.get("full_name") ?? "") },
    },
  });
  if (error) return { ok: false, message: error.message.includes("démo") ? error.message : "Impossible d'envoyer le lien. Réessayez dans un instant." };
  return { ok: true, message: "Un lien de connexion vient de vous être envoyé par email. Il est valable 1 heure." };
}
