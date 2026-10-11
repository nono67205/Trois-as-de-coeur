import type { Metadata } from "next";
import { Building2, Receipt, Repeat, ShieldCheck } from "lucide-react";
import { site } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { DonationSimulator } from "./DonationSimulator";

export const metadata: Metadata = {
  title: "Faire un don",
  description: "Soutenez nos maraudes. Votre don est déductible de vos impôts.",
};

const reassurance = [
  { icon: ShieldCheck, text: "Paiement sécurisé par HelloAsso, plateforme solidaire agréée" },
  { icon: Receipt, text: "Reçu fiscal envoyé automatiquement par email" },
  { icon: Repeat, text: "Don mensuel possible, résiliable à tout moment" },
  { icon: Building2, text: "Entreprises : 60 % de réduction d'impôt sur les sociétés" },
];

export default function DonatePage() {
  return (
    <>
      <PageHero eyebrow="Nous soutenir" title={<>Votre don devient un repas, <em>une nuit plus douce.</em></>}
        lead="Association 100 % bénévole : chaque euro finance directement la nourriture et le matériel distribués lors des maraudes." />

      <div className="container section">
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="stack">
            <DonationSimulator mealCost={site.mealCostEuros} />
            <ul className="icon-list" style={{ marginTop: 32 }}>
              {reassurance.map(({ icon: Icon, text }) => (
                <li key={text}><Icon aria-hidden="true" />{text}</li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {site.donationUrl ? (
              <iframe title="Formulaire de don sécurisé HelloAsso" src={`${site.donationUrl.replace(/\/$/, "")}/widget`}
                style={{ width: "100%", height: 900, border: 0, display: "block" }} loading="lazy" allow="payment" />
            ) : (
              <div style={{ padding: "clamp(24px, 3vw, 40px)", display: "grid", gap: 14, placeItems: "start" }}>
                <p className="eyebrow" style={{ margin: 0 }}>Paiement en ligne</p>
                <h2 style={{ fontSize: "1.6rem", margin: 0 }}>Formulaire de don sécurisé</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Le formulaire HelloAsso s&apos;affichera ici dès que l&apos;association aura créé sa page de don
                  (variable <code>NEXT_PUBLIC_HELLOASSO_DONATION_URL</code>).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
