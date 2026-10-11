"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, userId: user.id };
}

export async function joinShift(form: FormData) {
  const eventId = z.uuid().parse(form.get("event_id"));
  const task = z.string().max(60).optional().parse(form.get("task") || undefined);
  const { supabase, userId } = await currentUserId();

  const { data: event } = await supabase.from("events").select("volunteer_slots").eq("id", eventId).single();
  const { data: fill } = await supabase.from("event_fill").select("volunteers_confirmed").eq("event_id", eventId).single();
  const full = event?.volunteer_slots != null && Number(fill?.volunteers_confirmed ?? 0) >= event.volunteer_slots;

  await supabase.from("volunteer_shifts").upsert(
    { event_id: eventId, profile_id: userId, task, status: full ? "waitlist" : "confirmed" },
    { onConflict: "event_id,profile_id" },
  );
  revalidatePath("/espace-benevole");
}

export async function leaveShift(form: FormData) {
  const eventId = z.uuid().parse(form.get("event_id"));
  const { supabase, userId } = await currentUserId();
  await supabase.from("volunteer_shifts").update({ status: "cancelled" }).eq("event_id", eventId).eq("profile_id", userId);
  revalidatePath("/espace-benevole");
}

export async function updateProfile(form: FormData) {
  const data = z.object({
    full_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(20),
    availability: z.string().trim().max(300),
    skills: z.array(z.string()).default([]),
    charter: z.literal("on").optional(),
  }).parse({ ...Object.fromEntries(form), skills: form.getAll("skills") });

  const { supabase, userId } = await currentUserId();
  await supabase.from("profiles").update({
    full_name: data.full_name,
    phone: data.phone || null,
    availability: data.availability || null,
    skills: data.skills,
    ...(data.charter ? { charter_signed_at: new Date().toISOString() } : {}),
  }).eq("id", userId);
  revalidatePath("/espace-benevole");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
