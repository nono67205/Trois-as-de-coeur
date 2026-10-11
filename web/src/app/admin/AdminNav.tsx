"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Globe, HandCoins, LayoutDashboard, Newspaper, Package, UserRound, Users } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/evenements", label: "Événements", icon: CalendarDays },
  { href: "/admin/stocks", label: "Stocks", icon: Package },
  { href: "/admin/actualites", label: "Actualités", icon: Newspaper },
  { href: "/admin/benevoles", label: "Bénévoles", icon: Users },
  { href: "/admin/dons", label: "Dons", icon: HandCoins, adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <>
      {LINKS.filter((l) => !l.adminOnly || isAdmin).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="admin-link" aria-current={active(href) ? "page" : undefined}>
          <Icon aria-hidden="true" /> {label}
        </Link>
      ))}
      <hr />
      <Link href="/espace-benevole" className="admin-link"><UserRound aria-hidden="true" /> Espace bénévole</Link>
      <Link href="/" className="admin-link"><Globe aria-hidden="true" /> Voir le site</Link>
    </>
  );
}
