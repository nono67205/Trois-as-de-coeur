# Site de l'association de maraudes

Site public, espace bénévole et back-office d'une association de maraudes auprès des personnes sans abri.

**Stack** : Next.js 15 (React 19, TypeScript) · Supabase (PostgreSQL, Auth, Storage) · HelloAsso (dons) · Render (hébergement)

## Arborescence

```
.
├── docs/
│   ├── 01-cahier-des-charges.md   Objectifs, benchmark, architecture, feuille de route
│   ├── 02-questions.md            Questions à trancher avant la mise en ligne
│   └── 03-deploiement.md          Pas-à-pas Supabase + HelloAsso + Render
├── supabase/
│   ├── migrations/                Schéma SQL complet + sécurité RLS → à pousser sur Supabase
│   └── seed.sql                   Données de démo (dev uniquement)
├── render.yaml                    Blueprint Render → à connecter à Render
└── web/                           Application Next.js
    ├── .env.example               Variables d'environnement à renseigner
    └── src/
        ├── app/
        │   ├── (site)/            Pages publiques : accueil, actualités, agenda, don, bénévolat, contact, légal
        │   ├── espace-benevole/   Calendrier et inscriptions bénévoles, profil
        │   ├── admin/             Tableau de bord, stocks, événements, actualités, bénévoles, dons
        │   ├── api/               Webhook HelloAsso, flux .ics, healthcheck
        │   └── auth/callback/     Retour du lien magique Supabase
        ├── components/            En-tête, pied de page, calendrier, cartes
        └── lib/                   Clients Supabase, auth, formatage, config du site
```

## Lancer en local

```bash
cd web
cp .env.example .env.local   # puis renseigner les clés Supabase
npm install
npm run dev                   # http://localhost:3000
```

### Mode démo (sans Supabase)

`DEMO_MODE=true` dans `web/.env.local` remplace Supabase par une base fictive locale (`web/.demo/db.json`, supprimer ce fichier pour réinitialiser).
Trois comptes de test (admin, coordinateur, bénévole) sont définis par les variables `DEMO_*` du même fichier.
Pour passer en réel : renseigner les clés Supabase, mettre `DEMO_MODE=false`, puis `node --env-file=.env.local scripts/create-test-users.mjs` si besoin de comptes de test.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:types` | Génère les types depuis Supabase (après `supabase link`) |

## Mise en ligne

Voir [docs/03-deploiement.md](docs/03-deploiement.md).
