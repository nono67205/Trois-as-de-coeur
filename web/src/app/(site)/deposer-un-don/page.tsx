import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, Clock, MapPin, X } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Déposer un don en nature",
  description: `Où et quand déposer vos dons en nature (vêtements, duvets, hygiène, denrées) à ${site.city}.`,
};
export const revalidate = 300;

// Listes indicatives — à valider avec l'association.
const accepted = [
  "Vêtements chauds propres et en bon état : manteaux, pulls, pantalons",
  "Bonnets, gants, écharpes ; chaussettes et sous-vêtements neufs",
  "Duvets, couvertures, sacs de couchage",
  "Produits d'hygiène neufs : savon, dentifrice, brosses à dents, protections périodiques",
  "Denrées non périssables, dans leur emballage d'origine et non entamées",
  "Sacs à dos, gourdes, thermos",
];

const refused = [
  "Plats cuisinés maison et produits frais",
  "Vêtements abîmés, tachés ou d'été en hiver",
  "Médicaments, même non entamés",
  "Sous-vêtements et chaussettes déjà portés",
];

export default async function DropOffPage() {
  // Besoins du moment : agrégat de stocks, aucune donnée personnelle
  const { data: needs } = await createAdminClient().from("stock_levels").select("name").eq("is_low", true).limit(8);
  const { address, hours, details } = site.dropOff;

  return (
    <>
      <PageHero eyebrow="Dons en nature" title={<>Déposer un don <em>en nature.</em></>}
        lead={`Vêtements, duvets, produits d'hygiène : vos dons sont triés par nos bénévoles puis distribués lors des maraudes à ${site.city}.`} />

      <div className="container section">
        <div className="grid grid-2" style={{ alignItems: "start", gap: "clamp(32px, 5vw, 72px)" }}>
          <section className="card" aria-labelledby="ou-title">
            <h2 id="ou-title" style={{ fontSize: "1.7rem" }}>Où et quand déposer</h2>
            {address ? (
              <ul className="icon-list">
                <li>
                  <MapPin aria-hidden="true" />
                  <span>
                    <strong style={{ fontWeight: 500 }}>{address}</strong>
                    {details && <><br /><span className="muted">{details}</span></>}
                    <br />
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer">
                      Voir sur la carte
                    </a>
                  </span>
                </li>
                {hours.length > 0 && (
                  <li>
                    <Clock aria-hidden="true" />
                    <span>{hours.map((h) => <span key={h} style={{ display: "block" }}>{h}</span>)}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="alert alert--info">L&apos;adresse du point de dépôt sera indiquée ici très prochainement.</p>
            )}
            <p className="muted" style={{ margin: "24px 0 0", fontSize: ".95rem" }}>
              Un don important (plusieurs cartons, collecte d&apos;entreprise ou d&apos;école) ?
              Prévenez-nous avant de venir pour que l&apos;on puisse vous accueillir.
            </p>
            <p style={{ margin: "20px 0 0" }}>
              <Link href="/contact" className="link-arrow">Nous écrire <ArrowRight className="icon" aria-hidden="true" /></Link>
            </p>
          </section>

          <div>
            <section aria-labelledby="besoins-title">
              <p className="eyebrow" id="besoins-title">Nos besoins en ce moment</p>
              <p className="lead" style={{ color: "var(--ink)", marginBottom: 40 }}>
                {needs?.length ? `${needs.map((n) => n.name).join(", ")}.` : "Duvets, chaussettes neuves, kits d'hygiène."}
              </p>
            </section>

            <section aria-labelledby="oui-title">
              <h2 id="oui-title" style={{ fontSize: "1.4rem" }}>Ce que nous acceptons</h2>
              <ul className="icon-list">
                {accepted.map((a) => <li key={a}><Check aria-hidden="true" />{a}</li>)}
              </ul>
            </section>

            <section aria-labelledby="non-title" style={{ marginTop: 40 }}>
              <h2 id="non-title" style={{ fontSize: "1.4rem" }}>Ce que nous ne pouvons pas prendre</h2>
              <ul className="icon-list icon-list--muted">
                {refused.map((r) => <li key={r}><X aria-hidden="true" />{r}</li>)}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
