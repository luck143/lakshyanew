// apps/webstore/app/blog/[slug]/page.tsx
// Blog detail: Server-rendered on demand.
import { getPost, listPosts } from '@/lib/api';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  try {
    const posts = await listPosts();
    return posts.data.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  let post;
  try {
    post = await getPost(params.slug);
  } catch {
    notFound();
  }
  return (
    <article className="container" style={{ padding: '48px 22px', maxWidth: 760 }}>
      <Link href="/blog" className="muted" style={{ fontSize: 14 }}>← Back to blog</Link>
      <h1 style={{ fontSize: 38, letterSpacing: '-.02em', marginTop: 14 }}>{post.title}</h1>
      <div className="meta-row" style={{ margin: '10px 0 24px' }}>
        {post.tags?.map((t: string) => <span key={t} className="tag">{t}</span>)}
        <span className="muted" style={{ fontSize: 14 }}>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="prose" style={{ fontSize: 17, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#1f2533' }}>{post.body}</div>
    </article>
  );
}
