import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Politique de confidentialité" />
      <div className="container section prose">
      <p>Nous collectons le strict minimum de données, uniquement pour faire fonctionner l&apos;association.</p>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Données traitées</caption>
          <thead><tr><th>Données</th><th>Finalité</th><th>Base légale</th><th>Durée</th></tr></thead>
          <tbody>
            <tr><td>Nom, email, téléphone (inscriptions)</td><td>Gestion des événements</td><td>Consentement</td><td>12 mois après l&apos;événement</td></tr>
            <tr><td>Profil bénévole</td><td>Organisation des maraudes</td><td>Intérêt légitime</td><td>Durée de l&apos;engagement + 2 ans</td></tr>
            <tr><td>Données donateurs</td><td>Reçus fiscaux, comptabilité</td><td>Obligation légale</td><td>6 ans</td></tr>
            <tr><td>Email newsletter</td><td>Envoi d&apos;informations</td><td>Consentement</td><td>Jusqu&apos;à désinscription</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Personnes rencontrées en maraude</h2>
      <p>Nous ne collectons <strong>aucune donnée personnelle</strong> sur les personnes rencontrées : seules des statistiques anonymes (nombre de repas, de rencontres…) sont enregistrées.</p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, opposition : écrivez à <a href={`mailto:${site.email}`}>{site.email}</a>. Vous pouvez aussi saisir la CNIL.</p>
      <h2>Cookies</h2>
      <p>Ce site n&apos;utilise que des cookies techniques (session de connexion). Aucune publicité, aucun traceur tiers : pas de bandeau cookies nécessaire.</p>
      </div>
    </>
  );
}
