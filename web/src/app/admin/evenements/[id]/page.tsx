import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/format";
import { EVENT_TYPE_LABELS, type AssoEvent, type StockLevel } from "@/lib/types";
import { duplicateEvent, saveReport, setEventStatus } from "../../actions";

export const dynamic = "force-dynamic";

const REPORT_FIELDS = [
  { name: "people_met", label: "Personnes rencontrées" },
  { name: "meals_given", label: "Repas distribués" },
  { name: "hot_drinks", label: "Boissons chaudes" },
  { name: "hygiene_kits", label: "Kits hygiène" },
  { name: "clothes_given", label: "Vêtements donnés" },
  { name: "blankets_given", label: "Couvertures / duvets" },
  { name: "referrals_115", label: "Orientations (115, structures)" },
  { name: "volunteers_count", label: "Bénévoles présents" },
] as const;

export default async function AdminEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: event }, { data: regs }, { data: shifts }, { data: report }, { data: stock }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.from("event_registrations").select("*").eq("event_id", id).is("cancelled_at", null).order("created_at"),
    supabase.from("volunteer_shifts").select("id, status, task, profiles(full_name, phone, skills)").eq("event_id", id).neq("status", "cancelled"),
    supabase.from("maraude_reports").select("*").eq("event_id", id).maybeSingle(),
    supabase.from("stock_levels").select("*").order("category"),
  ]);
  if (!event) notFound();
  const e = event as AssoEvent;
  const seats = (regs ?? []).reduce((s, r) => s + r.seats, 0);

  return (
    <>
      <p><Link href="/admin/evenements">← Événements</Link></p>
      <p className="badge">{EVENT_TYPE_LABELS[e.type]}</p>
      <h1 style={{ marginTop: 10 }}>{e.title}</h1>
      <p className="muted">{formatDate(e.starts_at)}, {formatTime(e.starts_at)} – {formatTime(e.ends_at)} · {e.location}</p>

      <div className="btn-row" style={{ margin: "16px 0 32px" }}>
        {(["published", "draft", "cancelled", "done"] as const).filter((s) => s !== e.status).map((s) => (
          <form key={s} action={setEventStatus}>
            <input type="hidden" name="id" value={e.id} />
            <input type="hidden" name="status" value={s} />
            <button className="btn btn--ghost btn--sm">
              {{ published: "Publier", draft: "Repasser en brouillon", cancelled: "Annuler l'événement", done: "Marquer terminé" }[s]}
            </button>
          </form>
        ))}
        <form action={duplicateEvent} className="btn-row">
          <input type="hidden" name="id" value={e.id} />
          <label htmlFor="weeks" className="sr-only">Nombre de semaines</label>
          <select id="weeks" name="weeks" defaultValue="4" style={{ width: "auto" }}>
            {[1, 2, 4, 8, 12].map((n) => <option key={n} value={n}>{n} sem.</option>)}
          </select>
          <button className="btn btn--ghost btn--sm">Répéter chaque semaine</button>
        </form>
        {e.is_public && <Link className="btn btn--ghost btn--sm" href={`/evenements/${e.slug}`}>Page publique</Link>}
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <section className="card" aria-labelledby="team">
          <h2 id="team" style={{ fontSize: "1.2rem" }}>Équipe bénévole ({(shifts ?? []).filter((s) => s.status === "confirmed").length}{e.volunteer_slots != null && ` / ${e.volunteer_slots}`})</h2>
          <ul className="stack" style={{ paddingLeft: 18 }}>
            {(shifts ?? []).map((s) => {
              const p = s.profiles as unknown as { full_name: string; phone: string | null; skills: string[] } | null;
              return (
                <li key={s.id}>
                  <strong>{p?.full_name}</strong> {s.status === "waitlist" && <span className="badge badge--warn">attente</span>}
                  {p?.phone && <> · <a href={`tel:${p.phone}`}>{p.phone}</a></>}
                  {p?.skills.length ? <><br /><span className="muted">{p.skills.join(", ")}</span></> : null}
                </li>
              );
            })}
          </ul>
          {!shifts?.length && <p className="muted">Aucun bénévole inscrit.</p>}
        </section>

        {e.is_public && (
          <section className="card" aria-labelledby="regs">
            <h2 id="regs" style={{ fontSize: "1.2rem" }}>Inscriptions publiques ({seats}{e.public_capacity != null && ` / ${e.public_capacity}`})</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nom</th><th>Email</th><th>Pers.</th></tr></thead>
                <tbody>
                  {(regs ?? []).map((r) => (
                    <tr key={r.id}><td>{r.full_name}</td><td><a href={`mailto:${r.email}`}>{r.email}</a></td><td>{r.seats}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {e.type === "maraude" || e.type === "distribution" ? (
        <section className="card" style={{ marginTop: 32 }} aria-labelledby="report">
          <h2 id="report" style={{ fontSize: "1.3rem" }}>Compte-rendu {report ? "(enregistré)" : ""}</h2>
          <p className="muted">Uniquement des chiffres et observations générales. <strong>Aucun nom ni information permettant d&apos;identifier une personne.</strong></p>
          <form action={saveReport} className="form" style={{ maxWidth: 820 }}>
            <input type="hidden" name="event_id" value={e.id} />
            <div className="grid grid-4" style={{ gap: 16 }}>
              {REPORT_FIELDS.map((f) => (
                <div className="field" key={f.name}>
                  <label htmlFor={`r-${f.name}`}>{f.label}</label>
                  <input id={`r-${f.name}`} name={f.name} type="number" min="0" inputMode="numeric"
                    defaultValue={report?.[f.name] ?? 0} />
                </div>
              ))}
              <div className="field">
                <label htmlFor="r-temp">Température (°C)</label>
                <input id="r-temp" name="temperature_c" type="number" step="0.5" defaultValue={report?.temperature_c ?? ""} />
              </div>
            </div>
            <div className="field"><label htmlFor="r-zone">Zone parcourue</label><input id="r-zone" name="zone" defaultValue={report?.zone ?? ""} /></div>
            <div className="field"><label htmlFor="r-notes">Observations générales</label><textarea id="r-notes" name="notes" rows={4} defaultValue={report?.notes ?? ""} /></div>

            {!report && (
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Déduire les quantités distribuées des stocks</summary>
                <div className="checkbox" style={{ margin: "12px 0" }}>
                  <input id="r-dec" name="decrement_stock" type="checkbox" />
                  <label htmlFor="r-dec">Oui, enregistrer ces sorties de stock</label>
                </div>
                <div className="grid grid-3" style={{ gap: 12 }}>
                  {((stock ?? []) as StockLevel[]).map((s) => (
                    <div className="field" key={s.id}>
                      <label htmlFor={`st-${s.id}`}>{s.name} <span className="muted">({s.quantity} {s.unit})</span></label>
                      <input id={`st-${s.id}`} name={`stock_${s.id}`} type="number" min="0" step="any" defaultValue="" />
                    </div>
                  ))}
                </div>
              </details>
            )}
            <button className="btn btn--primary">Enregistrer le compte-rendu</button>
          </form>
        </section>
      ) : null}
    </>
  );
}
