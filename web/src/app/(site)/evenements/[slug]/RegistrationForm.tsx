"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerToEvent } from "../../actions";

export function RegistrationForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(registerToEvent, null);

  if (state?.ok) return <p className="alert alert--ok" role="status">{state.message}</p>;

  return (
    <form action={action} className="form" noValidate={false}>
      <input type="hidden" name="event_id" value={eventId} />
      <div className="field">
        <label htmlFor="full_name">Nom et prénom</label>
        <input id="full_name" name="full_name" autoComplete="name" required minLength={2} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <span className="hint" id="email-hint">Pour vous envoyer la confirmation et un rappel la veille.</span>
        <input id="email" name="email" type="email" autoComplete="email" required aria-describedby="email-hint" />
      </div>
      <div className="field">
        <label htmlFor="phone">Téléphone <span className="muted">(facultatif)</span></label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="field">
        <label htmlFor="seats">Nombre de personnes</label>
        <select id="seats" name="seats" defaultValue="1">
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="checkbox">
        <input id="gdpr_consent" name="gdpr_consent" type="checkbox" required />
        <label htmlFor="gdpr_consent">
          J&apos;accepte que mes données soient utilisées pour gérer mon inscription
          (<Link href="/confidentialite">en savoir plus</Link>).
        </label>
      </div>
      <div className="checkbox">
        <input id="newsletter_optin" name="newsletter_optin" type="checkbox" />
        <label htmlFor="newsletter_optin">Je souhaite recevoir les nouvelles de l&apos;association.</label>
      </div>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state && !state.ok && <p className="alert alert--error" role="alert">{state.message}</p>}
      <button className="btn btn--primary" disabled={pending}>{pending ? "Inscription…" : "Confirmer mon inscription"}</button>
    </form>
  );
}
