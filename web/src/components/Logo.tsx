import Link from "next/link";
import { site } from "@/lib/site";

/** Signature typographique : pas de logo, le nom seul. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label={`${site.name} — accueil`}>
      <span className="logo__name">{site.name}</span>
    </Link>
  );
}
