"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

const optionalInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).nullable());
const checkbox = z.preprocess((v) => v === "on", z.boolean());
// Les champs datetime-local arrivent sans fuseau : on les interprète en heure de Paris
const parisDate = z.string().min(1).transform((v) => new Date(`${v}:00${parisOffset(v)}`).toISOString());

function parisOffset(local: string) {
  const d = new Date(`${local}:00Z`);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" })
    .formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = tz.match(/GMT([+-])(\d+)/);
  return m ? `${m[1]}${m[2].padStart(2, "0")}:00` : "+00:00";
}

// ---------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------
const eventSchema = z.object({
  title: z.string().trim().min(3).max(140),
  type: z.enum(["maraude", "collecte", "distribution", "formation", "evenement_public", "reunion"]),
  description: z.string().trim().max(5000).default(""),
  starts_at: parisDate,
  ends_at: parisDate,
  location: z.string().trim().max(200).optional(),
  meeting_point: z.string().trim().max(200).optional(),
  is_public: checkbox,
  public_capacity: optionalInt,
  volunteer_slots: optionalInt,
  status: z.enum(["draft", "published"]),
});

export async function createEvent(form: FormData) {
  const profile = await requireStaff();
  const d = eventSchema.parse(Object.fromEntries(form));
  const supabase = await createClient();
  const slug = `${slugify(d.title)}-${d.starts_at.slice(0, 10)}`;
  const { data, error } = await supabase.from("events")
    .insert({ ...d, slug, created_by: profile.id }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/evenements");
  revalidatePath("/evenements");
  redirect(`/admin/evenements/${data.id}`);
}

export async function setEventStatus(form: FormData) {
  await requireStaff();
  const id = z.uuid().parse(form.get("id"));
  const status = z.enum(["draft", "published", "cancelled", "done"]).parse(form.get("status"));
  const supabase = await createClient();
  await supabase.from("events").update({ status }).eq("id", id);
  // TODO : en cas d'annulation, prévenir par email les inscrits et bénévoles
  revalidatePath(`/admin/evenements/${id}`);
  revalidatePath("/evenements");
}

export async function duplicateEvent(form: FormData) {
  const profile = await requireStaff();
  const id = z.uuid().parse(form.get("id"));
  const weeks = z.coerce.number().int().min(1).max(12).parse(form.get("weeks") ?? 1);
  const supabase = await createClient();
  const { data: src } = await supabase.from("events").select("*").eq("id", id).single();
  if (!src) return;
  const shift = (iso: string, w: number) => new Date(new Date(iso).getTime() + w * 7 * 864e5).toISOString();
  const copies = Array.from({ length: weeks }, (_, i) => {
    const rest = { ...src };
    delete rest.id;
    delete rest.created_at;
    const starts_at = shift(src.starts_at, i + 1);
    return { ...rest, starts_at, ends_at: shift(src.ends_at, i + 1), status: "draft",
      slug: `${slugify(src.title)}-${starts_at.slice(0, 10)}`, created_by: profile.id };
  });
  await supabase.from("events").upsert(copies, { onConflict: "slug", ignoreDuplicates: true });
  revalidatePath("/admin/evenements");
}

// ---------------------------------------------------------------------
// Compte-rendu de maraude (statistiques anonymes)
// ---------------------------------------------------------------------
const int0 = z.coerce.number().int().min(0).max(100000);
export async function saveReport(form: FormData) {
  const profile = await requireStaff();
  const d = z.object({
    event_id: z.uuid(), zone: z.string().max(200).optional(),
    people_met: int0, meals_given: int0, hot_drinks: int0, hygiene_kits: int0,
    clothes_given: int0, blankets_given: int0, referrals_115: int0, volunteers_count: int0,
    temperature_c: z.preprocess((v) => (v === "" ? null : Number(v)), z.number().min(-30).max(50).nullable()),
    notes: z.string().max(3000).optional(),
    decrement_stock: checkbox,
  }).parse(Object.fromEntries(form));

  const { decrement_stock, ...report } = d;
  const supabase = await createClient();
  await supabase.from("maraude_reports").upsert({ ...report, created_by: profile.id }, { onConflict: "event_id" });
  await supabase.from("events").update({ status: "done" }).eq("id", d.event_id);

  // Sorties de stock liées à la maraude (saisies dans le même formulaire : stock_<item_id> = quantité)
  if (decrement_stock) {
    const movements = [...form.entries()]
      .filter(([k, v]) => k.startsWith("stock_") && Number(v) > 0)
      .map(([k, v]) => ({ item_id: k.slice(6), delta: -Number(v), reason: "distribution", event_id: d.event_id, created_by: profile.id }));
    if (movements.length) await supabase.from("stock_movements").insert(movements);
  }
  revalidatePath(`/admin/evenements/${d.event_id}`);
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------
// Stocks
// ---------------------------------------------------------------------
export async function createStockItem(form: FormData) {
  await requireStaff();
  const d = z.object({
    name: z.string().trim().min(2).max(100),
    category: z.enum(["alimentaire", "boisson", "hygiene", "vetements", "couchage", "materiel", "autre"]),
    unit: z.string().trim().min(1).max(20),
    min_threshold: z.coerce.number().min(0),
    location: z.string().trim().max(100).optional(),
  }).parse(Object.fromEntries(form));
  const supabase = await createClient();
  await supabase.from("stock_items").insert(d);
  revalidatePath("/admin/stocks");
}

export async function addStockMovement(form: FormData) {
  const profile = await requireStaff();
  const d = z.object({
    item_id: z.uuid(),
    direction: z.enum(["in", "out"]),
    quantity: z.coerce.number().positive(),
    reason: z.enum(["don_recu", "achat", "distribution", "perime", "perte", "ajustement"]),
    expires_on: z.string().optional(),
    note: z.string().max(300).optional(),
  }).parse(Object.fromEntries(form));
  const supabase = await createClient();
  await supabase.from("stock_movements").insert({
    item_id: d.item_id,
    delta: d.direction === "in" ? d.quantity : -d.quantity,
    reason: d.reason,
    expires_on: d.expires_on || null,
    note: d.note || null,
    created_by: profile.id,
  });
  revalidatePath("/admin/stocks");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------
// Actualités
// ---------------------------------------------------------------------
export async function savePost(form: FormData) {
  const profile = await requireStaff();
  const d = z.object({
    id: z.uuid().optional().or(z.literal("")),
    title: z.string().trim().min(3).max(160),
    excerpt: z.string().trim().max(300).optional(),
    content: z.string().max(50000),
    cover_url: z.url().optional().or(z.literal("")),
    cover_alt: z.string().max(200).optional(),
    status: z.enum(["draft", "published", "archived"]),
  }).parse(Object.fromEntries(form));
  const supabase = await createClient();
  const payload = {
    title: d.title, excerpt: d.excerpt || null, content: d.content, status: d.status,
    cover_url: d.cover_url || null, cover_alt: d.cover_alt || null, updated_at: new Date().toISOString(),
    ...(d.status === "published" ? { published_at: new Date().toISOString() } : {}),
  };
  if (d.id) {
    await supabase.from("posts").update(payload).eq("id", d.id);
  } else {
    await supabase.from("posts").insert({ ...payload, slug: `${slugify(d.title)}-${Date.now().toString(36)}`, author_id: profile.id });
  }
  revalidatePath("/admin/actualites");
  revalidatePath("/actualites");
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Bénévoles (rôles : admin uniquement)
// ---------------------------------------------------------------------
export async function setRole(form: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(form.get("id"));
  const role = z.enum(["volunteer", "coordinator", "admin"]).parse(form.get("role"));
  const is_active = form.get("is_active") === "on";
  const supabase = await createClient();
  await supabase.from("profiles").update({ role, is_active }).eq("id", id);
  revalidatePath("/admin/benevoles");
}
