# Guide de mise en ligne — Supabase + Render

Durée estimée : 45 min. À faire dans cet ordre.

## 0. Prérequis

- Un compte GitHub. Render déploie depuis un dépôt Git.
- Node.js ≥ 20.9 (installé : v24).
- Optionnel : la CLI Supabase (`npm i -g supabase`) pour pousser les migrations en ligne de commande.

## 1. Supabase (base de données, authentification, stockage)

1. Sur https://supabase.com, créer un projet avec la **région `eu-central-1` (Francfort)** ou `eu-west-3` (Paris), pour respecter le RGPD.
2. **SQL Editor** : coller puis exécuter `supabase/migrations/20261005000000_init.sql`.
   Avec la CLI : `supabase link --project-ref <ref>` puis `supabase db push`.
3. (Facultatif, uniquement en test) exécuter `supabase/seed.sql` pour charger des données de démonstration.
4. **Authentication > Providers > Email** : activer, garder « Confirm email ».
5. **Authentication > URL Configuration** :
   - Site URL : `https://<domaine>`
   - Redirect URLs : `https://<domaine>/auth/callback` et `http://localhost:3000/auth/callback`
6. **Authentication > Emails > SMTP** : brancher un SMTP (Brevo gratuit jusqu'à 300 mails/jour, ou Resend). Le SMTP intégré de Supabase est limité à quelques mails par heure, ce qui est insuffisant en production.
7. Personnaliser en français le modèle d'email « Magic Link ».
8. **Project Settings > API** : récupérer `URL`, `anon key` et `service_role key`.
9. Premier admin : se connecter une fois sur le site, puis dans le SQL Editor :
   ```sql
   update profiles set role = 'admin' where id = (select id from auth.users where email = 'ton@email.fr');
   ```

## 2. HelloAsso (dons)

1. Créer ou valider le compte de l'association sur https://admin.helloasso.com. Il faut le RNA, le RIB et une pièce d'identité du représentant légal.
2. Créer un **formulaire de don** : montants suggérés, don mensuel activé, reçu fiscal activé.
3. Copier l'URL publique du formulaire et la placer dans `NEXT_PUBLIC_HELLOASSO_DONATION_URL`.
4. **Mon compte > Intégrations et API** : créer les identifiants API (`client_id`, `client_secret`).
5. Une fois Render déployé, déclarer l'URL de notification :
   `https://<domaine>/api/helloasso/webhook?token=<HELLOASSO_WEBHOOK_TOKEN>`

## 3. Render (hébergement du site)

1. Pousser ce dossier sur GitHub. Le dossier `web/.env.local` est ignoré par git : vérifier qu'il n'est pas versionné.
2. Sur Render, aller dans **New > Blueprint**, choisir le dépôt. `render.yaml` crée le service.
3. Renseigner les variables marquées `sync: false` (valeurs Supabase et HelloAsso).
4. Après le premier déploiement, vérifier que `https://<service>.onrender.com/api/health` renvoie `{"status":"ok"}`.
5. **Settings > Custom Domains** : ajouter le domaine (ex. `www.nom-asso.fr`) et créer l'enregistrement CNAME chez le registrar. Le certificat HTTPS est automatique.
6. Mettre à jour `NEXT_PUBLIC_SITE_URL` et les URLs de redirection dans Supabase.

## 4. Vérifications après mise en ligne

- [ ] Inscription à un événement public, puis vérifier la ligne dans `event_registrations`
- [ ] Connexion bénévole par lien magique
- [ ] Inscription à une maraude depuis l'espace bénévole
- [ ] Don test de 1 € sur HelloAsso, puis vérifier la ligne dans `donations` et la page `/admin/dons`
- [ ] Création d'un événement, puis saisie d'un compte-rendu avec déduction des stocks
- [ ] Abonnement au calendrier `/api/calendar` dans Google Agenda
- [ ] Audit Lighthouse ≥ 95 en accessibilité et en performance
- [ ] Test au lecteur d'écran (NVDA sous Windows, VoiceOver sur iPhone)
