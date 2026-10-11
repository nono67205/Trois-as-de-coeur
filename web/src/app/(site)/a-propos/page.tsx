import Link from "next/link";
import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Qui sommes-nous" };

// Contenu à rédiger avec le bureau de l'association (voir docs/02-questions.md, section « Identité »).
export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Qui sommes-nous" title={site.name} />
      <div className="container section prose">
      <p className="lead">[Histoire de l&apos;association : date de création, fondateurs, déclic.]</p>

      <h2>Notre mission</h2>
      <p>[Aller vers les personnes sans abri, rompre l&apos;isolement, répondre aux besoins de première nécessité, orienter vers les structures adaptées.]</p>

      <h2>Nos valeurs</h2>
      <ul>
        <li><strong>Dignité</strong> — chaque rencontre se fait d&apos;égal à égal.</li>
        <li><strong>Inconditionnalité</strong> — nous allons vers tous, sans jugement.</li>
        <li><strong>Transparence</strong> — nous rendons compte de l&apos;usage de chaque don.</li>
      </ul>

      <h2>Transparence financière</h2>
      <p>[Rapport d&apos;activité et comptes annuels téléchargeables, répartition des dépenses.]</p>

      <h2>Le bureau</h2>
      <p>[Président·e, trésorier·e, secrétaire — photos facultatives.]</p>

      <h2>Nos partenaires</h2>
      <p>[Mairie, banque alimentaire, commerces, entreprises mécènes…]</p>

      <p><Link href="/devenir-benevole" className="btn btn--primary">Nous rejoindre</Link></p>
      </div>
    </>
  );
}
