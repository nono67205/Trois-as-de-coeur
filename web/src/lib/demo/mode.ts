/**
 * Mode démo : le site tourne sur une base fictive locale (web/.demo/db.json), sans Supabase.
 * Activé par DEMO_MODE=true dans .env.local. Ne jamais l'activer en production.
 */
export const isDemoMode = () => process.env.DEMO_MODE === "true";

export const DEMO_COOKIE = "demo_session";
