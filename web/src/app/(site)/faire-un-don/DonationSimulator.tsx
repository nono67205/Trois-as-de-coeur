"use client";

import { useState } from "react";

const PRESETS = [20, 50, 100, 200];

/** Simulateur : coût réel après réduction d'impôt + traduction en impact concret. */
export function DonationSimulator({ mealCost }: { mealCost: number }) {
  const [amount, setAmount] = useState(50);
  const realCost = Math.round(amount * 0.34 * 100) / 100;
  const meals = Math.floor(amount / mealCost);
  const eur = (n: number) => {
    const digits = n % 1 ? 2 : 0;
    return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits });
  };

  return (
    <section className="card" aria-labelledby="sim-title">
      <h2 id="sim-title" style={{ fontSize: "1.6rem" }}>Simulez votre don</h2>
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
        <legend className="sr-only">Montant suggéré</legend>
        <div className="amounts">
          {PRESETS.map((p) => (
            <button key={p} type="button" aria-pressed={amount === p} className="btn btn--ghost btn--sm" onClick={() => setAmount(p)}>
              {p} €
            </button>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="custom-amount">Autre montant (€)</label>
        <input id="custom-amount" type="number" min={1} inputMode="numeric" value={amount || ""}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
      </div>
      <div className="sim-result" aria-live="polite">
        <div>
          <p className="sim-result__label">Coût réel après impôt</p>
          <p className="sim-result__value sim-result__value--accent">{eur(realCost)}</p>
        </div>
        <div>
          <p className="sim-result__label">Soit environ</p>
          <p className="sim-result__value">{meals} repas</p>
        </div>
      </div>
      <p className="muted" style={{ margin: "20px 0 0", fontSize: ".88rem" }}>Réduction d&apos;impôt sur le revenu de 66 % du montant donné, dans la limite de 20 % du revenu imposable.</p>
    </section>
  );
}
