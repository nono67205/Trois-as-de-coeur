import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { EVENT_TYPE_LABELS, type AssoEvent } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/format";

const TZ = "Europe/Paris";
const part = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { ...o, timeZone: TZ }).format(new Date(iso));

export function DateTile({ iso }: { iso: string }) {
  return (
    <span className="date-tile" aria-hidden="true">
      <span className="date-tile__day">{part(iso, { day: "numeric" })}</span>
      <span className="date-tile__month">{part(iso, { month: "short" }).replace(".", "")}</span>
    </span>
  );
}

/** Une ligne de l'agenda (à placer dans une `ul.event-list`). */
export function EventRow({ event, href }: { event: AssoEvent; href?: string }) {
  return (
    <article className="event-row">
      <DateTile iso={event.starts_at} />
      <div>
        <span className={`badge ${event.type === "maraude" ? "badge--amber" : ""}`}>{EVENT_TYPE_LABELS[event.type]}</span>
        <h3>
          <Link className="stretched" href={href ?? `/evenements/${event.slug}`}>{event.title}</Link>
        </h3>
        <ul className="meta">
          <li><Clock aria-hidden="true" /><span className="sr-only">Date : </span>
            <time dateTime={event.starts_at}>{formatDate(event.starts_at)}, {formatTime(event.starts_at)}</time>
          </li>
          {event.location && <li><MapPin aria-hidden="true" /><span className="sr-only">Lieu : </span>{event.location}</li>}
        </ul>
      </div>
      <ArrowRight className="icon event-row__arrow" aria-hidden="true" />
    </article>
  );
}

export function EventList({ events, empty }: { events: AssoEvent[]; empty: string }) {
  if (!events.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="event-list">
      {events.map((e) => <li key={e.id}><EventRow event={e} /></li>)}
    </ul>
  );
}
