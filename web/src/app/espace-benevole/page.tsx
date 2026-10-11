import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Calendar, parseMonth } from "@/components/Calendar";
import { formatTime } from "@/lib/format";
import { EVENT_TYPE_LABELS, type AssoEvent } from "@/lib/types";
import { Check, Clock, LayoutDashboard, LogOut, MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { DateTile } from "@/components/EventCard";
import { joinShift, leaveShift, signOut, updateProfile } from "./actions";

export const metadata: Metadata = { title: "Espace bénévole", robots: { index: false } };

const SKILLS = [
  { value: "permis_b", label: "Permis B" },
  { value: "premiers_secours", label: "Premiers secours (PSC1)" },
  { value: "cuisine", label: "Cuisine" },
  { value: "langues", label: "Langues étrangères" },
  { value: "sante", label: "Professionnel·le de santé" },
  { value: "social", label: "Travail social" },
];

export default async function VolunteerSpace({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const profile = await requireUser();
  const { year, month, from, to } = parseMonth((await searchParams).mois);
  const supabase = await createClient();

  const [{ data: events }, { data: shifts }, { data: calEvents }, { data: fill }] = await Promise.all([
    supabase.from("events").select("*").eq("status", "published")
      .gte("starts_at", new Date().toISOString()).order("starts_at").limit(12),
    supabase.from("volunteer_shifts").select("event_id, status, task").eq("profile_id", profile.id).neq("status", "cancelled"),
    supabase.from("events").select("*").in("status", ["published", "done"]).gte("starts_at", from).lt("starts_at", to),
    supabase.from("event_fill").select("event_id, volunteers_confirmed"),
  ]);

  const mine = new Map((shifts ?? []).map((s) => [s.event_id, s]));
  const filled = new Map((fill ?? []).map((f) => [f.event_id, Number(f.volunteers_confirmed)]));
  const upcoming = (events ?? []) as AssoEvent[];
  const myUpcoming = upcoming.filter((e) => mine.has(e.id)).length;
  const isStaff = profile.role !== "volunteer";

  return (
    <>
    <PageHero eyebrow="Espace bénévole" title={<>Bonjour <em>{profile.full_name.split(" ")[0] || "et bienvenue"}</em></>}
      lead={`${myUpcoming} mission${myUpcoming > 1 ? "s" : ""} à venir dans votre planning.`}>
      <div className="btn-row">
        {isStaff && <Link href="/admin" className="btn btn--donate btn--sm"><LayoutDashboard className="icon" aria-hidden="true" /> Administration</Link>}
        <form action={signOut}><button className="btn btn--ghost btn--sm"><LogOut className="icon" aria-hidden="true" /> Se déconnecter</button></form>
      </div>
    </PageHero>
    <div className="container section" style={{ paddingTop: 48 }}>
      {!profile.charter_signed_at && (
        <p className="alert alert--info" style={{ marginBottom: 32 }}>
          Avant votre première maraude, complétez votre profil et signez la charte du bénévole (en bas de page).
        </p>
      )}

      <section aria-labelledby="missions">
        <h2 id="missions" style={{ fontSize: "1.8rem" }}>Prochaines missions</h2>
        <div className="grid grid-3">
          {upcoming.map((e) => {
            const myShift = mine.get(e.id);
            const confirmed = filled.get(e.id) ?? 0;
            const slots = e.volunteer_slots;
            return (
              <article key={e.id} className="card" style={{ display: "grid", gap: 16, alignContent: "start", ...(myShift ? { borderColor: "var(--accent)", boxShadow: "inset 0 0 0 1px var(--accent)" } : {}) }}>
                <div className="event-card">
                  <DateTile iso={e.starts_at} />
                  <div>
                    <span className={`badge ${e.type === "maraude" ? "badge--amber" : ""}`}>{EVENT_TYPE_LABELS[e.type]}</span>
                    <h3>{e.title}</h3>
                    <ul className="meta">
                      <li><Clock aria-hidden="true" />{formatTime(e.starts_at)} – {formatTime(e.ends_at)}</li>
                      {myShift && e.meeting_point && <li><MapPin aria-hidden="true" />RDV : {e.meeting_point}</li>}
                    </ul>
                  </div>
                </div>
                {slots != null && (
                  <div>
                    <p style={{ display: "flex", justifyContent: "space-between", margin: "0 0 6px", fontSize: ".9rem" }}>
                      <span className="muted">Équipe</span>
                      <strong>{confirmed} / {slots}<span className="sr-only"> bénévoles inscrits</span></strong>
                    </p>
                    <span className="bar" style={{ display: "block" }} aria-hidden="true">
                      <span style={{ width: `${Math.min(100, (confirmed / Math.max(slots, 1)) * 100)}%` }} />
                    </span>
                  </div>
                )}
                {myShift ? (
                  <form action={leaveShift} className="btn-row" style={{ justifyContent: "space-between" }}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <span className="badge badge--amber"><Check className="icon" aria-hidden="true" />{myShift.status === "waitlist" ? "Liste d'attente" : "Inscrit·e"}</span>
                    <button className="btn btn--ghost btn--sm">Me désinscrire</button>
                  </form>
                ) : (
                  <form action={joinShift}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <button className="btn btn--primary btn--sm btn--block">
                      {slots != null && confirmed >= slots ? "Rejoindre la liste d'attente" : "Je participe"}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
          {upcoming.length === 0 && <p className="muted">Aucune mission programmée pour le moment.</p>}
        </div>
      </section>

      <div className="card" style={{ marginTop: 56 }}>
        <Calendar events={(calEvents ?? []) as AssoEvent[]} year={year} month={month}
          basePath="/espace-benevole" hrefFor={() => "/espace-benevole#missions"} />
      </div>

      <section style={{ marginTop: 56 }} aria-labelledby="profil">
        <h2 id="profil" style={{ fontSize: "1.8rem" }}>Mon profil</h2>
        <form action={updateProfile} className="form card">
          <div className="field">
            <label htmlFor="p-name">Nom et prénom</label>
            <input id="p-name" name="full_name" defaultValue={profile.full_name} required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="p-phone">Téléphone</label>
            <span className="hint">Visible uniquement par les coordinateurs, pour les urgences le soir de la maraude.</span>
            <input id="p-phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" />
          </div>
          <div className="field">
            <label htmlFor="p-avail">Disponibilités</label>
            <input id="p-avail" name="availability" defaultValue={profile.availability ?? ""} placeholder="ex. mardi soir, un week-end par mois" />
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0 }}>
            <legend>Compétences</legend>
            {SKILLS.map((s) => (
              <div key={s.value} className="checkbox">
                <input type="checkbox" id={`sk-${s.value}`} name="skills" value={s.value} defaultChecked={profile.skills.includes(s.value)} />
                <label htmlFor={`sk-${s.value}`}>{s.label}</label>
              </div>
            ))}
          </fieldset>
          {!profile.charter_signed_at && (
            <div className="checkbox">
              <input type="checkbox" id="charter" name="charter" />
              <label htmlFor="charter">J&apos;ai lu et j&apos;accepte la <a href="/charte-benevole.pdf">charte du bénévole</a>.</label>
            </div>
          )}
          <button className="btn btn--primary">Enregistrer</button>
        </form>
      </section>
    </div>
    </>
  );
}
