import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Administration">
        <Logo href="/admin" />
        <AdminNav isAdmin={profile.role === "admin"} />
        <p className="admin-nav__user">
          <strong>{profile.full_name}</strong>
          {ROLE_LABELS[profile.role]}
        </p>
      </nav>
      <main id="contenu" className="admin-main" tabIndex={-1}>{children}</main>
    </div>
  );
}
