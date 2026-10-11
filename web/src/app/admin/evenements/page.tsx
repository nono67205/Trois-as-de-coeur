import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/format";
import { EVENT_TYPE_LABELS, type AssoEvent } from "@/lib/types";
import { createEvent } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS = { draft: "Brouillon", published: "Publié", cancelled: "Annulé", done: "Terminé" } as const;

export default async function AdminEvents() {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*")
    .gte("starts_at", new Date(Date.now() - 30 * 864e5).toISOString()).order("starts_at");
  const events = (data ?? []) as AssoEvent[];

  return (
    <>
      <h1>Événements</h1>
      <div className="table-wrap" style={{ marginTop: 24 }}>
        <table>
          <thead><tr><th>Événement</th><th>Type</th><th>Date</th><th>Statut</th><th>Public</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/admin/evenements/${e.id}`}>{e.title}</Link></td>
                <td>{EVENT_TYPE_LABELS[e.type]}</td>
                <td>{formatDate(e.starts_at)} {formatTime(e.starts_at)}</td>
                <td><span className={`badge ${e.status === "cancelled" ? "badge--danger" : e.status === "draft" ? "badge--warn" : ""}`}>{STATUS_LABELS[e.status]}</span></td>
                <td>{e.is_public ? "Oui" : "Bénévoles"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card" style={{ marginTop: 32 }} aria-labelledby="new-event">
        <h2 id="new-event" style={{ fontSize: "1.3rem" }}>Créer un événement</h2>
        <form action={createEvent} className="form" style={{ maxWidth: 720 }}>
          <div className="field"><label htmlFor="e-title">Titre</label><input id="e-title" name="title" required /></div>
          <div className="field">
            <label htmlFor="e-type">Type</label>
            <select id="e-type" name="type">
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="field"><label htmlFor="e-start">Début</label><input id="e-start" name="starts_at" type="datetime-local" required /></div>
            <div className="field"><label htmlFor="e-end">Fin</label><input id="e-end" name="ends_at" type="datetime-local" required /></div>
          </div>
          <div className="field"><label htmlFor="e-loc">Lieu (public)</label><input id="e-loc" name="location" /></div>
          <div className="field">
            <label htmlFor="e-meet">Point de rendez-vous (bénévoles inscrits uniquement)</label>
            <input id="e-meet" name="meeting_point" />
          </div>
          <div className="field"><label htmlFor="e-desc">Description</label><textarea id="e-desc" name="description" rows={5} /></div>
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="field"><label htmlFor="e-slots">Bénévoles nécessaires</label><input id="e-slots" name="volunteer_slots" type="number" min="0" /></div>
            <div className="field"><label htmlFor="e-cap">Places grand public</label><input id="e-cap" name="public_capacity" type="number" min="0" /></div>
          </div>
          <div className="checkbox">
            <input id="e-public" name="is_public" type="checkbox" />
            <label htmlFor="e-public">Ouvert au grand public (visible dans l&apos;agenda du site, inscriptions sans compte)</label>
          </div>
          <div className="field">
            <label htmlFor="e-status">Statut</label>
            <select id="e-status" name="status" defaultValue="published">
              <option value="published">Publier maintenant</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>
          <button className="btn btn--primary">Créer l&apos;événement</button>
        </form>
      </section>
    </>
  );
}
