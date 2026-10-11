import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import type { Post } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data as Post | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt ?? undefined, openGraph: { images: post.cover_url ? [post.cover_url] : [] } } : {};
}

export default async function PostPage({ params }: Params) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <>
      <PageHero eyebrow={post.published_at ? formatShortDate(post.published_at) : "Actualité"} title={post.title} lead={post.excerpt} />
      <article className="container section">
        <div className="prose" style={{ marginInline: "auto" }}>
          <p><Link href="/actualites" className="link-arrow"><ArrowLeft className="icon" aria-hidden="true" /> Toutes les actualités</Link></p>
          {/* eslint-disable-next-line @next/next/no-img-element -- images hébergées sur Supabase Storage */}
          {post.cover_url && <img src={post.cover_url} alt={post.cover_alt ?? ""} style={{ margin: "24px 0" }} />}
          <ReactMarkdown>{post.content}</ReactMarkdown>
          <aside className="cta-band" style={{ marginTop: 64, gridTemplateColumns: "1fr" }}>
            <h2 style={{ fontSize: "1.8rem" }}>Vous aussi, <em>agissez.</em></h2>
            <div className="btn-row">
              <Link href="/faire-un-don" className="btn btn--donate">Faire un don</Link>
              <Link href="/devenir-benevole" className="btn btn--ghost">Devenir bénévole</Link>
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
