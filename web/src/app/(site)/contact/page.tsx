import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title={<>Écrivez-nous, <em>on répond.</em></>}
        lead="Bénévolat, don en nature, partenariat, presse : réponse sous 72 h." />
      <div className="container section">
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="stack">
            <div className="note">
              <h2>Une urgence ?</h2>
              <p style={{ margin: 0 }} className="muted">
                Nous ne sommes pas un service d&apos;urgence. Si une personne est en danger, appelez
                le <a href="tel:115"><strong>115</strong></a> (Samu social) ou le <a href="tel:15"><strong>15</strong></a>.
              </p>
            </div>
            <ul className="icon-list" style={{ marginTop: 40 }}>
              <li><Mail aria-hidden="true" /><a href={`mailto:${site.email}`}>{site.email}</a></li>
              <li><Phone aria-hidden="true" /><span className="muted">Téléphone : à compléter</span></li>
            </ul>
          </div>
          <ContactForm />
        </div>
      </div>
    </>
  );
}
