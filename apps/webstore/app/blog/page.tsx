// apps/webstore/app/blog/page.tsx
// Blog index: Server-rendered on demand.
import Link from 'next/link';
import { listPosts } from '@/lib/api';
import { Placeholder } from '@/components/Placeholder';

export const dynamic = 'force-dynamic';

export default async function BlogIndex() {
  const posts = await listPosts();
  return (
    <section className="container" style={{ padding: '48px 22px' }}>
      <div className="section-head"><div><h2>Blog</h2><p>{posts.data.length} articles on building software.</p></div></div>
      {posts.data.length === 0 ? (
        <div className="empty">No posts published yet.</div>
      ) : (
        <div className="grid cards">
          {posts.data.map((p) => (
            <Link key={p.id} className="post" href={`/blog/${p.slug}`} style={{ color: 'inherit' }}>
              <Placeholder kind="blog" seed={p.id} tags={p.tags} label={p.title} size="md" />
              <h3>{p.title}</h3>
              <div className="meta">{p.tags?.join(' · ') || 'article'}</div>
              <div className="excerpt">{p.body ? p.body.slice(0, 130) : ''}…</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
