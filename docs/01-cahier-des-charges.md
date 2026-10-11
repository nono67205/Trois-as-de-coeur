# Cahier des charges : site de l'association de maraudes

> Version 0.1 du 5 octobre 2026. Document de travail, à compléter avec les réponses de `02-questions.md`.

## 1. Objectifs

| # | Besoin exprimé | Ce que le site fait |
|---|---|---|
| 1 | Centraliser les news | Blog « Actualités » géré depuis l'admin (Markdown, image, brouillon/publié), dernières actus sur l'accueil, newsletter |
| 2 | Inscription du public aux événements | Agenda public (liste + calendrier mensuel + flux `.ics`), inscription **sans compte** en 30 s, jauge de places |
| 3 | Dons financiers | Page don avec simulateur fiscal et d'impact, formulaire HelloAsso intégré, synchronisation automatique des dons par webhook |
| 4 | Admin : statistiques | Tableau de bord : personnes rencontrées, repas, kits, orientations 115, bénévoles actifs, dons, tendances sur 6 mois |
| 5 | Admin : stocks | Inventaire par mouvements (entrées/sorties tracées), seuils d'alerte, dates limites (DLC), historique |
| 6 | Admin : organiser les événements | Création, publication, répétition hebdomadaire, annulation, compte-rendu de maraude |
| 7 | Calendrier bénévoles | Espace bénévole : calendrier, inscription aux créneaux, jauge, liste d'attente automatique, point de RDV révélé aux inscrits |

## 2. Benchmark : ce que font les associations les plus avancées

| Organisation | Ce qu'elle fait très bien | Ce qu'on en reprend |
|---|---|---|
| **charity: water** | Transparence radicale : chaque don est relié à un projet concret, preuves photo, don mensuel mis en avant | Compteurs d'impact en temps réel sur l'accueil, conversion « 2,50 € = 1 repas », don mensuel |
| **Croix-Rouge française** | Parcours en 3 portes : *Je donne / Je m'engage / Je me forme* | Accueil construit sur 3 façons d'agir : donner, donner du temps, donner en nature |
| **Médecins Sans Frontières** | Page de don optimisée : montants suggérés, coût réel après impôt affiché | Simulateur « votre don de 50 € ne vous coûte que 17 € » |
| **Entourage** (réseau solidaire SDF) | Ton bienveillant, guide « Simple comme bonjour », sensibilisation des riverains | Bandeau 115 permanent, page de sensibilisation (V1.1) |
| **Utopia 56** | Planning bénévole en ligne, missions claires, onboarding rapide | Missions détaillées, parcours bénévole en 3 étapes, charte à signer |
| **Restos du Cœur** | Besoins du moment et collectes très visibles | Page « Besoins du moment » générée automatiquement depuis les stocks bas (V1.1) |
| **Le Carillon** | Carte des lieux solidaires utiles aux personnes à la rue | « Guide de la rue » : douches, accueils de jour, distributions (V2) |
| **World Relief / Ford Foundation** | Design éditorial sobre, grandes photos, typographie forte, signaux de confiance | Typographie serif éditoriale (Fraunces), palette chaude, beaucoup d'espace |

### Principes de design retenus

- **Élégant et sobre** : fond crème, vert sapin pour la confiance, terracotta pour l'action (dons). Typographie éditoriale pour les titres.
- **Accessibilité d'abord**, objectif WCAG 2.2 AA / RGAA 4.1 :
  - police **Atkinson Hyperlegible**, créée par le Braille Institute pour les personnes malvoyantes ;
  - corps de texte à 17 px, contrastes ≥ 4,5:1 vérifiés, mode sombre automatique ;
  - navigation complète au clavier, lien d'évitement, focus toujours visible, cibles tactiles ≥ 44 px ;
  - calendrier doublé d'une vue liste, pour les lecteurs d'écran et le mobile ;
  - animations coupées si l'utilisateur l'a demandé (`prefers-reduced-motion`) ;
  - page de déclaration d'accessibilité (obligation RGAA).
- **Mobile d'abord** : la plupart des bénévoles consultent le planning sur téléphone, souvent le soir sur le terrain.
- **Zéro traceur tiers** : donc pas de bandeau cookies, ce qui renforce la confiance.

## 3. Architecture

```
Navigateur ──► Render (Next.js 15 : site public + espace bénévole + admin + API)
                  │
                  ├──► Supabase : PostgreSQL (RLS), Auth (lien magique), Storage (images)
                  └──◄ HelloAsso : notifications de paiement (webhook) → table donations
```

- **Un seul service Render** : plus simple et moins cher.
- **Sécurité par Row Level Security** : même en cas de bug applicatif, un bénévole ne peut ni lire les dons ni modifier un rôle.
- **Rôles** : `volunteer` (bénévole), `coordinator` (organise événements et stocks), `admin` (tout, y compris les dons et les rôles).
- **Aucune donnée personnelle sur les personnes aidées** : statistiques anonymes uniquement.

## 4. Modèle de données

| Table | Rôle |
|---|---|
| `profiles` | Bénévoles, coordinateurs, admins (compétences, disponibilités, charte signée) |
| `posts` | Actualités |
| `events` | Maraudes, collectes, formations, événements publics, réunions |
| `event_registrations` | Inscriptions du grand public (sans compte) |
| `volunteer_shifts` | Inscriptions des bénévoles aux événements (confirmé / attente / présent) |
| `stock_items` + `stock_movements` | Articles et mouvements (entrées, sorties, motifs, DLC) |
| `stock_levels` *(vue)* | Quantités calculées, alerte stock bas, prochaine DLC |
| `maraude_reports` | Compte-rendu chiffré de chaque maraude |
| `donations` | Dons reçus via HelloAsso |
| `contact_messages`, `newsletter_subscribers` | Contact et newsletter |
| `public_impact`, `event_fill` *(vues)* | Compteurs publics, taux de remplissage des créneaux |

## 5. Ce qui va au-delà de la demande initiale

Déjà présent dans le code :

1. **Bandeau « 115 »** permanent : le site sert aussi à orienter quelqu'un qui croise une personne en détresse.
2. **Simulateur fiscal et d'impact** sur la page don.
3. **Flux calendrier `.ics`** : les bénévoles s'abonnent depuis Google, Outlook ou Apple.
4. **Compte-rendu de maraude** qui alimente les stats **et** déduit les stocks en une seule saisie.
5. **Liste d'attente automatique** quand une maraude est complète.
6. **Répétition hebdomadaire** d'une maraude en un clic.
7. **Point de RDV** visible uniquement des bénévoles inscrits, pour la sécurité.
8. **Charte bénévole** signée en ligne et suivie dans l'admin.
9. **Anti-spam sans captcha** (champ piège invisible), plus accessible qu'un captcha.

## 6. Feuille de route proposée

### V1 : lancement (code présent, à brancher)
- [x] Site public, actualités, agenda, inscriptions, page don, contact, pages légales
- [x] Espace bénévole : calendrier, inscriptions, profil, charte
- [x] Admin : tableau de bord, stocks, événements, comptes-rendus, actualités, bénévoles, dons
- [ ] Brancher Supabase, HelloAsso, Render (voir `03-deploiement.md`)
- [ ] Logo, nom, couleurs définitives, photos, textes « Qui sommes-nous »

### V1.1 : un mois après le lancement
- [ ] **Emails transactionnels** (Brevo ou Resend) : confirmation d'inscription avec `.ics`, rappel J-1, annulation, alerte « il manque 2 bénévoles ce soir »
- [ ] **Page « Besoins du moment »** générée automatiquement depuis les stocks sous le seuil
- [ ] **Upload d'images** dans l'admin (Supabase Storage)
- [ ] **Export CSV** : bénévoles, dons, mouvements de stock
- [ ] **Statistiques d'audience** sans cookies (Plausible ou Umami)
- [ ] Page de sensibilisation : « Que faire quand je croise une personne à la rue ? »

### V2
- [ ] **Guide de la rue** : carte des douches, accueils de jour, distributions, points d'eau (multilingue)
- [ ] **PWA hors-ligne** pour saisir le compte-rendu sur le terrain sans réseau
- [ ] **Rapport d'activité annuel** généré automatiquement (PDF), pour l'AG et les subventions
- [ ] Rappels SMS aux bénévoles
- [ ] Page mécénat entreprises et collectes en entreprise
- [ ] Tournées : zones et parcours de maraude sur une carte (sans données personnelles)
