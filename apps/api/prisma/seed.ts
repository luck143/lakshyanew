// prisma/seed.ts — seed rich demo data for the Lakshya storefront.
// Run: DATABASE_URL=... npx tsx prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const T = 'default';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  // wipe demo rows (keep users/roles/settings). Clear dependents first.
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.review.deleteMany({ where: { tenantId: T } });
  await prisma.orderItem.deleteMany({});
  await prisma.product.deleteMany({ where: { tenantId: T } });
  await prisma.blogPost.deleteMany({ where: { tenantId: T } });
  await prisma.topic.deleteMany({ where: { tenantId: T } });
  await prisma.category.deleteMany({ where: { tenantId: T } });

  // ---- Categories ----
  const books = await prisma.category.create({ data: { tenantId: T, name: 'Books', slug: 'books', status: 'active', sortOrder: 1 } });
  const courses = await prisma.category.create({ data: { tenantId: T, name: 'Courses', slug: 'courses', status: 'active', sortOrder: 2 } });
  const bundles = await prisma.category.create({ data: { tenantId: T, name: 'Bundles', slug: 'bundles', status: 'active', sortOrder: 3 } });

  // ---- Topics ----
  const topicNames = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'System Design', 'Databases', 'DevOps', 'Algorithms'];
  const topics = [];
  for (const n of topicNames) {
    topics.push(await prisma.topic.create({ data: { tenantId: T, name: n, status: 'active', sortOrder: topics.length + 1, content: `${n} — curated learning path with books, courses and articles.` } }));
  }

  // ---- Products (books + courses) ----
  type P = { title: string; cat: string; price: number; desc: string; tags: string[]; sku: string; stock: number };
  const products: P[] = [
    { title: 'Async JavaScript Deep Dive', cat: 'books', price: 499, sku: 'BK-ASYNC-JS', stock: 42,
      desc: 'Master promises, async/await, the event loop and microtasks. A practical, example-driven guide to writing non-blocking JavaScript that scales.',
      tags: ['javascript', 'async', 'node'] },
    { title: 'TypeScript in Practice', cat: 'books', price: 599, sku: 'BK-TS-PRAC', stock: 30,
      desc: 'From basic types to advanced generics, conditional types and type-level programming. Ship safer code with confidence.',
      tags: ['typescript', 'types', 'frontend'] },
    { title: 'React Patterns & Performance', cat: 'books', price: 549, sku: 'BK-REACT-PP', stock: 25,
      desc: 'Composition, hooks, memoization and rendering strategies that keep large React apps fast.',
      tags: ['react', 'frontend', 'performance'] },
    { title: 'Node.js Backend Engineering', cat: 'books', price: 649, sku: 'BK-NODE-BE', stock: 18,
      desc: 'Build production-grade APIs: streaming, workers, observability and resilient service design.',
      tags: ['node', 'backend', 'api'] },
    { title: 'The System Design Playbook', cat: 'books', price: 799, sku: 'BK-SD-PLAY', stock: 12,
      desc: 'Rate limiting, caching, sharding, queues and trade-offs explained through real interview and production scenarios.',
      tags: ['system-design', 'architecture', 'scaling'] },
    { title: 'Full-Stack JavaScript Bootcamp', cat: 'courses', price: 2499, sku: 'CO-FS-BOOT', stock: 999,
      desc: 'A 12-week project-based course: build and deploy a full app with TypeScript, React and Node from zero.',
      tags: ['fullstack', 'react', 'node', 'course'] },
    { title: 'TypeScript Mastery Course', cat: 'courses', price: 1899, sku: 'CO-TS-MAST', stock: 999,
      desc: 'Go from typed-JavaScript beginner to type-wizard. Includes 60 lessons and 8 graded exercises.',
      tags: ['typescript', 'course', 'frontend'] },
    { title: 'React Performance Workshop', cat: 'courses', price: 1499, sku: 'CO-RCT-PERF', stock: 999,
      desc: 'Hands-on profiling and optimization of real React apps. Learn to find and fix jank.',
      tags: ['react', 'performance', 'course'] },
    { title: 'Full-Stack + Books Bundle', cat: 'bundles', price: 3299, sku: 'BD-FS-ALL', stock: 50,
      desc: 'Everything you need: the Full-Stack Bootcamp plus all five engineering books at one discounted price.',
      tags: ['bundle', 'fullstack', 'best-value'] },
    { title: 'Frontend Pro Bundle', cat: 'bundles', price: 2199, sku: 'BD-FE-PRO', stock: 60,
      desc: 'React Patterns book, TypeScript Mastery course and React Performance Workshop together.',
      tags: ['bundle', 'frontend', 'react'] },
  ];
  const catMap: Record<string, string> = { books: books.id, courses: courses.id, bundles: bundles.id };
  for (const p of products) {
    await prisma.product.create({ data: { tenantId: T, title: p.title, slug: slug(p.title), description: p.desc, price: p.price, status: 'active', categoryId: catMap[p.cat], sku: p.sku, stock: p.stock, tags: Array.from(new Set([p.cat, ...p.tags])) } });
  }

  // ---- Blog posts ----
  type B = { title: string; tags: string[]; body: string };
  const posts: B[] = [
    { title: 'Why Async/Await Beats Promise Chains', tags: ['javascript', 'async'],
      body: 'Promise chains read bottom-up and break under complex control flow. async/await flattens them into ordinary, debuggable code.\n\nStart small: replace .then() with await inside an async function, and wrap side effects in try/catch. The event loop still drives everything — you are just writing it linearly.' },
    { title: '5 TypeScript Tricks That Save Hours', tags: ['typescript'],
      body: '1) Satisfies over asserts. 2) Discriminated unions for state machines. 3) Utility types (Pick, Omit, Record). 4) const assertions. 5) Template literal types for branded IDs.\n\nEach one moves a runtime check to compile time — fewer bugs in production.' },
    { title: 'Rendering Large Lists Without Jank', tags: ['react', 'performance'],
      body: 'Virtualize. Windowing libraries render only visible rows, keeping the DOM small. Pair with memoization of row components and stable keys.\n\nMeasure with the Profiler before optimizing — most "slow" lists are actually slow data transforms.' },
    { title: 'Designing APIs That Do Not Fall Over', tags: ['node', 'system-design'],
      body: 'Budgets, backpressure and timeouts. A service that accepts unlimited work will fail under load. Use queues, cap concurrency, and fail fast with clear errors.' },
    { title: 'Caching: The Easy Wrong Answer', tags: ['system-design', 'databases'],
      body: 'Caching solves read latency but introduces invalidation — the hard part of CS. Pick a TTL, version your keys, and treat the cache as a hint, never a source of truth.' },
    { title: 'From Junior to Fluent in JavaScript', tags: ['javascript', 'career'],
      body: 'Fluency is not knowing APIs by heart; it is understanding the runtime: closures, the prototype chain, the event loop and module systems. Learn those once and everything else follows.' },
  ];
  for (const b of posts) {
    await prisma.blogPost.create({ data: { tenantId: T, title: b.title, slug: slug(b.title), body: b.body, status: 'published', tags: b.tags } });
  }

  const pCount = await prisma.product.count({ where: { tenantId: T } });
  const bCount = await prisma.blogPost.count({ where: { tenantId: T } });
  const cCount = await prisma.category.count({ where: { tenantId: T } });
  const tCount = await prisma.topic.count({ where: { tenantId: T } });
  console.log(`Seeded: ${cCount} categories, ${tCount} topics, ${pCount} products, ${bCount} blog posts`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
