import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { ROLE_LABELS, type Profile } from "@/lib/types";
import { setRole } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminVolunteers() {
  const me = await getCurrentProfile();
  const isAdmin = me?.role === "admin";
  const supabase = await createClient();
  const [{ data }, { data: shifts }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("volunteer_shifts").select("profile_id").in("status", ["confirmed", "attended"]),
  ]);
  const counts = new Map<string, number>();
  for (const s of shifts ?? []) counts.set(s.profile_id, (counts.get(s.profile_id) ?? 0) + 1);
  const people = (data ?? []) as Profile[];

  return (
    <>
      <h1>Bénévoles</h1>
      <p className="muted">{people.filter((p) => p.is_active).length} actifs · {people.filter((p) => !p.charter_signed_at).length} sans charte signée</p>
      <div className="table-wrap" style={{ marginTop: 24 }}>
        <table>
          <thead>
            <tr><th>Nom</th><th>Téléphone</th><th>Compétences</th><th>Disponibilités</th><th>Missions</th><th>Charte</th><th>Rôle</th></tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.full_name || "—"}</strong><br /><span className="muted">depuis {formatShortDate(p.created_at)}</span></td>
                <td>{p.phone ? <a href={`tel:${p.phone}`}>{p.phone}</a> : "—"}</td>
                <td>{p.skills.join(", ") || "—"}</td>
                <td>{p.availability ?? "—"}</td>
                <td>{counts.get(p.id) ?? 0}</td>
                <td>{p.charter_signed_at ? "✓" : <span className="badge badge--warn">non</span>}</td>
                <td>
                  {isAdmin && p.id !== me?.id ? (
                    <form action={setRole} className="btn-row" style={{ alignItems: "center" }}>
                      <input type="hidden" name="id" value={p.id} />
                      <label className="sr-only" htmlFor={`role-${p.id}`}>Rôle de {p.full_name}</label>
                      <select id={`role-${p.id}`} name="role" defaultValue={p.role} style={{ width: "auto" }}>
                        {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <label className="checkbox"><input type="checkbox" name="is_active" defaultChecked={p.is_active} /> actif</label>
                      <button className="btn btn--ghost btn--sm">OK</button>
                    </form>
                  ) : ROLE_LABELS[p.role]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
