import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 18, maxWidth: "32ch" }}>{site.tagline}</p>
          </div>
          <nav aria-label="Agir">
            <h2>Agir</h2>
            <ul>
              <li><Link href="/faire-un-don">Faire un don</Link></li>
              <li><Link href="/devenir-benevole">Devenir bénévole</Link></li>
              <li><Link href="/evenements">Agenda</Link></li>
              <li><Link href="/deposer-un-don">Déposer un don en nature</Link></li>
              <li><Link href="/contact">Partenariat, mécénat</Link></li>
            </ul>
          </nav>
          <nav aria-label="Informations">
            <h2>L&apos;association</h2>
            <ul>
              <li><Link href="/a-propos">Qui sommes-nous</Link></li>
              <li><Link href="/actualites">Actualités</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/espace-benevole">Espace bénévole</Link></li>
            </ul>
          </nav>
          <div>
            <h2>Lettre d&apos;information</h2>
            <p style={{ fontSize: ".95rem" }}>Une fois par mois, nos actions et nos besoins. Rien d&apos;autre.</p>
            <NewsletterForm />
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} {site.name} · Association loi 1901 · Dons déductibles de l&apos;impôt</span>
          <span style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/accessibilite">Accessibilité : partiellement conforme</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
