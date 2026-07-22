// apps/api/src/__tests__/lms.integration.test.ts
// Phase 22 — LMS / Quiz domain resources (Quiz, QuizSet, Exam, Note).
// Verifies the metadata-driven CRUD loop works for the newly-added resources
// reverse-engineered from old ClickHouse quiz/* packages.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000t0';
const token = signToken({ uid: 'a', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
const auth = { authorization: `Bearer ${token}` };

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' });
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

async function createTopic(): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/topic', headers: auth, payload: { name: 'T-' + randomUUID().slice(0, 6) } });
  return r.json().data.id;
}

describe('Phase 22 LMS resources', () => {
  let topicId: string;
  beforeAll(async () => { topicId = await createTopic(); });

  it('all LMS resources present in /api/meta', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/meta', headers: auth });
    expect(res.json().data).toEqual(expect.arrayContaining(['quiz', 'quizset', 'exam', 'note', 'topic']));
  });

  // ---- Quiz ----
  it('POST /api/quiz creates with enum + json answer + tags', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/quiz', headers: auth,
      payload: {
        topicId, quesLevel: 'easy', quesLang: 'english', quesType: 'mcq',
        question: '2+2?', answer: ['2', '3', '4', '5'], correctAns: '4', marks: 2,
        quesTag: ['arith'], examTag: ['ntse'],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.quesType).toBe('mcq');
    expect(res.json().data.answer).toEqual(['2', '3', '4', '5']);
    expect(res.json().data.marks).toBe(2);
    expect(res.json().data.quesTag).toEqual(['arith']);
  });

  it('POST /api/quiz rejects missing required question', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quiz', headers: auth, payload: { topicId } });
    expect(res.statusCode).toBe(422);
  });

  it('GET /api/quiz filters by quesType', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/quiz?filters=' + encodeURIComponent(JSON.stringify({ quesType: 'mcq' })), headers: auth });
    expect(res.json().status).toBe(1);
    expect(Array.isArray(res.json().data.data)).toBe(true);
    expect(res.json().data.data.every((q: any) => q.quesType === 'mcq')).toBe(true);
  });

  // ---- QuizSet ----
  it('POST /api/quizset creates; GET lists', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/quizset', headers: auth, payload: { name: 'Set-' + randomUUID().slice(0, 6), topicId, topicList: [topicId], numQuiz: 0 } });
    expect(c.statusCode).toBe(201);
    const l = await app.inject({ method: 'GET', url: '/api/quizset', headers: auth });
    expect(l.json().status).toBe(1);
  });

  // ---- Exam (self-relation) ----
  it('POST /api/exam creates; parent self-relation works', async () => {
    const parent = await app.inject({ method: 'POST', url: '/api/exam', headers: auth, payload: { name: 'Board-' + randomUUID().slice(0, 6) } });
    expect(parent.statusCode).toBe(201);
    const child = await app.inject({ method: 'POST', url: '/api/exam', headers: auth, payload: { name: 'Class-' + randomUUID().slice(0, 6), parentId: parent.json().data.id, examType: ['cbse'] } });
    expect(child.statusCode).toBe(201);
    expect(child.json().data.parentId).toBe(parent.json().data.id);
    expect(child.json().data.examType).toEqual(['cbse']);
  });

  // ---- Note ----
  it('POST /api/note creates; GET/UPDATE/DELETE cycle', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/note', headers: auth, payload: { title: 'N-' + randomUUID().slice(0, 6), topicId, body: 'notes', order: 1 } });
    expect(c.statusCode).toBe(201);
    const id = c.json().data.id;
    const u = await app.inject({ method: 'PATCH', url: `/api/note/${id}`, headers: auth, payload: { status: 'hidden' } });
    expect(u.json().data.status).toBe('hidden');
    const d = await app.inject({ method: 'DELETE', url: `/api/note/${id}`, headers: auth });
    expect(d.statusCode).toBe(200);
  });

  // ---- tenant isolation ----
  it('LMS rows are tenant-scoped (other tenant sees nothing)', async () => {
    const other = signToken({ uid: 'b', tenantId: '11111111-1111-1111-1111-111111111111', role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
    const res = await app.inject({ method: 'GET', url: '/api/quiz', headers: { authorization: `Bearer ${other}` } });
    expect(res.json().data.data.length).toBe(0);
  });
});

// ---- LMS delivery + engagement (Phase 22, continued) ----
describe('Phase 22 LMS delivery/engagement resources', () => {
  let topicId: string;
  let quizId: string;
  beforeAll(async () => {
    topicId = await createTopic();
    const q = await app.inject({ method: 'POST', url: '/api/quiz', headers: auth, payload: { topicId, question: 'Q-' + randomUUID().slice(0, 6), quesType: 'mcq' } });
    quizId = q.json().data.id;
  });

  it('POST /api/liveclass creates with datetime + json recordings', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/liveclass', headers: auth,
      payload: { title: 'LC-' + randomUUID().slice(0, 6), instructor: 'Dr. X', datetime: '2026-08-01T10:00:00Z', duration: 3600, topicId, recordings: [{ url: 'https://x/y.mp4' }], tags: ['free'] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.recordings).toEqual([{ url: 'https://x/y.mp4' }]);
    expect(res.json().data.duration).toBe(3600);
  });

  it('POST /api/videolist creates; PATCH updates priority', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/videolist', headers: auth, payload: { title: 'V-' + randomUUID().slice(0, 6), topicId, ytVid: 'abc123', mirrors: ['https://m1'] } });
    expect(c.statusCode).toBe(201);
    const u = await app.inject({ method: 'PATCH', url: `/api/videolist/${c.json().data.id}`, headers: auth, payload: { priority: 5 } });
    expect(u.json().data.priority).toBe(5);
  });

  it('POST /api/quizcomment requires qid; creates', async () => {
    const bad = await app.inject({ method: 'POST', url: '/api/quizcomment', headers: auth, payload: { comment: 'nice' } });
    expect(bad.statusCode).toBe(422);
    const ok = await app.inject({ method: 'POST', url: '/api/quizcomment', headers: auth, payload: { qid: quizId, name: 'Anon', comment: 'great q', upvote: 2 } });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().data.upvote).toBe(2);
  });

  it('POST /api/currentaffairs creates; GET filters by status', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/currentaffairs', headers: auth, payload: { title: 'CA-' + randomUUID().slice(0, 6), link: 'https://news/x', date: '2026-07-20T00:00:00Z' } });
    expect(c.statusCode).toBe(201);
    const l = await app.inject({ method: 'GET', url: '/api/currentaffairs?filters=' + encodeURIComponent(JSON.stringify({ status: 'active' })), headers: auth });
    expect(l.json().data.data.every((r: any) => r.status === 'active')).toBe(true);
  });
});

