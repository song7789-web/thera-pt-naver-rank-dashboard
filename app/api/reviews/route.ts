import { env } from 'cloudflare:workers';

type RuntimeEnv = { DB?: D1Database };
type ReviewBody = { date?: string; visitorReviews?: number; blogReviews?: number };

function runtimeEnv() { return env as unknown as RuntimeEnv; }

export async function GET() {
  const db = runtimeEnv().DB;
  if (!db) return Response.json({ history: [], stored: false });
  const result = await db.prepare('SELECT snapshot_date as date, visitor_reviews as visitor, blog_reviews as blog, total_reviews as total, source FROM review_snapshots ORDER BY snapshot_date DESC LIMIT 90').all();
  return Response.json({ history: result.results ?? [], stored: true });
}

export async function POST(request: Request) {
  const db = runtimeEnv().DB;
  if (!db) return Response.json({ ok: false, code: 'DB_MISSING', message: '저장 공간이 연결되지 않았습니다.' }, { status: 503 });
  const body = await request.json() as ReviewBody;
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  const visitor = body.visitorReviews;
  const blog = body.blogReviews;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof visitor !== 'number' || typeof blog !== 'number' || !Number.isInteger(visitor) || !Number.isInteger(blog) || visitor < 0 || blog < 0) return Response.json({ ok: false, code: 'INVALID_REVIEW_COUNTS' }, { status: 400 });
  const total = visitor + blog;
  await db.prepare('INSERT INTO review_snapshots (snapshot_date, visitor_reviews, blog_reviews, total_reviews, source) VALUES (?, ?, ?, ?, ?) ON CONFLICT(snapshot_date) DO UPDATE SET visitor_reviews = excluded.visitor_reviews, blog_reviews = excluded.blog_reviews, total_reviews = excluded.total_reviews, source = excluded.source').bind(date, visitor, blog, total, 'manual').run();
  return Response.json({ ok: true, date, visitor, blog, total, source: 'manual' });
}
