import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <>
      <PageHero title="Mentions légales" />
      <div className="container section prose">
      <h2>Éditeur</h2>
      <p>
        {site.name}, association loi 1901 déclarée en préfecture de [département] sous le n° RNA [W…].<br />
        Siège : {site.address}. SIRET : [si applicable]. Directeur·rice de la publication : [nom, qualité].<br />
        Contact : <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
      <h2>Hébergement</h2>
      <p>
        Site : Render Services, Inc., 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis.<br />
        Données : Supabase Inc., hébergées dans la région [Union européenne — à choisir à la création du projet].
      </p>
      <h2>Paiements</h2>
      <p>Les dons sont collectés par HelloAsso SAS, agréée par l&apos;ACPR en tant qu&apos;établissement de paiement.</p>
      <h2>Propriété intellectuelle</h2>
      <p>Les photos sont publiées avec l&apos;accord des personnes représentées. Aucune personne accompagnée n&apos;est photographiée sans son consentement écrit.</p>
      </div>
    </>
  );
}
