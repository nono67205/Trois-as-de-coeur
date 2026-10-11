import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { PostCard } from "@/components/PostCard";
import type { Post } from "@/lib/types";

export const metadata: Metadata = { title: "Actualités" };
export const revalidate = 300;

export default async function NewsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("status", "published")
    .order("published_at", { ascending: false }).limit(50);
  const posts = (data ?? []) as Post[];

  return (
    <>
      <PageHero eyebrow="Actualités" title={<>Des nouvelles <em>du terrain.</em></>}
        lead="Nos maraudes, nos collectes, nos coups de cœur et nos besoins du moment." />
      <div className="container section">
        {posts.length ? (
          <div className="post-grid">
            {posts.map((p) => <PostCard key={p.id} post={p} headingLevel={2} />)}
          </div>
        ) : (
          <p className="muted">Aucune actualité pour le moment.</p>
        )}
      </div>
    </>
  );
}
