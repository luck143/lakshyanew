// scripts/migrate/specs.ts
// Declarative migration specs: old ClickHouse (lakshya DB, 188.245.85.41) -> new Postgres.
//
// STRATEGY A (SEO-preserving, agreed): the new Postgres `id` IS the old primary-key
// value verbatim (idCol: 'uid' for in_users, 'mid' for in_modules, else 'id'). Frontend
// URLs keep working; FK graphs preserved exactly. The old column NAMES never enter the
// new codebase — we map to clean model fields, and any legacy-only data folds into the
// model's `extra` jsonb (data preserved, no schema pollution).
//
// Every `fields` key MUST exist on the target Prisma model (enforced by validate-specs.ts).
// Sourced from real prod column lists (read-only DESCRIBE on 188.245.85.41/lakshya).
import type { ResourceSpec } from './lib/generic.js';

const slugify = (s: string) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v: any) => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const str = (v: any) => (v == null ? null : String(v));
const jsonArr = (v: any) => (Array.isArray(v) ? v.map(String) : (v == null ? [] : String(v).split(',').map((s: string) => s.trim()).filter(Boolean)));
const safeJson = (v: any) => { if (v == null) return null; try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; } };

export const SPECS: ResourceSpec[] = [
  // ============ CORE (lakshya.in_*) ============
  {
    resource: 'user', model: 'User', oldDb: 'lakshya', oldTable: 'in_users', idCol: 'uid', whereSince: 'updatedtimestr',
    fields: {
      email: 'email', name: { col: 'name', fn: (r) => str(r.name) },
      role: { col: 'role', fn: (r) => str(r.role) || 'user' },
      status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      // All non-model legacy columns fold into extra jsonb.
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) ?? {
        phone: str(r.phone), points: num(r.points) ?? 0, refid: str(r.refid), amid: str(r.amid),
        emailValidated: str(r.email_validated), tags: str(r.tags), subscription: str(r.subscription),
      } },
    },
  },
  {
    resource: 'setting', model: 'Setting', oldDb: 'lakshya', oldTable: 'in_settings', whereSince: 'updatedtimestr',
    fields: {
      key: { col: 'name', fn: (r) => str(r.name) || 'site' },
      group: { col: 'plan', fn: (r) => str(r.plan) || 'general' },
      value: { col: 'extra', fn: (r) => safeJson(r.extra) ?? str(r.extra) },
      label: { col: 'name', fn: (r) => str(r.name) },
      status: { col: 'status', fn: (r) => str(r.status) || 'active' },
    },
  },
  {
    resource: 'domain', model: 'Domain', oldDb: 'lakshya', oldTable: 'in_domains', idCol: 'name', whereSince: 'updatedtimestr',
    fields: {
      name: 'name', type: { col: 'type', fn: (r) => str(r.type) || 'primary' }, scheme: { col: 'scheme', fn: (r) => str(r.scheme) || 'https' },
      status: { col: 'status', fn: (r) => str(r.status) || 'active' }, processStatus: { col: 'process_status', fn: (r) => str(r.process_status) || 'live' },
      hidden: { col: 'hidden', fn: (r) => r.hidden === '1' || r.hidden === 1 || r.hidden === true },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
  },
  {
    resource: 'module', model: 'Module', oldDb: 'lakshya', oldTable: 'in_modules', idCol: 'mid', whereSince: 'updatedtimestr',
    fields: {
      name: 'name', subscriptionType: { col: 'type', fn: (r) => str(r.type) || 'free' },
      status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) ?? {
        systemType: str(r.system_type), description: str(r.description), tags: str(r.tags), resultFormat: str(r.result_format),
      } },
    },
    selfRelation: { newField: 'parent', oldField: 'parent' },
  },
  {
    resource: 'subscriber', model: 'Subscriber', oldDb: 'lakshya', oldTable: 'in_subscribers', idCol: 'uid', whereSince: 'updatedtimestr',
    fields: {
      name: { col: 'name', fn: (r) => str(r.name) }, email: { col: 'email', fn: (r) => str(r.email) },
      status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      refid: { col: 'refid', fn: (r) => str(r.refid) }, extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
  },
  {
    resource: 'invoice', model: 'Invoice', oldDb: 'lakshya', oldTable: 'in_invoices', whereSince: 'updatedtimestr',
    fields: {
      title: 'title', amount: { col: 'amount', fn: (r) => num(r.amount) ?? 0 },
      date: { col: 'date', fn: (r) => (r.date ? new Date(r.date).toISOString() : null) },
      type: { col: 'type', fn: (r) => str(r.type) || 'subscription' }, status: { col: 'status', fn: (r) => str(r.status) || 'pending' },
      payment: { col: 'payment', fn: (r) => safeJson(r.payment) },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) ?? { usertype: str(r.usertype), paydetails: safeJson(r.paydetails) } },
    },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'uid' }],
  },
  {
    resource: 'ticket', model: 'Ticket', oldDb: 'lakshya', oldTable: 'in_tickets', whereSince: 'updatedtimestr',
    fields: {
      title: 'title', message: { col: 'message', fn: (r) => str(r.message) },
      priority: { col: 'priority', fn: (r) => str(r.priority) || 'medium' }, status: { col: 'status', fn: (r) => str(r.status) || 'open' },
      type: { col: 'type', fn: (r) => str(r.type) || 'general' },
      uploads: { col: 'last', fn: (r) => safeJson(r.last) },
    },
    selfRelation: { newField: 'parent', oldField: 'parent' },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'uid' }, { oldField: 'mid', resource: 'module', newField: 'moduleId' }],
  },
  {
    resource: 'notice', model: 'Notice', oldDb: 'lakshya', oldTable: 'in_messages', whereSince: 'updatedtimestr',
    fields: {
      message: 'message', type: { col: 'type', fn: (r) => str(r.type) || 'inapp' }, subtype: { col: 'subtype', fn: (r) => str(r.subtype) },
      totype: { col: 'totype', fn: (r) => str(r.totype) || 'user' }, status: { col: 'status', fn: (r) => str(r.status) || 'sent' },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
    fks: [{ oldField: 'toid', resource: 'user', newField: 'toid' }, { oldField: 'fromid', resource: 'user', newField: 'fromid' }],
  },

  // ============ E-COMMERCE (lakshya.ecom_*) ============
  {
    resource: 'product', model: 'Product', oldDb: 'lakshya', oldTable: 'ecom_products', whereSince: 'updatedtimestr',
    fields: {
      title: 'title', slug: { col: 'title', fn: (r) => slugify(r.title) },
      description: { col: 'description', fn: (r) => str(r.description) },
      price: { col: 'price', fn: (r) => num(r.price) ?? 0 },
      compareAtPrice: { col: 'compare_price', fn: (r) => num(r.compare_price) },
      costPrice: { col: 'cost_price', fn: (r) => num(r.cost_price) },
      brand: { col: 'brand_name', fn: (r) => str(r.brand_name) }, vendor: { col: 'vendor', fn: (r) => str(r.vendor) },
      sku: { col: 'sku', fn: (r) => str(r.sku) },
      categories: { col: 'categories', fn: (r) => safeJson(r.categories) },
      images: { col: 'images', fn: (r) => safeJson(r.images) },
      tags: { col: 'tags', fn: (r) => jsonArr(r.tags) },
      gstPercent: { col: 'gst_percent', fn: (r) => num(r.gst_percent) },
      subscriptionType: { col: 'subscription_type', fn: (r) => str(r.subscription_type) },
      subscriptionDays: { col: 'subscription_days', fn: (r) => num(r.subscription_days) },
      status: { col: 'product_status', fn: (r) => str(r.product_status) || 'active' },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'ownerId' }, { oldField: 'examid', resource: 'exam', newField: 'examId' }],
  },
  {
    resource: 'order', model: 'Order', oldDb: 'lakshya', oldTable: 'ecom_orders', whereSince: 'updatedtimestr',
    fields: {
      title: { col: 'title', fn: (r) => str(r.title) },
      // ecom_orders has no `amount` column — total is derived from the `items` JSON array.
      total: { col: 'items', fn: (r) => { const items = safeJson(r.items); return Array.isArray(items) ? items.reduce((s: any, i: any) => s + (Number(i?.price) || 0) * (Number(i?.qty) || 1), 0) : 0; } },
      status: { col: 'status', fn: (r) => str(r.status) || 'pending' },
      address: { col: 'address', fn: (r) => safeJson(r.address) },
      buyerNote: { col: 'buyer_note', fn: (r) => str(r.buyer_note) },
      trackingLink: { col: 'tracking_link', fn: (r) => str(r.tracking_link) },
      paymentRef: { col: 'payment_details', fn: (r) => str(r.payment_details) },
      subscriptionExpire: { col: 'subscription_expire', fn: (r) => (r.subscription_expire ? new Date(r.subscription_expire).toISOString() : null) },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'userId' }],
  },
  {
    resource: 'review', model: 'Review', oldDb: 'lakshya', oldTable: 'ecom_reviews', whereSince: 'updatedtimestr',
    fields: {
      rating: { col: 'rating', fn: (r) => num(r.rating) ?? 0 },
      title: { col: 'name', fn: (r) => str(r.name) }, body: { col: 'comment', fn: (r) => str(r.comment) },
      images: { col: 'image', fn: (r) => (r.image ? [str(r.image)] : []) },
      featured: { col: 'featured', fn: (r) => r.featured === '1' || r.featured === 1 },
      tags: { col: 'tags', fn: (r) => jsonArr(r.tags) },
      status: { col: 'status', fn: (r) => str(r.status) || 'pending' },
    },
    fks: [{ oldField: 'pid', resource: 'product', newField: 'productId' }, { oldField: 'uid', resource: 'user', newField: 'userId' }, { oldField: 'vid', resource: 'videolist', newField: 'videoId' }],
  },
  {
    resource: 'coupon', model: 'Coupon', oldDb: 'lakshya', oldTable: 'ecom_coupons', whereSince: 'updatedtimestr',
    fields: {
      code: { col: 'coupon_code', fn: (r) => str(r.coupon_code) },
      description: { col: 'description', fn: (r) => str(r.description) },
      type: { col: 'discount_type', fn: (r) => str(r.discount_type) || 'percent' },
      value: { col: 'amount', fn: (r) => num(r.amount) ?? 0 },
      minAmount: { col: 'min_cart_amount', fn: (r) => num(r.min_cart_amount) },
      maxDiscountAmount: { col: 'max_discount_amount', fn: (r) => num(r.max_discount_amount) },
      maxUses: { col: 'max_usage', fn: (r) => num(r.max_usage) },
      applyOn: { col: 'apply_on', fn: (r) => str(r.apply_on) },
      image: { col: 'image', fn: (r) => str(r.image) }, banner: { col: 'banner', fn: (r) => str(r.banner) },
      expiresAt: { col: 'expiry_date', fn: (r) => (r.expiry_date ? new Date(r.expiry_date).toISOString() : null) },
      status: { col: 'status', fn: (r) => str(r.status) || 'active' },
    },
  },
  {
    resource: 'subscription', model: 'Subscription', oldDb: 'lakshya', oldTable: 'ecom_subscriptions', whereSince: 'updatedtimestr',
    fields: {
      plan: { col: 'plan', fn: (r) => str(r.plan) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      currentPeriodEnd: { col: 'subscription_expire', fn: (r) => (r.subscription_expire ? new Date(r.subscription_expire).toISOString() : null) },
      purchased: { col: 'purchased', fn: (r) => (r.purchased ? new Date(r.purchased).toISOString() : null) },
    },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'userId' }, { oldField: 'pid', resource: 'product', newField: 'productId' }, { oldField: 'vid', resource: 'videolist', newField: 'videoId' }, { oldField: 'examid', resource: 'exam', newField: 'examId' }],
  },
  {
    resource: 'category', model: 'Category', oldDb: 'lakshya', oldTable: 'ecom_category', whereSince: 'updatedtimestr',
    fields: {
      name: 'name', slug: { col: 'stub', fn: (r) => str(r.stub) || slugify(r.name) },
      image: { col: 'image', fn: (r) => str(r.image) }, description: { col: 'description', fn: (r) => str(r.description) },
      status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      extra: { col: 'featured', fn: (r) => ({ featured: r.featured === '1', uid: str(r.uid) }) },
    },
    selfRelation: { newField: 'parentId', oldField: 'parent' },
  },
  {
    resource: 'topic', model: 'Topic', oldDb: 'lakshya', oldTable: 'lk_topics', whereSince: 'updatedtimestr',
    fields: {
      name: 'name', content: { col: 'content', fn: (r) => str(r.content) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) ?? { slug: str(r.alt), image: str(r.imp), tags: jsonArr(r.tag) } },
    },
    selfRelation: { newField: 'parentId', oldField: 'parentid' },
  },
  {
    resource: 'quiz', model: 'Quiz', oldDb: 'lakshya', oldTable: 'lk_quiz', whereSince: 'updatedtimestr',
    fields: {
      quesLevel: { col: 'ques_level', fn: (r) => str(r.ques_level) || 'medium' },
      quesLang: { col: 'ques_lang', fn: (r) => str(r.ques_lang) || 'english' },
      quesType: { col: 'ques_type', fn: (r) => str(r.ques_type) || 'mcq' },
      question: { col: 'extra', fn: (r) => { const e = safeJson(r.extra); return (e && (e as any).question) || ''; } },
      answer: { col: 'extra', fn: (r) => { const e = safeJson(r.extra); return (e && (e as any).answer) || {}; } },
      correctAns: { col: 'extra', fn: (r) => { const e = safeJson(r.extra); return (e && (e as any).correct_ans) || ''; } },
      solution: { col: 'extra', fn: (r) => { const e = safeJson(r.extra); return (e && (e as any).solution) || ''; } },
      marks: { col: 'marks', fn: (r) => num(r.marks) ?? 1 },
      quesTag: { col: 'ques_tag', fn: (r) => jsonArr(r.ques_tag) }, examTag: { col: 'exam_tag', fn: (r) => jsonArr(r.exam_tag) },
      status: { col: 'status', fn: (r) => str(r.status) || 'pending' }, likeCount: { col: 'like_count', fn: (r) => num(r.like_count) ?? 0 },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
    fks: [{ oldField: 'topicid', resource: 'topic', newField: 'topicId' }],
  },
  {
    resource: 'quizset', model: 'QuizSet', oldDb: 'lakshya', oldTable: 'lk_quiz_set', whereSince: 'updatedtimestr',
    fields: {
      name: 'title', numQuiz: { col: 'num_quiz', fn: (r) => num(r.num_quiz) ?? 0 }, description: { col: 'content', fn: (r) => str(r.content) },
      status: { col: 'status', fn: (r) => str(r.status) || 'draft' },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) ?? {
        subtitle: str(r.subtitle), precontent: str(r.precontent), questions: safeJson(r.questions),
        testType: str(r.test_type), testTime: num(r.test_time), tags: jsonArr(r.tags),
      } },
    },
    fks: [{ oldField: 'topicid', resource: 'topic', newField: 'topicId' }, { oldField: 'exam', resource: 'exam', newField: 'examId' }],
  },
  {
    resource: 'exam', model: 'Exam', oldDb: 'lakshya', oldTable: 'lk_exams', whereSince: 'updatedtimestr',
    fields: {
      name: 'name', examType: { col: 'exam_type', fn: (r) => jsonArr(r.exam_type) },
      examGroup: { col: 'exam_group', fn: (r) => jsonArr(r.exam_group) }, seoGroup: { col: 'seo_group', fn: (r) => jsonArr(r.seo_group) },
      status: { col: 'status', fn: (r) => str(r.status) || 'draft' },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) ?? { slug: str(r.slug), alt: str(r.alt), tags: jsonArr(r.tags), logo: str(r.logo), banner: str(r.banner), featured: r.featured === '1' } },
    },
    selfRelation: { newField: 'parentId', oldField: 'parentid' },
    fks: [{ oldField: 'topiclist', resource: 'topic', newField: 'topicId' }],
  },
  {
    resource: 'note', model: 'Note', oldDb: 'lakshya', oldTable: 'lk_notes', whereSince: 'updatedtimestr',
    fields: {
      title: 'title', body: { col: 'content', fn: (r) => str(r.content) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) ?? { pdf: str(r.pdf), image: str(r.image), tags: jsonArr(r.tags), exam: str(r.exam) } },
    },
    fks: [{ oldField: 'topicid', resource: 'topic', newField: 'topicId' }, { oldField: 'exam', resource: 'exam', newField: 'examId' }],
  },
  {
    resource: 'liveclass', model: 'LiveClass', oldDb: 'lakshya', oldTable: 'lk_liveclass', whereSince: 'updatedtimestr',
    fields: {
      title: 'title', description: { col: 'description', fn: (r) => str(r.description) },
      instructor: { col: 'instructor', fn: (r) => str(r.instructor) }, link: { col: 'link', fn: (r) => str(r.link) },
      image: { col: 'image', fn: (r) => str(r.image) },
      datetime: { col: 'datetime', fn: (r) => (r.datetime ? new Date(r.datetime).toISOString() : null) },
      duration: { col: 'duration', fn: (r) => num(r.duration) ?? 0 },
      subject: { col: 'subject', fn: (r) => str(r.subject) }, series: { col: 'series', fn: (r) => str(r.series) },
      session: { col: 'session', fn: (r) => str(r.session) }, tags: { col: 'tags', fn: (r) => jsonArr(r.tags) },
      status: { col: 'status', fn: (r) => str(r.status) || 'upcoming' }, recordings: { col: 'recordings', fn: (r) => safeJson(r.recordings) },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
  },
  {
    resource: 'videolist', model: 'VideoList', oldDb: 'lakshya', oldTable: 'lk_videolist', whereSince: 'updatedtimestr',
    fields: {
      title: 'title', content: { col: 'content', fn: (r) => str(r.content) },
      vid: { col: 'vid', fn: (r) => str(r.vid) }, ytVid: { col: 'yt_vid', fn: (r) => str(r.yt_vid) }, hlsVid: { col: 'hls_vid', fn: (r) => str(r.hls_vid) },
      priority: { col: 'priority', fn: (r) => num(r.priority) ?? 0 }, status: { col: 'status', fn: (r) => str(r.status) || 'active' },
      mirrors: { col: 'mirrors', fn: (r) => safeJson(r.mirrors) }, ecomPlan: { col: 'ecom_plan', fn: (r) => safeJson(r.ecom_plan) },
      extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
    fks: [{ oldField: 'topicid', resource: 'topic', newField: 'topicId' }, { oldField: 'exam', resource: 'exam', newField: 'examId' }],
  },
  {
    resource: 'quizcomment', model: 'QuizComment', oldDb: 'lakshya', oldTable: 'lk_comments', whereSince: 'updatedtimestr',
    fields: {
      name: { col: 'name', fn: (r) => str(r.name) }, email: { col: 'email', fn: (r) => str(r.email) }, comment: { col: 'comment', fn: (r) => str(r.comment) },
      likeCount: { col: 'like_count', fn: (r) => num(r.like_count) ?? 0 }, upvote: { col: 'upvote', fn: (r) => num(r.upvote) ?? 0 }, downvote: { col: 'downvote', fn: (r) => num(r.downvote) ?? 0 },
      status: { col: 'status', fn: (r) => str(r.status) || 'pending' },
    },
    fks: [{ oldField: 'qid', resource: 'quiz', newField: 'qid' }, { oldField: 'uid', resource: 'user', newField: 'uid' }, { oldField: 'nid', resource: 'note', newField: 'noteId' }],
  },
  {
    resource: 'askquestion', model: 'AskQuestion', oldDb: 'lakshya', oldTable: 'lk_ask_question', whereSince: 'updatedtimestr',
    fields: {
      question: { col: 'question', fn: (r) => str(r.question) }, status: { col: 'status', fn: (r) => str(r.status) || 'pending' },
      extra: { col: 'image', fn: (r) => safeJson(r.image) },
    },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'userId' }],
  },
  {
    resource: 'raiseproblem', model: 'RaiseProblem', oldDb: 'lakshya', oldTable: 'lk_raise_problems', whereSince: 'updatedtimestr',
    fields: {
      problem: { col: 'problem', fn: (r) => str(r.problem) }, issue: { col: 'issue', fn: (r) => str(r.issue) },
      url: { col: 'url', fn: (r) => str(r.url) }, status: { col: 'status', fn: (r) => str(r.status) || 'pending' },
    },
    fks: [{ oldField: 'qid', resource: 'quiz', newField: 'quizId' }, { oldField: 'uid', resource: 'user', newField: 'userId' }, { oldField: 'nid', resource: 'note', newField: 'noteId' }],
  },
  {
    resource: 'event', model: 'Event', oldDb: 'lakshya', oldTable: 'lk_events', whereSince: 'updatedtimestr',
    fields: {
      name: 'name', email: { col: 'email', fn: (r) => str(r.email) }, phone: { col: 'phone', fn: (r) => str(r.phone) },
      reason: { col: 'reason', fn: (r) => str(r.reason) }, status: { col: 'status', fn: (r) => str(r.status) || 'new' },
      tags: { col: 'tags', fn: (r) => jsonArr(r.tags) }, extra: { col: 'extra', fn: (r) => safeJson(r.extra) },
    },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'uid' }],
  },

  // ============ NOT ON THIS SERVER (different host / not present) — skipped ============
  { resource: 'blogpost', model: 'BlogPost', oldDb: 'blogdb', oldTable: 'blog_posts', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { title: { col: 'name', fn: (r) => str(r.name) }, slug: { col: 'stub', fn: (r) => str(r.stub) || slugify(r.name) }, body: { col: 'content', fn: (r) => str(r.content) }, status: { col: 'status', fn: (r) => str(r.status) || 'draft' } },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'authorId' }] },
  { resource: 'currentaffairs', model: 'CurrentAffairs', oldDb: 'lakshya_exp', oldTable: 'currentaffairs', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { title: 'title', link: { col: 'link', fn: (r) => str(r.link) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' } } },
  { resource: 'orderitem', model: 'OrderItem', oldDb: 'lakshya', oldTable: 'ecom_order_items', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { qty: { col: 'quantity', fn: (r) => num(r.quantity) ?? 1 }, price: { col: 'price', fn: (r) => num(r.price) ?? 0 } },
    fks: [{ oldField: 'oid', resource: 'order', newField: 'orderId' }, { oldField: 'pid', resource: 'product', newField: 'productId' }] },
  { resource: 'cart', model: 'Cart', oldDb: 'lakshya', oldTable: 'ecom_carts', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { status: { col: 'status', fn: (r) => str(r.status) || 'active' } } },
  { resource: 'cartitem', model: 'CartItem', oldDb: 'lakshya', oldTable: 'ecom_cart_items', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { qty: { col: 'quantity', fn: (r) => num(r.quantity) ?? 1 }, price: { col: 'price', fn: (r) => num(r.price) ?? 0 } },
    fks: [{ oldField: 'cid', resource: 'cart', newField: 'cartId' }, { oldField: 'pid', resource: 'product', newField: 'productId' }] },
  { resource: 'role', model: 'Role', oldDb: 'lakshya', oldTable: 'in_roles', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { key: 'key', name: { col: 'name', fn: (r) => str(r.name) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' } } },
  { resource: 'contact', model: 'Contact', oldDb: 'lakshya', oldTable: 'in_contacts', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { firstName: { col: 'name', fn: (r) => str(r.name) || 'Unknown' }, email: { col: 'email', fn: (r) => str(r.email) }, status: { col: 'status', fn: (r) => str(r.status) || 'lead' } } },
  { resource: 'staff', model: 'Staff', oldDb: 'lakshya', oldTable: 'in_staff', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { name: 'name', email: { col: 'email', fn: (r) => str(r.email) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' } } },
  { resource: 'publisherprofile', model: 'PublisherProfile', oldDb: 'lakshya', oldTable: 'in_publisher_profile', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { name: 'name', email: { col: 'email', fn: (r) => str(r.email) } } },
  { resource: 'publishertoken', model: 'PublisherToken', oldDb: 'lakshya', oldTable: 'in_tokens', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { name: 'name', token: { col: 'token', fn: (r) => str(r.token) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' } } },
  { resource: 'media', model: 'Media', oldDb: 'lakshya', oldTable: 'in_media', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { name: { col: 'alt', fn: (r) => str(r.alt) }, path: { col: 'url', fn: (r) => str(r.url) } } },
  { resource: 'blogcategory', model: 'BlogCategory', oldDb: 'blogdb', oldTable: 'blog_categories', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { name: 'name', status: { col: 'status', fn: (r) => str(r.status) || 'active' } } },
  { resource: 'blogcomment', model: 'BlogComment', oldDb: 'blogdb', oldTable: 'blog_comments', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { name: 'name', comment: { col: 'comment', fn: (r) => str(r.comment) }, status: { col: 'status', fn: (r) => str(r.status) || 'pending' } },
    fks: [{ oldField: 'uid', resource: 'user', newField: 'authorId' }] },
  { resource: 'successstory', model: 'SuccessStory', oldDb: 'blogdb', oldTable: 'wstories', skipIfMissing: true, whereSince: 'updatedtimestr',
    fields: { name: 'name', description: { col: 'desc', fn: (r) => str(r.desc) }, status: { col: 'status', fn: (r) => str(r.status) || 'active' } } },
];
