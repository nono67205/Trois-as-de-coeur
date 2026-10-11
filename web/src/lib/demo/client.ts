import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { buildSeed, demoAccounts, type DemoDB } from "./seed";
import { DEMO_COOKIE } from "./mode";

/*
 * Imitation minimale du client Supabase pour le mode démo.
 * Couvre uniquement les appels utilisés par l'application : select / insert / upsert / update / delete,
 * filtres eq · neq · gte · lt · in · is, order, limit, single, maybeSingle, jointures simples et vues.
 * Les données sont conservées dans web/.demo/db.json (supprimer ce fichier pour réinitialiser).
 */

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const FILE = path.join(process.cwd(), ".demo", "db.json");
const g = globalThis as unknown as { __demoDb?: DemoDB };

function db(): Record<string, Row[]> {
  if (!g.__demoDb) {
    try {
      g.__demoDb = JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
      g.__demoDb = buildSeed();
      persist();
    }
  }
  return g.__demoDb as Record<string, Row[]>;
}

function persist() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(g.__demoDb));
}

// --- Valeurs par défaut et contraintes d'unicité (miroir de la migration SQL) ---
const DEFAULTS: Record<string, Row> = {
  profiles: { role: "volunteer", skills: [], is_active: true, phone: null, availability: null, charter_signed_at: null },
  posts: { status: "draft", content: "", excerpt: null, cover_url: null, cover_alt: null, published_at: null },
  events: { status: "draft", is_public: false, required_skills: [], description: "", public_capacity: null, volunteer_slots: null, cover_url: null, cover_alt: null },
  event_registrations: { seats: 1, cancelled_at: null, newsletter_optin: false, phone: null },
  volunteer_shifts: { status: "confirmed", task: null },
  stock_items: { unit: "unité", min_threshold: 0, is_active: true, location: null },
  stock_movements: { expires_on: null, event_id: null, note: null },
  maraude_reports: { people_met: 0, meals_given: 0, hot_drinks: 0, hygiene_kits: 0, clothes_given: 0, blankets_given: 0, referrals_115: 0, volunteers_count: 0 },
  contact_messages: { handled: false },
  donations: { is_recurring: false, is_company: false },
  newsletter_subscribers: { confirmed_at: null },
};
const UNIQUE: Record<string, string[][]> = {
  posts: [["slug"]], events: [["slug"]], event_registrations: [["event_id", "email"]], volunteer_shifts: [["event_id", "profile_id"]],
  stock_items: [["name", "unit"]], maraude_reports: [["event_id"]], donations: [["helloasso_payment_id"]], newsletter_subscribers: [["email"]],
};
const RELATIONS: Record<string, [fk: string, table: string]> = {
  events: ["event_id", "events"], profiles: ["profile_id", "profiles"], stock_items: ["item_id", "stock_items"],
};

// --- Vues calculées ---
function view(name: string): Row[] | null {
  const d = db();
  if (name === "stock_levels") {
    const today = new Date().toISOString().slice(0, 10);
    return d.stock_items.filter((i) => i.is_active).map((i) => {
      const mv = d.stock_movements.filter((m) => m.item_id === i.id);
      const quantity = mv.reduce((s, m) => s + Number(m.delta), 0);
      const exp = mv.filter((m) => m.delta > 0 && m.expires_on && m.expires_on >= today).map((m) => m.expires_on).sort()[0] ?? null;
      return { ...i, quantity, is_low: quantity <= Number(i.min_threshold), next_expiry: exp };
    });
  }
  if (name === "public_impact") {
    return [{
      maraudes_done: d.events.filter((e) => e.type === "maraude" && e.status === "done").length,
      meals_given: d.maraude_reports.reduce((s, r) => s + r.meals_given, 0),
      people_met: d.maraude_reports.reduce((s, r) => s + r.people_met, 0),
      volunteers: d.profiles.filter((p) => p.is_active).length,
    }];
  }
  if (name === "event_fill") {
    return d.events.map((e) => ({
      event_id: e.id,
      volunteers_confirmed: d.volunteer_shifts.filter((s) => s.event_id === e.id && s.status === "confirmed").length,
      volunteers_waitlist: d.volunteer_shifts.filter((s) => s.event_id === e.id && s.status === "waitlist").length,
    }));
  }
  return null;
}

const getPath = (r: Row, p: string) => p.split(".").reduce<any>((o, k) => (o == null ? o : o[k]), r); // eslint-disable-line @typescript-eslint/no-explicit-any

type Result = { data: any; error: { message: string; code?: string } | null; count?: number | null }; // eslint-disable-line @typescript-eslint/no-explicit-any

class Query implements PromiseLike<Result> {
  private filters: ((r: Row) => boolean)[] = [];
  private sorts: [string, boolean][] = [];
  private max?: number;
  private one: "single" | "maybe" | null = null;
  private cols = "*";
  private countMode = false;
  private head = false;
  private returning = false;
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: Row[] = [];
  private opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(private table: string) {}

  select(cols = "*", o?: { count?: string; head?: boolean }) {
    this.cols = cols;
    if (this.op !== "select") this.returning = true;
    this.countMode = Boolean(o?.count);
    this.head = Boolean(o?.head);
    return this;
  }
  insert(v: Row | Row[]) { this.op = "insert"; this.payload = [v].flat(); return this; }
  upsert(v: Row | Row[], o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) { this.op = "upsert"; this.payload = [v].flat(); this.opts = o; return this; }
  update(v: Row) { this.op = "update"; this.payload = [v]; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => getPath(r, c) === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => getPath(r, c) !== v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => getPath(r, c) != null && getPath(r, c) >= v); return this; } // eslint-disable-line @typescript-eslint/no-explicit-any
  lt(c: string, v: any) { this.filters.push((r) => getPath(r, c) != null && getPath(r, c) < v); return this; } // eslint-disable-line @typescript-eslint/no-explicit-any
  in(c: string, v: unknown[]) { this.filters.push((r) => v.includes(getPath(r, c))); return this; }
  is(c: string, v: null) { this.filters.push((r) => (getPath(r, c) ?? null) === v); return this; }
  order(c: string, o: { ascending?: boolean } = {}) { this.sorts.push([c, o.ascending ?? true]); return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, ko?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(ok, ko);
  }

  private withJoins(rows: Row[]) {
    const joins = [...this.cols.matchAll(/(\w+)(!inner)?\(/g)].map((m) => ({ name: m[1], inner: Boolean(m[2]) }));
    if (!joins.length) return rows.map((r) => ({ ...r }));
    return rows.flatMap((r) => {
      const out: Row = { ...r };
      for (const j of joins) {
        const rel = RELATIONS[j.name];
        if (!rel) continue;
        out[j.name] = db()[rel[1]].find((x) => x.id === r[rel[0]]) ?? null;
        if (j.inner && !out[j.name]) return [];
      }
      return [out];
    });
  }

  private matching(rows: Row[]) {
    return this.withJoins(rows).filter((r) => this.filters.every((f) => f(r)));
  }

  private finish(rows: Row[]): Result {
    for (const [c, asc] of [...this.sorts].reverse()) {
      rows.sort((a, b) => (getPath(a, c) > getPath(b, c) ? 1 : getPath(a, c) < getPath(b, c) ? -1 : 0) * (asc ? 1 : -1));
    }
    const count = rows.length;
    if (this.max != null) rows = rows.slice(0, this.max);
    if (this.head) return { data: null, error: null, count };
    if (this.one) {
      if (rows.length !== 1 && this.one === "single") return { data: null, error: { message: "Row not found", code: "PGRST116" } };
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null, count: this.countMode ? count : null };
  }

  private conflictKeys(): string[][] {
    if (this.opts.onConflict) return [this.opts.onConflict.split(",").map((s) => s.trim())];
    return UNIQUE[this.table] ?? [];
  }

  private run(): Result {
    const v = view(this.table);
    if (v) return this.finish(this.matching(v));
    const table = (db()[this.table] ??= []);

    if (this.op === "select") return this.finish(this.matching(table));

    const touched: Row[] = [];
    if (this.op === "insert" || this.op === "upsert") {
      for (const input of this.payload) {
        const row: Row = { id: randomUUID(), created_at: new Date().toISOString(), ...DEFAULTS[this.table], ...input };
        const keys = this.conflictKeys();
        const existing = table.find((t) => keys.some((k) => k.every((c) => t[c] === row[c])));
        if (existing) {
          if (this.op === "insert") return { data: null, error: { message: "duplicate key value", code: "23505" } };
          if (!this.opts.ignoreDuplicates) Object.assign(existing, input);
          touched.push(existing);
        } else {
          table.push(row);
          touched.push(row);
        }
      }
    } else if (this.op === "update") {
      for (const r of table.filter((r) => this.filters.every((f) => f(r)))) touched.push(Object.assign(r, this.payload[0]));
    } else if (this.op === "delete") {
      const keep = table.filter((r) => !this.filters.every((f) => f(r)));
      db()[this.table] = keep;
    }
    persist();
    return this.returning ? this.finish([...touched]) : { data: null, error: null };
  }
}

// --- Session de démo : cookie signé (id utilisateur + HMAC) ---
const secret = () => process.env.DEMO_SESSION_SECRET || "demo-secret";
const sign = (id: string) => `${id}.${createHmac("sha256", secret()).update(id).digest("base64url")}`;
function verify(token?: string) {
  if (!token) return null;
  const [id, mac] = token.split(".");
  const expected = sign(id).split(".")[1];
  return mac && mac.length === expected.length && timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? id : null;
}

export function createDemoClient() {
  return {
    from: (table: string) => new Query(table),
    auth: {
      async getUser() {
        const id = verify((await cookies()).get(DEMO_COOKIE)?.value);
        const p = id ? db().profiles.find((x) => x.id === id) : null;
        return { data: { user: p ? { id: p.id, email: p.email } : null }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const account = demoAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
        const p = account && db().profiles.find((x) => x.email === account.email);
        if (!p) return { data: { user: null }, error: { message: "Invalid login credentials" } };
        (await cookies()).set(DEMO_COOKIE, sign(p.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
        return { data: { user: { id: p.id, email: p.email } }, error: null };
      },
      async signInWithOtp() {
        return { error: { message: "Le lien magique est désactivé en mode démo : utilisez le mot de passe." } };
      },
      async exchangeCodeForSession() {
        return { error: { message: "Indisponible en mode démo" } };
      },
      async signOut() {
        (await cookies()).delete(DEMO_COOKIE);
        return { error: null };
      },
    },
  };
}
