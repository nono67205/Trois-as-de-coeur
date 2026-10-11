"use client";

import { useActionState } from "react";
import { sendContact } from "../actions";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, null);
  if (state?.ok) return <p className="alert alert--ok" role="status">{state.message}</p>;

  return (
    <form action={action} className="form card">
      <div className="field">
        <label htmlFor="c-name">Nom et prénom</label>
        <input id="c-name" name="full_name" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="c-subject">Objet</label>
        <select id="c-subject" name="subject" defaultValue="benevolat">
          <option value="benevolat">Bénévolat</option>
          <option value="don_nature">Don en nature</option>
          <option value="partenariat">Partenariat / mécénat</option>
          <option value="signalement">Signaler une situation</option>
          <option value="presse">Presse</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="c-message">Message</label>
        <textarea id="c-message" name="message" rows={6} required minLength={10} maxLength={5000} />
      </div>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state && !state.ok && <p className="alert alert--error" role="alert">{state.message}</p>}
      <button className="btn btn--primary" disabled={pending}>{pending ? "Envoi…" : "Envoyer"}</button>
    </form>
  );
}
