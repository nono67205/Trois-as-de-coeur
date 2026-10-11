"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { ok: boolean; message: string } | null;

const isBot = (form: FormData) => Boolean(form.get("website"));

// ---------------------------------------------------------------------
// Inscription du grand public à un événement (sans compte)
// ---------------------------------------------------------------------
const registrationSchema = z.object({
  event_id: z.uuid(),
  full_name: z.string().trim().min(2, "Indiquez votre nom").max(120),
  email: z.email("Adresse email invalide"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  seats: z.coerce.number().int().min(1).max(10),
  gdpr_consent: z.literal("on", { message: "Votre accord est nécessaire pour vous inscrire" }),
  newsletter_optin: z.literal("on").optional(),
});

export async function registerToEvent(_prev: FormState, form: FormData): Promise<FormState> {
  if (isBot(form)) return { ok: true, message: "Merci !" };

  const parsed = registrationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, is_public, status, public_capacity, starts_at")
    .eq("id", d.event_id)
    .single();

  if (!event || !event.is_public || event.status !== "published" || new Date(event.starts_at) < new Date()) {
    return { ok: false, message: "Les inscriptions à cet événement sont fermées." };
  }

  if (event.public_capacity != null) {
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("seats")
      .eq("event_id", d.event_id)
      .is("cancelled_at", null);
    const taken = (regs ?? []).reduce((sum, r) => sum + r.seats, 0);
    if (taken + d.seats > event.public_capacity) {
      return { ok: false, message: "Désolé, il ne reste plus assez de places." };
    }
  }

  const { error } = await supabase.from("event_registrations").insert({
    event_id: d.event_id,
    full_name: d.full_name,
    email: d.email.toLowerCase(),
    phone: d.phone || null,
    seats: d.seats,
    gdpr_consent: true,
    newsletter_optin: d.newsletter_optin === "on",
  });

  if (error?.code === "23505") return { ok: false, message: "Vous êtes déjà inscrit·e à cet événement." };
  if (error) return { ok: false, message: "Une erreur est survenue, merci de réessayer." };

  if (d.newsletter_optin === "on") {
    await supabase.from("newsletter_subscribers").upsert({ email: d.email.toLowerCase() }, { onConflict: "email" });
  }

  // TODO : email de confirmation (Resend / Brevo) avec lien d'annulation et fichier .ics
  return { ok: true, message: `C'est noté ! Votre inscription à « ${event.title} » est confirmée.` };
}

// ---------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------
const contactSchema = z.object({
  full_name: z.string().trim().min(2, "Indiquez votre nom").max(120),
  email: z.email("Adresse email invalide"),
  subject: z.enum(["benevolat", "partenariat", "don_nature", "signalement", "presse", "autre"]),
  message: z.string().trim().min(10, "Votre message est un peu court").max(5000),
});

export async function sendContact(_prev: FormState, form: FormData): Promise<FormState> {
  if (isBot(form)) return { ok: true, message: "Merci !" };
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { error } = await createAdminClient().from("contact_messages").insert(parsed.data);
  if (error) return { ok: false, message: "Une erreur est survenue, merci de réessayer." };
  return { ok: true, message: "Merci, votre message a bien été envoyé. Nous vous répondons sous 72 h." };
}

// ---------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------
export async function subscribeNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  if (isBot(form)) return { ok: true, message: "Merci !" };
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { ok: false, message: "Adresse email invalide." };

  await createAdminClient()
    .from("newsletter_subscribers")
    .upsert({ email: email.data.toLowerCase() }, { onConflict: "email" });
  // TODO : double opt-in (email de confirmation) avant envoi de toute campagne
  return { ok: true, message: "Merci ! Vous recevrez nos prochaines nouvelles." };
}
