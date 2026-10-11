import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatEuros, formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDonations() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("donations").select("*").order("paid_at", { ascending: false }).limit(200);
  const donations = data ?? [];
  const year = new Date().getFullYear();
  const thisYear = donations.filter((d) => new Date(d.paid_at).getFullYear() === year);
  const total = thisYear.reduce((s, d) => s + d.amount_cents, 0);
  const donors = new Set(thisYear.map((d) => d.donor_email)).size;
  const recurring = thisYear.filter((d) => d.is_recurring).length;

  return (
    <>
      <h1>Dons</h1>
      <p className="muted">Synchronisés automatiquement depuis HelloAsso. Les reçus fiscaux sont émis par HelloAsso.</p>
      <dl className="grid grid-3" style={{ marginTop: 24 }}>
        <div className="card"><dt className="stat__label">Collecté en {year}</dt><dd className="stat__value" style={{ margin: 0 }}>{formatEuros(total)}</dd></div>
        <div className="card"><dt className="stat__label">Donateurs uniques</dt><dd className="stat__value" style={{ margin: 0 }}>{donors}</dd></div>
        <div className="card"><dt className="stat__label">Paiements mensuels</dt><dd className="stat__value" style={{ margin: 0 }}>{recurring}</dd></div>
      </dl>
      <div className="table-wrap" style={{ marginTop: 32 }}>
        <table>
          <thead><tr><th>Date</th><th>Donateur</th><th>Montant</th><th>Type</th></tr></thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id}>
                <td>{formatShortDate(d.paid_at)}</td>
                <td>{[d.donor_first_name, d.donor_last_name].filter(Boolean).join(" ") || "Anonyme"}<br /><span className="muted">{d.donor_email}</span></td>
                <td><strong>{formatEuros(d.amount_cents)}</strong></td>
                <td>{d.is_recurring ? "Mensuel" : "Ponctuel"}{d.is_company && " · Entreprise"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
