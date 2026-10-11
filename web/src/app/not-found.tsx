import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" tabIndex={-1} className="container section">
        <p className="eyebrow">Erreur 404</p>
        <h1>Page introuvable</h1>
        <p className="lead">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="btn btn--primary">Retour à l&apos;accueil</Link>
      </main>
      <SiteFooter />
    </>
  );
}
