"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { nav } from "@/lib/site";
import { Logo } from "./Logo";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="urgent" role="note">
        <div className="container">
          <span>Une personne en détresse dans la rue ?</span>
          <a href="tel:115"><Phone className="icon" aria-hidden="true" /> Appelez le 115, gratuit 24h/24</a>
        </div>
      </div>
      <header className="site-header">
        <div className="site-header__bar">
          <Logo />
          <nav id="main-nav" className="nav" aria-label="Navigation principale" data-open={open}>
            {nav.map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-cta">
            <Link href="/espace-benevole" className="btn btn--ghost btn--sm">Espace bénévole</Link>
            <Link href="/faire-un-don" className="btn btn--donate btn--sm">
              Faire un don
            </Link>
            <button type="button" className="btn btn--ghost btn--sm menu-toggle" aria-expanded={open} aria-controls="main-nav"
              onClick={() => setOpen((o) => !o)}>
              {open ? <X className="icon" aria-hidden="true" /> : <Menu className="icon" aria-hidden="true" />}
              <span className="sr-only">Menu</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
