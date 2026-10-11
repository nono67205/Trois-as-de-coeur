import { randomUUID } from "node:crypto";

type Row = Record<string, unknown>;
export type DemoDB = Record<string, Row[]>;

/** Comptes de test : identifiants lus dans .env.local (DEMO_*_EMAIL / DEMO_*_PASSWORD). */
export function demoAccounts() {
  return [
    { key: "admin", role: "admin", full_name: "Camille Admin", email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD },
    { key: "coord", role: "coordinator", full_name: "Sacha Coordination", email: process.env.DEMO_COORDINATOR_EMAIL, password: process.env.DEMO_COORDINATOR_PASSWORD },
    { key: "vol", role: "volunteer", full_name: "Alex Bénévole", email: process.env.DEMO_VOLUNTEER_EMAIL, password: process.env.DEMO_VOLUNTEER_PASSWORD },
  ].filter((a): a is typeof a & { email: string; password: string } => Boolean(a.email && a.password));
}

// Générateur pseudo-aléatoire déterministe : la démo est identique à chaque réinitialisation
function rng(seed = 42) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const FIRST_NAMES = ["Léa", "Yanis", "Inès", "Hugo", "Manon", "Karim", "Chloé", "Mamadou", "Zoé", "Tom", "Aïcha", "Lucas"];
const LAST_NAMES = ["Martin", "Benali", "Dubois", "Nguyen", "Moreau", "Traoré", "Lefèvre", "Garcia", "Petit", "Rousseau", "Diallo", "Bernard"];
const SKILLS = ["permis_b", "premiers_secours", "cuisine", "langues", "sante", "social"];

export function buildSeed(): DemoDB {
  const r = rng();
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const day = (offset: number, hour: number, min = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, min, 0, 0);
    return d;
  };
  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // --- Profils ---
  const profiles: Row[] = demoAccounts().map((a) => ({
    id: randomUUID(), email: a.email, full_name: a.full_name, phone: "06 12 34 56 78", role: a.role,
    skills: a.role === "volunteer" ? ["cuisine"] : ["permis_b", "premiers_secours"], availability: "Mardi soir",
    charter_signed_at: a.role === "volunteer" ? null : iso(day(-200, 12)), is_active: true, created_at: iso(day(-300, 10)),
  }));
  FIRST_NAMES.forEach((fn, i) => {
    profiles.push({
      id: randomUUID(), email: `${slug(fn)}@exemple.test`, full_name: `${fn} ${LAST_NAMES[i]}`, phone: `06 ${10 + i} 00 00 ${10 + i}`,
      role: "volunteer", skills: SKILLS.filter(() => r() > 0.6), availability: ["Mardi soir", "Vendredi soir", "Week-end", "Flexible"][i % 4],
      charter_signed_at: i % 5 === 0 ? null : iso(day(-150 + i * 7, 12)), is_active: i !== 11, created_at: iso(day(-280 + i * 20, 10)),
    });
  });
  const staff = profiles.filter((p) => p.role !== "volunteer");

  // --- Événements : maraudes passées (mardi + vendredi) sur 6 mois, puis 5 semaines à venir ---
  const events: Row[] = [];
  const reports: Row[] = [];
  const shifts: Row[] = [];
  for (let offset = -182; offset <= 35; offset++) {
    const d = day(offset, 19, 30);
    const dow = d.getDay();
    if (dow !== 2 && dow !== 5) continue;
    const past = offset < 0;
    const id = randomUUID();
    events.push({
      id, slug: `maraude-${iso(d).slice(0, 10)}`, title: dow === 2 ? "Maraude du mardi — centre-ville" : "Maraude du vendredi — gare",
      description: "Distribution de repas chauds, boissons, kits d'hygiène et vêtements. Départ en binômes.",
      type: "maraude", status: past ? "done" : "published", starts_at: iso(d), ends_at: iso(day(offset, 23)),
      location: dow === 2 ? "Centre-ville" : "Quartier de la gare", meeting_point: "Local de l'association, 12 rue des Lilas",
      is_public: false, public_capacity: null, volunteer_slots: 8, required_skills: [], cover_url: null, cover_alt: null,
      created_by: staff[0]?.id, created_at: iso(day(offset - 14, 10)),
    });
    // Effectifs : quelques bénévoles déjà inscrits sur les prochaines maraudes
    const pool = [...profiles].sort(() => r() - 0.5).slice(0, past ? 6 : Math.floor(r() * 7));
    pool.forEach((p) => shifts.push({ id: randomUUID(), event_id: id, profile_id: p.id, task: null, status: past ? "attended" : "confirmed", created_at: iso(day(offset - 3, 12)) }));
    if (past) {
      const winter = [0, 1, 2, 10, 11].includes(d.getMonth());
      const people = Math.round(28 + r() * 22 + (winter ? 12 : 0));
      reports.push({
        id: randomUUID(), event_id: id, zone: events.at(-1)!.location, people_met: people, meals_given: people + Math.round(r() * 8),
        hot_drinks: Math.round(people * (winter ? 1.4 : 0.8)), hygiene_kits: Math.round(people * 0.3), clothes_given: Math.round(r() * 20),
        blankets_given: winter ? Math.round(5 + r() * 10) : Math.round(r() * 3), referrals_115: Math.round(r() * 4), volunteers_count: 6,
        temperature_c: winter ? Math.round(r() * 8) : Math.round(12 + r() * 10), notes: "RAS. Bon accueil général.", created_by: staff[0]?.id, created_at: iso(day(offset + 1, 9)),
      });
    }
  }

  const publicEvents = [
    { title: "Grande collecte d'hiver", type: "collecte", offset: 9, h: 10, end: 17, loc: "Parvis de la mairie", cap: 200, slots: 6,
      desc: "Venez déposer vêtements chauds, duvets, chaussettes et produits d'hygiène. Nous trions sur place avec vous !" },
    { title: "Soirée découverte du bénévolat", type: "evenement_public", offset: 14, h: 19, end: 21, loc: "Maison des associations", cap: 40, slots: 3,
      desc: "Vous avez envie d'aider mais ne savez pas par où commencer ? Rencontrez l'équipe autour d'un café et découvrez nos missions." },
    { title: "Formation premiers secours (PSC1)", type: "formation", offset: 21, h: 9, end: 17, loc: "Local de l'association", cap: 12, slots: 2,
      desc: "Une journée pour apprendre les gestes qui sauvent, animée par un formateur agréé. Ouverte aux bénévoles et au public." },
    { title: "Concert solidaire", type: "evenement_public", offset: 30, h: 20, end: 23, loc: "Salle des fêtes", cap: 150, slots: 8,
      desc: "Trois groupes locaux jouent au profit de nos maraudes d'hiver. Entrée libre, chapeau à la sortie." },
  ];
  for (const e of publicEvents) {
    const s = day(e.offset, e.h);
    events.push({
      id: randomUUID(), slug: `${slug(e.title)}-${iso(s).slice(0, 10)}`, title: e.title, description: e.desc, type: e.type, status: "published",
      starts_at: iso(s), ends_at: iso(day(e.offset, e.end)), location: e.loc, meeting_point: "Stand de l'association", is_public: true,
      public_capacity: e.cap, volunteer_slots: e.slots, required_skills: [], cover_url: null, cover_alt: null, created_by: staff[0]?.id, created_at: iso(day(-5, 10)),
    });
  }

  // --- Inscriptions publiques ---
  const registrations: Row[] = events.filter((e) => e.is_public).flatMap((e) =>
    Array.from({ length: 3 + Math.floor(r() * 10) }, (_, i) => ({
      id: randomUUID(), event_id: e.id, full_name: `${FIRST_NAMES[i % 12]} ${LAST_NAMES[(i + 3) % 12]}`, email: `inscrit${i}.${String(e.slug).slice(0, 6)}@exemple.test`,
      phone: null, seats: 1 + Math.floor(r() * 3), gdpr_consent: true, newsletter_optin: r() > 0.5, cancel_token: randomUUID(), cancelled_at: null, created_at: iso(day(-2, 12)),
    })),
  );

  // --- Stocks ---
  const items = [
    ["Sandwichs", "alimentaire", "unité", 40, "Frigo", 35, 2], ["Soupe en brique", "alimentaire", "L", 20, "Étagère A", 48, 120],
    ["Café soluble", "boisson", "paquet", 5, "Étagère A", 12, 365], ["Bouteilles d'eau", "boisson", "unité", 60, "Réserve", 210, 300],
    ["Kits hygiène", "hygiene", "unité", 30, "Étagère B", 22, null], ["Protections périodiques", "hygiene", "paquet", 15, "Étagère B", 30, null],
    ["Chaussettes", "vetements", "paire", 50, "Bac vêtements", 140, null], ["Bonnets", "vetements", "unité", 20, "Bac vêtements", 18, null],
    ["Couvertures de survie", "couchage", "unité", 25, "Réserve", 60, null], ["Duvets", "couchage", "unité", 10, "Réserve", 7, null],
    ["Gobelets", "materiel", "unité", 100, "Étagère C", 400, null],
  ] as const;
  const stock_items: Row[] = [];
  const stock_movements: Row[] = [];
  for (const [name, category, unit, min, location, qty, exp] of items) {
    const id = randomUUID();
    stock_items.push({ id, name, category, unit, min_threshold: min, location, is_active: true, created_at: iso(day(-200, 10)) });
    stock_movements.push({ id: randomUUID(), item_id: id, delta: qty + 30, reason: "don_recu", expires_on: exp ? iso(day(exp, 12)).slice(0, 10) : null,
      event_id: null, note: "Stock initial", created_by: staff[0]?.id, created_at: iso(day(-20, 10)) });
    stock_movements.push({ id: randomUUID(), item_id: id, delta: -30, reason: "distribution", expires_on: null,
      event_id: null, note: "Maraudes de la semaine", created_by: staff[0]?.id, created_at: iso(day(-3, 23)) });
  }

  // --- Actualités ---
  const posts: Row[] = [
    { title: "Plan grand froid : nous renforçons nos maraudes", excerpt: "Dès que les températures passent sous 0 °C, nous ajoutons une sortie le dimanche soir.", days: -2,
      content: "Avec l'arrivée du froid, nos besoins augmentent. **Dès que la température passe sous 0 °C**, nous organisons une maraude supplémentaire le dimanche soir.\n\n## Ce dont nous avons besoin\n\n- Des duvets et couvertures\n- Des chaussettes chaudes et des bonnets\n- Des bénévoles disponibles le dimanche\n\nMerci à toutes et à tous pour votre mobilisation !" },
    { title: "1 000 repas distribués ce trimestre", excerpt: "Un cap symbolique franchi grâce à vous : merci aux bénévoles, aux donateurs et aux commerçants partenaires.", days: -12,
      content: "Ce trimestre, nous avons distribué **plus de 1 000 repas chauds**. Derrière ce chiffre, ce sont des centaines de rencontres, de discussions et de sourires.\n\nUn immense merci à la boulangerie du quartier qui nous offre ses invendus chaque soir." },
    { title: "Bienvenue aux 15 nouveaux bénévoles !", excerpt: "La soirée découverte de septembre a fait le plein. Retour en images.", days: -26,
      content: "Notre dernière soirée découverte a réuni **plus de 30 personnes**. 15 d'entre elles ont déjà participé à leur première maraude.\n\nProchaine soirée découverte : consultez l'agenda !" },
    { title: "Notre nouveau site est en ligne", excerpt: "Actualités, événements, dons : tout est maintenant au même endroit.", days: -40,
      content: "Nous sommes heureux de vous présenter notre nouveau site. Vous pouvez désormais suivre nos actions, vous inscrire à nos événements et nous soutenir en quelques clics." },
  ].map((p) => ({
    id: randomUUID(), slug: slug(p.title), title: p.title, excerpt: p.excerpt, content: p.content, cover_url: null, cover_alt: null,
    status: "published", published_at: iso(day(p.days, 9)), author_id: staff[0]?.id, created_at: iso(day(p.days, 9)), updated_at: iso(day(p.days, 9)),
  }));

  // --- Dons ---
  const donations: Row[] = Array.from({ length: 64 }, (_, i) => {
    const amount = [10, 20, 20, 30, 50, 50, 100, 15, 25, 200][Math.floor(r() * 10)];
    return {
      id: randomUUID(), helloasso_payment_id: 100000 + i, helloasso_order_id: 500000 + i, amount_cents: amount * 100, is_recurring: r() > 0.7,
      donor_first_name: FIRST_NAMES[i % 12], donor_last_name: LAST_NAMES[(i * 7) % 12], donor_email: `donateur${i}@exemple.test`,
      is_company: i % 17 === 0, paid_at: iso(day(-Math.floor(r() * 270), 14)), raw: null, created_at: iso(now),
    };
  });

  return {
    profiles, posts, events, event_registrations: registrations, volunteer_shifts: shifts, stock_items, stock_movements,
    maraude_reports: reports, donations, contact_messages: [
      { id: randomUUID(), full_name: "Boulangerie du Centre", email: "contact@boulangerie.test", subject: "don_nature", message: "Bonjour, nous aimerions vous donner nos invendus chaque soir. Comment procéder ?", handled: false, created_at: iso(day(-1, 15)) },
    ], newsletter_subscribers: [],
  };
}
