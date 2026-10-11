import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Calendar, parseMonth } from "@/components/Calendar";
import { EventList } from "@/components/EventCard";
import { PageHero } from "@/components/PageHero";
import type { AssoEvent } from "@/lib/types";

export const metadata: Metadata = { title: "Agenda" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { year, month, from, to } = parseMonth((await searchParams).mois);
  const supabase = await createClient();
  const [{ data: monthEvents }, { data: upcoming }] = await Promise.all([
    supabase.from("events").select("*").eq("is_public", true).in("status", ["published", "done"])
      .gte("starts_at", from).lt("starts_at", to).order("starts_at"),
    supabase.from("events").select("*").eq("is_public", true).eq("status", "published")
      .gte("starts_at", new Date().toISOString()).order("starts_at").limit(6),
  ]);

  return (
    <>
      <PageHero eyebrow="Agenda" title={<>Venez nous <em>rencontrer.</em></>}
        lead="Collectes, soirées découverte, formations, concerts solidaires : inscription en quelques secondes, sans créer de compte.">
        <a href="/api/calendar" className="btn btn--ghost"><CalendarPlus className="icon" aria-hidden="true" /> Ajouter à mon agenda</a>
      </PageHero>

      <div className="container section">
        <h2 style={{ fontSize: "clamp(1.6rem, 2.4vw, 2rem)", marginBottom: 28 }}>À venir</h2>
        <EventList events={(upcoming ?? []) as AssoEvent[]} empty="Pas d'événement public programmé pour le moment." />

        <div style={{ marginTop: "clamp(64px, 8vw, 112px)" }}>
          <Calendar events={(monthEvents ?? []) as AssoEvent[]} year={year} month={month}
            basePath="/evenements" hrefFor={(e) => `/evenements/${e.slug}`} />
        </div>
      </div>
    </>
  );
}
