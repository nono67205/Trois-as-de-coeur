// Identité de l'association. Pas de logo : le nom sert de signature (sobre, accents noir et orange).
export const site = {
  name: process.env.NEXT_PUBLIC_ASSO_NAME ?? "3 As de Cœur",
  tagline: "Aller vers ceux que la rue rend invisibles.",
  city: "Lyon",
  // Siège et local de l'association
  address: "15 rue de Marignan, 69003 Lyon",
  email: "contact@exemple.org",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  donationUrl: process.env.NEXT_PUBLIC_HELLOASSO_DONATION_URL ?? "",
  socials: {
    instagram: "",
    facebook: "",
    linkedin: "",
  },
  // Coût d'un repas distribué, utilisé pour traduire les dons en impact concret
  mealCostEuros: 2.5,
  // Point de dépôt des dons en nature — à compléter avec l'adresse fournie par l'association
  dropOff: {
    address: "15 rue de Marignan, 69003 Lyon",
    hours: [] as string[], // ex. ["Mardi : 18 h – 20 h", "Samedi : 10 h – 12 h"]
    details: "", // ex. "Sonner à l'interphone « 3 As de Cœur »"
  },
};

export const nav = [
  { href: "/actualites", label: "Actualités" },
  { href: "/evenements", label: "Agenda" },
  { href: "/devenir-benevole", label: "S'engager" },
  { href: "/deposer-un-don", label: "Dons en nature" },
  { href: "/a-propos", label: "Qui sommes-nous" },
];
