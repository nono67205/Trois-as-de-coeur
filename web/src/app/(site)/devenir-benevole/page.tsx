import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "Devenir bénévole" };

const steps = [
  { title: "Créez votre espace", text: "Un email suffit. Renseignez vos disponibilités et vos compétences." },
  { title: "Venez à une soirée découverte", text: "Rencontrez l'équipe, découvrez notre charte et les règles de sécurité." },
  { title: "Première maraude", text: "Toujours en binôme avec un bénévole expérimenté. Vous choisissez vos dates." },
];

const roles = [
  { title: "Maraudeur·se", text: "Aller à la rencontre, distribuer, écouter. Une soirée par mois minimum." },
  { title: "Cuisine & préparation", text: "Préparer les repas et les kits avant les maraudes." },
  { title: "Chauffeur·se", text: "Permis B requis. Transporter l'équipe et le matériel." },
  { title: "Logistique & stocks", text: "Trier les dons, tenir l'inventaire, organiser les collectes." },
  { title: "Communication", text: "Photos, réseaux sociaux, rédaction des actualités." },
  { title: "Compétences pro", text: "Juridique, santé, comptabilité, numérique : du bénévolat de compétences." },
];

const roman = ["i.", "ii.", "iii."];

export default function VolunteerPage() {
  return (
    <>
      <PageHero eyebrow="S'engager" title={<>Quelques heures par mois, <em>un vrai impact.</em></>}
        lead="Aucune expérience requise. Vous êtes formé·e, accompagné·e, et vous choisissez vos créneaux dans le calendrier.">
        <Link href="/connexion?next=/espace-benevole" className="btn btn--donate">Créer mon espace bénévole <ArrowRight className="icon" aria-hidden="true" /></Link>
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Comment ça <em>marche</em></h2></div>
          <ol className="columns">
            {steps.map((s, i) => (
              <li key={s.title}>
                <p className="columns__num" aria-hidden="true">{roman[i]}</p>
                <h3>{s.title}</h3>
                <p style={{ margin: 0 }}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <div className="section-head">
            <h2>Trouvez <em>votre</em> mission</h2>
            <p className="lead" style={{ margin: 0, maxWidth: "40ch" }}>Chaque talent a sa place, sur le terrain comme en coulisses.</p>
          </div>
          <ul className="columns columns--grid">
            {roles.map(({ title, text }) => (
              <li key={title}>
                <h3>{title}</h3>
                <p style={{ margin: 0 }}>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
