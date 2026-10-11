import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AssoEvent } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/format";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d); // AAAA-MM-JJ

interface Props {
  events: AssoEvent[];
  year: number;
  month: number; // 0-11
  hrefFor: (e: AssoEvent) => string;
  basePath: string; // pour la navigation mois précédent / suivant
}

/** Calendrier mensuel : grille sur grand écran, liste sur mobile (plus accessible). */
export function Calendar({ events, year, month, hrefFor, basePath }: Props) {
  const first = new Date(Date.UTC(year, month, 1, 12));
  const offset = (first.getUTCDay() + 6) % 7; // lundi = 0
  const start = new Date(first);
  start.setUTCDate(1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });

  const byDay = new Map<string, AssoEvent[]>();
  for (const e of events) {
    const k = dayKey(new Date(e.starts_at));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  const todayKey = dayKey(new Date());
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(first);
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const monthParam = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((e) => dayKey(new Date(e.starts_at)).startsWith(monthPrefix));

  return (
    <section aria-labelledby="cal-title">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <Link className="btn btn--ghost btn--sm" href={`${basePath}?mois=${monthParam(prev)}`}>
          <ChevronLeft className="icon" aria-hidden="true" /> <span className="sr-only">Mois précédent</span>
        </Link>
        <h2 id="cal-title" style={{ margin: 0, textTransform: "capitalize", fontSize: "clamp(1.4rem, 2.5vw, 2rem)" }}>{label}</h2>
        <Link className="btn btn--ghost btn--sm" href={`${basePath}?mois=${monthParam(next)}`}>
          <span className="sr-only">Mois suivant</span> <ChevronRight className="icon" aria-hidden="true" />
        </Link>
      </div>

      <div className="calendar calendar-grid-view" aria-hidden="true">
        {WEEKDAYS.map((w) => <div key={w} className="calendar__head">{w}</div>)}
        {days.map((d) => {
          const k = dayKey(d);
          const cls = ["calendar__day", d.getUTCMonth() !== month && "calendar__day--out", k === todayKey && "calendar__day--today"]
            .filter(Boolean).join(" ");
          return (
            <div key={k} className={cls}>
              <span className="calendar__num">{d.getUTCDate()}</span>
              {(byDay.get(k) ?? []).map((e) => (
                <Link key={e.id} href={hrefFor(e)} tabIndex={-1}
                  className={`calendar__event ${e.type === "maraude" ? "calendar__event--maraude" : ""}`}>
                  {formatTime(e.starts_at)} {e.title}
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      {/* Vue liste : toujours lue par les lecteurs d'écran, affichée sur mobile */}
      <ul className="calendar-list-view stack" style={{ listStyle: "none", padding: 0 }}>
        {monthEvents.length === 0 && <li className="muted">Aucun événement ce mois-ci.</li>}
        {monthEvents.map((e) => (
          <li key={e.id} className="card">
            <Link href={hrefFor(e)}><strong>{e.title}</strong></Link>
            <br />
            <span className="muted">{formatDate(e.starts_at)}, {formatTime(e.starts_at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function parseMonth(param?: string) {
  const now = new Date();
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m ? Number(m[2]) - 1 : now.getMonth();
  const from = new Date(Date.UTC(year, month, 1) - 7 * 864e5).toISOString();
  const to = new Date(Date.UTC(year, month + 1, 1) + 14 * 864e5).toISOString();
  return { year, month, from, to };
}
