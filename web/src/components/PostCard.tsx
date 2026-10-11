import Link from "next/link";
import { formatShortDate } from "@/lib/format";
import type { Post } from "@/lib/types";

type PostSummary = Pick<Post, "id" | "slug" | "title" | "excerpt" | "published_at" | "cover_url" | "cover_alt">;

export function PostCard({ post, headingLevel = 3 }: { post: PostSummary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="post-card">
      {post.cover_url && (
        <div className="post-card__cover">
          {/* eslint-disable-next-line @next/next/no-img-element -- images hébergées sur Supabase Storage */}
          <img src={post.cover_url} alt={post.cover_alt ?? ""} />
        </div>
      )}
      {post.published_at && (
        <p className="post-card__date"><time dateTime={post.published_at}>{formatShortDate(post.published_at)}</time></p>
      )}
      <Heading><Link className="stretched" href={`/actualites/${post.slug}`}>{post.title}</Link></Heading>
      {post.excerpt && <p>{post.excerpt}</p>}
    </article>
  );
}
