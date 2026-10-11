import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";
import type { Post } from "@/lib/types";
import { savePost } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPosts({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
  const posts = (data ?? []) as Post[];
  const current = posts.find((p) => p.id === edit);

  return (
    <>
      <h1>Actualités</h1>
      <div className="table-wrap" style={{ marginTop: 24 }}>
        <table>
          <thead><tr><th>Titre</th><th>Statut</th><th>Publié le</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td><span className={`badge ${p.status === "draft" ? "badge--warn" : ""}`}>{p.status}</span></td>
                <td>{p.published_at ? formatShortDate(p.published_at) : "—"}</td>
                <td><Link href={`/admin/actualites?edit=${p.id}#editor`}>Modifier<span className="sr-only"> {p.title}</span></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section id="editor" className="card" style={{ marginTop: 32 }} aria-labelledby="editor-title">
        <h2 id="editor-title" style={{ fontSize: "1.3rem" }}>{current ? "Modifier l'actualité" : "Nouvelle actualité"}</h2>
        <form action={savePost} className="form" style={{ maxWidth: 820 }} key={current?.id ?? "new"}>
          <input type="hidden" name="id" value={current?.id ?? ""} />
          <div className="field"><label htmlFor="p-title">Titre</label><input id="p-title" name="title" required defaultValue={current?.title} /></div>
          <div className="field">
            <label htmlFor="p-excerpt">Chapô</label>
            <span className="hint">1 à 2 phrases, affichées dans les listes et sur les réseaux sociaux.</span>
            <input id="p-excerpt" name="excerpt" maxLength={300} defaultValue={current?.excerpt ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="p-content">Contenu</label>
            <span className="hint">Format Markdown : **gras**, *italique*, ## Intertitre, - liste, [lien](https://…)</span>
            <textarea id="p-content" name="content" rows={14} defaultValue={current?.content} />
          </div>
          <div className="field"><label htmlFor="p-cover">URL de l&apos;image</label><input id="p-cover" name="cover_url" type="url" defaultValue={current?.cover_url ?? ""} /></div>
          <div className="field">
            <label htmlFor="p-alt">Description de l&apos;image (accessibilité)</label>
            <span className="hint">Décrivez ce que montre l&apos;image. Ne photographiez jamais une personne sans son accord écrit.</span>
            <input id="p-alt" name="cover_alt" defaultValue={current?.cover_alt ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="p-status">Statut</label>
            <select id="p-status" name="status" defaultValue={current?.status ?? "draft"}>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="archived">Archivé</option>
            </select>
          </div>
          <div className="btn-row">
            <button className="btn btn--primary">Enregistrer</button>
            {current && <Link href="/admin/actualites#editor" className="btn btn--ghost">Nouvelle actualité</Link>}
          </div>
        </form>
      </section>
    </>
  );
}
