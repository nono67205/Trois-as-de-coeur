// Types écrits à la main pour démarrer.
// Une fois Supabase lié : `npm run db:types` génère src/lib/database.types.ts.

export type UserRole = "volunteer" | "coordinator" | "admin";
export type EventType = "maraude" | "collecte" | "distribution" | "formation" | "evenement_public" | "reunion";
export type EventStatus = "draft" | "published" | "cancelled" | "done";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  skills: string[];
  availability: string | null;
  charter_signed_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  cover_alt: string | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
}

export interface AssoEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  starts_at: string;
  ends_at: string;
  location: string | null;
  meeting_point: string | null;
  is_public: boolean;
  public_capacity: number | null;
  volunteer_slots: number | null;
  required_skills: string[];
  cover_url: string | null;
  cover_alt: string | null;
}

export interface StockLevel {
  id: string;
  name: string;
  category: string;
  unit: string;
  min_threshold: number;
  location: string | null;
  quantity: number;
  is_low: boolean;
  next_expiry: string | null;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  maraude: "Maraude",
  collecte: "Collecte",
  distribution: "Distribution",
  formation: "Formation",
  evenement_public: "Événement",
  reunion: "Réunion",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  volunteer: "Bénévole",
  coordinator: "Coordinateur·rice",
  admin: "Administrateur·rice",
};
