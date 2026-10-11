import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Accessibilité" };

export default function AccessibilityPage() {
  return (
    <>
      <PageHero title="Déclaration d’accessibilité" />
      <div className="container section prose">
      <p>{site.name} s&apos;engage à rendre son site accessible conformément au RGAA 4.1 et aux WCAG 2.2 niveau AA.</p>
      <h2>État de conformité</h2>
      <p>Le site est <strong>partiellement conforme</strong> : aucun audit externe n&apos;a encore été réalisé. [Mettre à jour après l&apos;audit.]</p>
      <h2>Ce que nous avons mis en place</h2>
      <ul>
        <li>Police très lisible (Plus Jakarta Sans) ; texte de 17 px minimum, interlignage généreux.</li>
        <li>Contrastes de couleurs ≥ 4,5:1, mode sombre automatique.</li>
        <li>Navigation complète au clavier, lien d&apos;évitement, focus toujours visible.</li>
        <li>Calendrier disponible en vue liste pour les lecteurs d&apos;écran.</li>
        <li>Animations désactivées si vous l&apos;avez demandé à votre système.</li>
        <li>Formulaires avec libellés explicites et messages d&apos;erreur annoncés.</li>
      </ul>
      <h2>Signaler un problème</h2>
      <p>Si vous ne pouvez pas accéder à un contenu, écrivez-nous à <a href={`mailto:${site.email}`}>{site.email}</a> : nous vous répondrons et vous fournirons l&apos;information sous une autre forme.</p>
      </div>
    </>
  );
}
