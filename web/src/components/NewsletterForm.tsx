"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/app/(site)/actions";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  if (state?.ok) return <p role="status" style={{ color: "var(--on-night)" }}>{state.message}</p>;
  return (
    <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label htmlFor="nl-email" className="sr-only">Votre email</label>
      <input id="nl-email" name="email" type="email" autoComplete="email" placeholder="votre@email.fr" required style={{ flex: "1 1 180px" }} />
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="btn btn--donate btn--sm" disabled={pending} style={{ minHeight: 50 }}>
        {pending ? "…" : "S'inscrire"}
      </button>
      {state && !state.ok && <p role="alert" style={{ width: "100%", margin: 0 }}>{state.message}</p>}
    </form>
  );
}
