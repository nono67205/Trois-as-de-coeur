import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventList } from "@/components/EventCard";
import { PostCard } from "@/components/PostCard";
import { formatDate, formatTime } from "@/lib/format";
import { site } from "@/lib/site";
import type { AssoEvent, Post } from "@/lib/types";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();
  const admin = createAdminClient(); // agrégats publics uniquement (aucune donnée personnelle)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [{ data: impact }, { data: events }, { data: posts }, { data: nextMaraude }, { data: needs }, { data: lastReport }, { data: monthReports }] =
    await Promise.all([
      supabase.from("public_impact").select("*").single(),
      supabase.from("events").select("*").eq("is_public", true).eq("status", "published")
        .gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
      supabase.from("posts").select("id, slug, title, excerpt, published_at, cover_url, cover_alt").eq("status", "published")
        .order("published_at", { ascending: false }).limit(3),
      admin.from("events").select("id, starts_at, volunteer_slots").eq("type", "maraude").eq("status", "published")
        .gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
      admin.from("stock_levels").select("name").eq("is_low", true).limit(6),
      admin.from("maraude_reports").select("temperature_c, people_met, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("maraude_reports").select("meals_given, events!inner(starts_at)").gte("events.starts_at", monthStart),
    ]);

  const { data: fill } = nextMaraude
    ? await admin.from("event_fill").select("volunteers_confirmed").eq("event_id", nextMaraude.id).maybeSingle()
    : { data: null };
  const confirmed = Number(fill?.volunteers_confirmed ?? 0);
  const slots = nextMaraude?.volunteer_slots ?? 0;
  const missing = Math.max(0, slots - confirmed);
  const mealsThisMonth = (monthReports ?? []).reduce((s, r) => s + r.meals_given, 0);
  const mealEuros = site.mealCostEuros.toLocaleString("fr-FR", { minimumFractionDigits: 2 });
  const needList = needs?.length ? needs.map((n) => n.name) : ["Duvets", "Chaussettes", "Kits d'hygiène"];

  const stats = [
    { value: impact?.maraudes_done ?? 0, label: "maraudes réalisées" },
    { value: impact?.meals_given ?? 0, label: "repas distribués" },
    { value: impact?.people_met ?? 0, label: "rencontres dans la rue" },
    { value: impact?.volunteers ?? 0, label: "bénévoles engagés" },
  ];

  return (
    <>
      {/* ---------------- OUVERTURE ---------------- */}
      <section className="hero">
        <div className="container">
          <div className="hero__grid">
            <div>
              <p className="eyebrow">Maraudes solidaires · {site.city}</p>
              <h1>Aller vers ceux que la rue rend <em>invisibles.</em></h1>
              <p className="lead">
                Chaque semaine, à la nuit tombée, nos bénévoles partent à la rencontre des personnes sans abri.
                Un repas chaud, une couverture, et surtout du temps et de l&apos;écoute.
              </p>
              <div className="btn-row">
                <Link href="/faire-un-don" className="btn btn--donate">Faire un don</Link>
                <Link href="/devenir-benevole" className="btn btn--ghost">Devenir bénévole <ArrowRight className="icon" aria-hidden="true" /></Link>
              </div>
            </div>

            <aside className="panel" aria-label="En ce moment">
              <p className="panel__title">En ce moment</p>
              {nextMaraude && (
                <div className="panel__row">
                  <p className="panel__label">Prochaine maraude</p>
                  <p className="panel__value" style={{ textTransform: "capitalize" }}>
                    {formatDate(nextMaraude.starts_at)}, {formatTime(nextMaraude.starts_at)}
                  </p>
                  {slots > 0 && (
                    <p className="panel__note">
                      {confirmed} bénévole{confirmed > 1 ? "s" : ""} sur {slots}
                      {missing > 0
                        ? <> · <strong>il manque {missing} personne{missing > 1 ? "s" : ""}</strong></>
                        : " · équipe complète"}
                    </p>
                  )}
                </div>
              )}
              <div className="panel__row">
                <p className="panel__label">Ce mois-ci</p>
                <p className="panel__value">{mealsThisMonth.toLocaleString("fr-FR")} repas distribués</p>
              </div>
              {lastReport?.temperature_c != null && (
                <div className="panel__row">
                  <p className="panel__label">Dernière sortie</p>
                  <p className="panel__value">{lastReport.temperature_c} °C, {lastReport.people_met} personnes rencontrées</p>
                </div>
              )}
            </aside>
          </div>

          <dl className="figures">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value.toLocaleString("fr-FR")}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------- AGIR ---------------- */}
      <section className="section section--tint" aria-labelledby="agir-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Comment agir</p>
              <h2 id="agir-title">Chacun peut <em>allumer</em> une lumière.</h2>
            </div>
            <p className="lead" style={{ maxWidth: "36ch", margin: 0 }}>Un don, quelques heures par mois, un sac de vêtements : tout compte.</p>
          </div>

          <ol className="columns">
            <li>
              <p className="columns__num" aria-hidden="true">i.</p>
              <h3>Donner</h3>
              <p className="aside-figure">{mealEuros}&nbsp;€</p>
              <p>financent un repas chaud. Votre don est déductible à 66&nbsp;% : 50&nbsp;€ ne vous coûtent que 17&nbsp;€.</p>
              <Link href="/faire-un-don" className="link-arrow">Faire un don <ArrowRight className="icon" aria-hidden="true" /></Link>
            </li>
            <li>
              <p className="columns__num" aria-hidden="true">ii.</p>
              <h3>Donner de son temps</h3>
              <p>Une soirée par mois suffit. On vous forme, on vous accompagne, toujours en binôme avec un bénévole expérimenté.</p>
              <Link href="/devenir-benevole" className="link-arrow">Devenir bénévole <ArrowRight className="icon" aria-hidden="true" /></Link>
            </li>
            <li>
              <p className="columns__num" aria-hidden="true">iii.</p>
              <h3>Donner en nature</h3>
              <p style={{ marginBottom: ".3em" }}>Nos besoins en ce moment :</p>
              <p className="needs">{needList.join(", ")}.</p>
              <Link href="/deposer-un-don" className="link-arrow">Où déposer vos dons <ArrowRight className="icon" aria-hidden="true" /></Link>
            </li>
          </ol>
        </div>
      </section>

      {/* ---------------- AGENDA ---------------- */}
      <section className="section" aria-labelledby="agenda-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 id="agenda-title">Prochains rendez-vous</h2>
            </div>
            <Link href="/evenements" className="link-arrow">Tout l&apos;agenda <ArrowRight className="icon" aria-hidden="true" /></Link>
          </div>
          <EventList events={(events ?? []) as AssoEvent[]} empty="Les prochains événements seront bientôt annoncés." />
        </div>
      </section>

      {/* ---------------- TÉMOIGNAGE ---------------- */}
      <section className="band-orange section" aria-label="Témoignage">
        <div className="container">
          <p className="eyebrow">Paroles de bénévole</p>
          <blockquote style={{ margin: 0 }}>
            <p className="quote">
              <span className="quote__mark">« </span>On vient pour donner un repas. On repart avec des prénoms, des histoires,
              et l&apos;envie de revenir.<span className="quote__mark"> »</span>
            </p>
            <footer className="muted">Léa, bénévole depuis 2 ans</footer>
          </blockquote>
        </div>
      </section>

      {/* ---------------- ACTUALITÉS ---------------- */}
      <section className="section" aria-labelledby="news-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Actualités</p>
              <h2 id="news-title">Des nouvelles du terrain</h2>
            </div>
            <Link href="/actualites" className="link-arrow">Toutes les actualités <ArrowRight className="icon" aria-hidden="true" /></Link>
          </div>
          <div className="post-grid">
            {(posts as Post[] | null)?.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </div>
      </section>

      {/* ---------------- APPEL FINAL ---------------- */}
      <section className="container" style={{ paddingBottom: "clamp(64px, 10vw, 128px)" }}>
        <div className="cta-band">
          <div>
            <h2>Cet hiver, <em>chaque nuit compte.</em></h2>
            <p className="lead" style={{ margin: 0 }}>
              Rejoignez {impact?.volunteers ? `les ${impact.volunteers} bénévoles` : "les bénévoles"} qui sortent chaque semaine, ou soutenez-les par un don.
            </p>
          </div>
          <div className="btn-row">
            <Link href="/faire-un-don" className="btn btn--donate">Faire un don</Link>
            <Link href="/devenir-benevole" className="btn btn--ghost">Devenir bénévole</Link>
          </div>
        </div>
      </section>
    </>
  );
}
