"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { loginWithPassword, sendMagicLink } from "./actions";

function LoginForms() {
  const next = useSearchParams().get("next") ?? "/espace-benevole";
  const [tab, setTab] = useState<"password" | "link">("password");
  const [pwState, pwAction, pwPending] = useActionState(loginWithPassword, null);
  const [linkState, linkAction, linkPending] = useActionState(sendMagicLink, null);

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <div className="tabs" role="tablist" aria-label="Mode de connexion">
        <button type="button" role="tab" aria-selected={tab === "password"} aria-controls="panel-password" onClick={() => setTab("password")}>
          Mot de passe
        </button>
        <button type="button" role="tab" aria-selected={tab === "link"} aria-controls="panel-link" onClick={() => setTab("link")}>
          Lien par email
        </button>
      </div>

      {tab === "password" ? (
        <form id="panel-password" role="tabpanel" action={pwAction} className="form">
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {pwState && !pwState.ok && <p className="alert alert--error" role="alert">{pwState.message}</p>}
          <button className="btn btn--primary btn--block" disabled={pwPending}>
            <KeyRound className="icon" aria-hidden="true" /> {pwPending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      ) : linkState?.ok ? (
        <p className="alert alert--ok" role="status">{linkState.message}</p>
      ) : (
        <form id="panel-link" role="tabpanel" action={linkAction} className="form">
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="link-email">Email</label>
            <span className="hint">Pas de mot de passe à retenir : nous vous envoyons un lien de connexion.</span>
            <input id="link-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="full_name">Nom et prénom <span className="muted">(première connexion)</span></label>
            <input id="full_name" name="full_name" autoComplete="name" />
          </div>
          {linkState && !linkState.ok && <p className="alert alert--error" role="alert">{linkState.message}</p>}
          <button className="btn btn--primary btn--block" disabled={linkPending}>
            <Mail className="icon" aria-hidden="true" /> {linkPending ? "Envoi…" : "Recevoir mon lien"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <PageHero eyebrow="Espace bénévole" title={<>Content de vous <em>revoir.</em></>}
        lead="Connectez-vous pour voir le planning des maraudes et vous inscrire." />
      <div className="container section" style={{ paddingTop: 48 }}>
        <Suspense>
          <LoginForms />
        </Suspense>
      </div>
    </>
  );
}
