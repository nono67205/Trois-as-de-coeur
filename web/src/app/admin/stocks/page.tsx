import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatShortDate } from "@/lib/format";
import type { StockLevel } from "@/lib/types";
import { addStockMovement, createStockItem } from "../actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["alimentaire", "boisson", "hygiene", "vetements", "couchage", "materiel", "autre"];
const REASONS = [
  { value: "don_recu", label: "Don reçu" }, { value: "achat", label: "Achat" },
  { value: "distribution", label: "Distribution" }, { value: "perime", label: "Périmé" },
  { value: "perte", label: "Perte" }, { value: "ajustement", label: "Ajustement d'inventaire" },
];

export default async function StocksPage() {
  const supabase = await createClient();
  const [{ data }, { data: history }] = await Promise.all([
    supabase.from("stock_levels").select("*").order("category").order("name"),
    supabase.from("stock_movements").select("id, delta, reason, created_at, note, stock_items(name, unit)")
      .order("created_at", { ascending: false }).limit(20),
  ]);
  const items = (data ?? []) as StockLevel[];
  const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  return (
    <>
      <h1>Stocks et inventaire</h1>

      <div className="table-wrap" style={{ marginTop: 24 }}>
        <table>
          <caption className="sr-only">Niveau des stocks</caption>
          <thead><tr><th>Article</th><th>Catégorie</th><th>Quantité</th><th>Seuil</th><th>Prochaine DLC</th><th>Emplacement</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td><strong>{i.name}</strong></td>
                <td>{i.category}</td>
                <td>
                  {formatNumber(i.quantity)} {i.unit}{" "}
                  {i.is_low && <span className="badge badge--danger">stock bas</span>}
                </td>
                <td>{i.min_threshold}</td>
                <td>
                  {i.next_expiry ? formatShortDate(i.next_expiry) : "—"}{" "}
                  {i.next_expiry && i.next_expiry <= soon && <span className="badge badge--warn">bientôt</span>}
                </td>
                <td>{i.location ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-2" style={{ marginTop: 32, alignItems: "start" }}>
        <section className="card" aria-labelledby="mvt">
          <h2 id="mvt" style={{ fontSize: "1.2rem" }}>Entrée / sortie de stock</h2>
          <form action={addStockMovement} className="form">
            <div className="field">
              <label htmlFor="m-item">Article</label>
              <select id="m-item" name="item_id" required>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </div>
            <fieldset className="field" style={{ border: 0, padding: 0 }}>
              <legend>Sens</legend>
              <div className="btn-row">
                <label className="checkbox"><input type="radio" name="direction" value="in" defaultChecked /> Entrée</label>
                <label className="checkbox"><input type="radio" name="direction" value="out" /> Sortie</label>
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="m-qty">Quantité</label>
              <input id="m-qty" name="quantity" type="number" min="0.01" step="any" required inputMode="decimal" />
            </div>
            <div className="field">
              <label htmlFor="m-reason">Motif</label>
              <select id="m-reason" name="reason">{REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
            </div>
            <div className="field">
              <label htmlFor="m-exp">Date limite (DLC/DDM) <span className="muted">(entrées alimentaires)</span></label>
              <input id="m-exp" name="expires_on" type="date" />
            </div>
            <div className="field">
              <label htmlFor="m-note">Note</label>
              <input id="m-note" name="note" placeholder="ex. don de la boulangerie X" />
            </div>
            <button className="btn btn--primary">Enregistrer le mouvement</button>
          </form>
        </section>

        <section className="card" aria-labelledby="new-item">
          <h2 id="new-item" style={{ fontSize: "1.2rem" }}>Nouvel article</h2>
          <form action={createStockItem} className="form">
            <div className="field"><label htmlFor="i-name">Nom</label><input id="i-name" name="name" required /></div>
            <div className="field">
              <label htmlFor="i-cat">Catégorie</label>
              <select id="i-cat" name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="i-unit">Unité</label><input id="i-unit" name="unit" defaultValue="unité" required /></div>
            <div className="field"><label htmlFor="i-min">Seuil d&apos;alerte</label><input id="i-min" name="min_threshold" type="number" min="0" defaultValue="0" /></div>
            <div className="field"><label htmlFor="i-loc">Emplacement</label><input id="i-loc" name="location" /></div>
            <button className="btn btn--primary">Ajouter</button>
          </form>
        </section>
      </div>

      <section style={{ marginTop: 32 }} aria-labelledby="hist">
        <h2 id="hist" style={{ fontSize: "1.2rem" }}>Derniers mouvements</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Article</th><th>Quantité</th><th>Motif</th><th>Note</th></tr></thead>
            <tbody>
              {(history ?? []).map((h) => {
                const item = h.stock_items as unknown as { name: string; unit: string } | null;
                return (
                  <tr key={h.id}>
                    <td>{formatShortDate(h.created_at)}</td>
                    <td>{item?.name}</td>
                    <td style={{ color: h.delta < 0 ? "var(--danger)" : "var(--ok)", fontWeight: 700 }}>
                      {h.delta > 0 ? "+" : ""}{formatNumber(h.delta)} {item?.unit}
                    </td>
                    <td>{REASONS.find((r) => r.value === h.reason)?.label}</td>
                    <td>{h.note}</td>
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
