import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatEuros, formatNumber, formatTime } from "@/lib/format";
import type { AssoEvent, StockLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const sixMonthsAgo = new Date(Date.now() - 183 * 864e5).toISOString();

  const [reports, volunteers, lowStock, upcoming, fill, donations, messages] = await Promise.all([
    supabase.from("maraude_reports").select("people_met, meals_given, hygiene_kits, referrals_115, events!inner(starts_at)")
      .gte("events.starts_at", sixMonthsAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("stock_levels").select("*").eq("is_low", true).order("quantity"),
    supabase.from("events").select("*").eq("status", "published").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("event_fill").select("*"),
    supabase.from("donations").select("amount_cents, is_recurring").gte("paid_at", yearStart), // vide si non-admin (RLS)
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
  ]);

  type Row = { people_met: number; meals_given: number; hygiene_kits: number; referrals_115: number; events: { starts_at: string } };
  const rows = (reports.data ?? []) as unknown as Row[];
  const sum = (k: keyof Omit<Row, "events">) => rows.reduce((s, r) => s + r[k], 0);

  // Repas distribués par mois (6 derniers mois)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i);
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("fr-FR", { month: "short" }), value: 0 };
  });
  for (const r of rows) {
    const m = months.find((x) => x.key === r.events.starts_at.slice(0, 7));
    if (m) m.value += r.meals_given;
  }
  const maxMeals = Math.max(1, ...months.map((m) => m.value));

  const donationTotal = (donations.data ?? []).reduce((s, d) => s + d.amount_cents, 0);
  const recurring = (donations.data ?? []).filter((d) => d.is_recurring).length;
  const fillMap = new Map((fill.data ?? []).map((f) => [f.event_id, Number(f.volunteers_confirmed)]));

  const kpis = [
    { label: "Personnes rencontrées (6 mois)", value: formatNumber(sum("people_met")) },
    { label: "Repas distribués (6 mois)", value: formatNumber(sum("meals_given")) },
    { label: "Kits hygiène (6 mois)", value: formatNumber(sum("hygiene_kits")) },
    { label: "Orientations 115 / structures", value: formatNumber(sum("referrals_115")) },
    { label: "Bénévoles actifs", value: formatNumber(volunteers.count ?? 0) },
    ...(donations.data?.length ? [{ label: `Dons ${new Date().getFullYear()} (${recurring} mensuels)`, value: formatEuros(donationTotal) }] : []),
  ];

  return (
    <>
      <h1>Tableau de bord</h1>
      {(messages.count ?? 0) > 0 && (
        <p className="alert alert--ok">{messages.count} message(s) de contact non traité(s).</p>
      )}

      <dl className="grid grid-3" style={{ marginTop: 24 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card">
            <dt className="stat__label" style={{ marginTop: 0 }}>{k.label}</dt>
            <dd className="stat__value" style={{ margin: "8px 0 0" }}>{k.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-2" style={{ marginTop: 32, alignItems: "start" }}>
        <section className="card" aria-labelledby="meals-chart">
          <h2 id="meals-chart" style={{ fontSize: "1.2rem" }}>Repas distribués par mois</h2>
          <table>
            <caption className="sr-only">Repas distribués par mois sur les 6 derniers mois</caption>
            <tbody>
              {months.map((m) => (
                <tr key={m.key}>
                  <th scope="row" style={{ background: "none", width: 60 }}>{m.label}</th>
                  <td style={{ width: "100%" }}>
                    <div className="bar" aria-hidden="true"><span style={{ width: `${(m.value / maxMeals) * 100}%` }} /></div>
                  </td>
                  <td style={{ textAlign: "right" }}>{formatNumber(m.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card" aria-labelledby="low-stock">
          <h2 id="low-stock" style={{ fontSize: "1.2rem" }}>Stocks à réapprovisionner</h2>
          {(lowStock.data as StockLevel[] | null)?.length ? (
            <ul className="stack" style={{ paddingLeft: 18 }}>
              {(lowStock.data as StockLevel[]).map((s) => (
                <li key={s.id}><strong>{s.name}</strong> : {formatNumber(s.quantity)} {s.unit} (seuil {s.min_threshold})</li>
              ))}
            </ul>
          ) : <p className="muted">Tous les stocks sont au-dessus du seuil.</p>}
          <Link href="/admin/stocks">Gérer les stocks</Link>
        </section>
      </div>

      <section style={{ marginTop: 32 }} aria-labelledby="next-events">
        <h2 id="next-events" style={{ fontSize: "1.3rem" }}>Prochains événements</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Événement</th><th>Date</th><th>Bénévoles</th></tr></thead>
            <tbody>
              {(upcoming.data as AssoEvent[] | null)?.map((e) => {
                const n = fillMap.get(e.id) ?? 0;
                const short = e.volunteer_slots != null && n < e.volunteer_slots;
                return (
                  <tr key={e.id}>
                    <td><Link href={`/admin/evenements/${e.id}`}>{e.title}</Link></td>
                    <td>{formatDate(e.starts_at)} {formatTime(e.starts_at)}</td>
                    <td>
                      {n}{e.volunteer_slots != null && ` / ${e.volunteer_slots}`}{" "}
                      {short && <span className="badge badge--warn">manque {e.volunteer_slots! - n}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
