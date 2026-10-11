import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS, type AssoEvent } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { RegistrationForm } from "./RegistrationForm";

type Params = { params: Promise<{ slug: string }> };

async function getEvent(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  return data as AssoEvent | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  return event ? { title: event.title, description: event.description.slice(0, 160) } : {};
}

export default async function EventPage({ params }: Params) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();

  const isOpen = event.status === "published" && event.is_public && new Date(event.starts_at) > new Date();

  return (
    <>
      <PageHero eyebrow={EVENT_TYPE_LABELS[event.type]} title={event.title}>
        <ul className="meta meta--stack" style={{ fontSize: "1.02rem", margin: 0 }}>
          <li style={{ textTransform: "capitalize" }}><Clock aria-hidden="true" />{formatDate(event.starts_at)}, {formatTime(event.starts_at)} – {formatTime(event.ends_at)}</li>
          {event.location && <li><MapPin aria-hidden="true" />{event.location}</li>}
          {event.public_capacity != null && <li><Users aria-hidden="true" />{event.public_capacity} places</li>}
        </ul>
      </PageHero>

      <div className="container section">
        <p><Link href="/evenements" className="link-arrow"><ArrowLeft className="icon" aria-hidden="true" /> Agenda</Link></p>
        <div className="grid grid-2" style={{ alignItems: "start", marginTop: 24 }}>
          <div className="prose">
            <h2 style={{ marginTop: 0 }}>Au programme</h2>
            <p className="lead" style={{ whiteSpace: "pre-line" }}>{event.description}</p>
            {event.status === "cancelled" && <p className="alert alert--error">Cet événement est annulé.</p>}
          </div>

          <aside className="card">
            {isOpen ? (
              <>
                <h2 style={{ fontSize: "1.6rem" }}>Je m&apos;inscris</h2>
                <RegistrationForm eventId={event.id} />
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "1.6rem" }}>Inscriptions fermées</h2>
                <p>Retrouvez nos prochains rendez-vous dans <Link href="/evenements">l&apos;agenda</Link>.</p>
              </>
            )}
            <p className="muted" style={{ margin: "24px 0 0", fontSize: ".95rem" }}>
              Envie d&apos;aider à l&apos;organisation ? <Link href="/devenir-benevole">Devenez bénévole</Link>.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
