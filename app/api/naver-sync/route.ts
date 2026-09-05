import { env } from 'cloudflare:workers';
import { trackedKeywords } from '@/lib/keywords';

const PLACE_NAME = '테라 PT 언주역점';
const PLACE_ID = '1846137508';

type NaverResult = { title?: string; address?: string; roadAddress?: string; link?: string };
type NaverResponse = { items?: NaverResult[]; total?: number };
type RuntimeEnv = { DB?: D1Database; NAVER_CLIENT_ID?: string; NAVER_CLIENT_SECRET?: string };

function runtimeEnv() { return env as unknown as RuntimeEnv; }

function cleanTitle(title = '') { return title.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'); }

async function naverSearch(path: string, query: string): Promise<NaverResponse> {
  const runtime = runtimeEnv();
  if (!runtime.NAVER_CLIENT_ID || !runtime.NAVER_CLIENT_SECRET) throw new Error('NAVER_API_KEYS_MISSING');
  const response = await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/${path}?query=${encodeURIComponent(query)}&display=5&sort=random&format=json`, {
    headers: { 'X-NCP-APIGW-API-KEY-ID': runtime.NAVER_CLIENT_ID, 'X-NCP-APIGW-API-KEY': runtime.NAVER_CLIENT_SECRET },
  });
  if (!response.ok) throw new Error(`NAVER_API_${response.status}`);
  return response.json() as Promise<NaverResponse>;
}

async function collectKeyword(keyword: string) {
  const local = await naverSearch('local', keyword);
  const matchIndex = (local.items ?? []).findIndex(item => cleanTitle(item.title).includes(PLACE_NAME.replace(' ', '')) || cleanTitle(item.title).includes('테라 PT 언주역점'));
  return { keyword, rank: matchIndex >= 0 ? matchIndex + 1 : null, source: 'NAVER_LOCAL_API', resultCount: local.items?.length ?? 0 };
}

export async function GET() {
  const runtime = runtimeEnv();
  return Response.json({
    connected: Boolean(runtime.NAVER_CLIENT_ID && runtime.NAVER_CLIENT_SECRET),
    placeId: PLACE_ID,
    placeName: PLACE_NAME,
    keywordCount: trackedKeywords.length,
    capabilities: {
      localSearchRank: 'NAVER_API_HUB_LOCAL_SEARCH',
      blogSearch: 'NAVER_BLOG_API_RESULT_COUNT',
      visitorReviewCount: 'UNAVAILABLE_OFFICIAL_API',
    },
    message: runtime.NAVER_CLIENT_ID ? '네이버 API 키가 설정되어 있습니다.' : 'NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 설정이 필요합니다.',
  });
}

export async function POST() {
  const runtime = runtimeEnv();
  if (!runtime.NAVER_CLIENT_ID || !runtime.NAVER_CLIENT_SECRET) return Response.json({ ok: false, code: 'NAVER_API_KEYS_MISSING', message: '네이버 API 키를 먼저 설정해 주세요.' }, { status: 503 });
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const results: Array<{ keyword: string; rank: number | null; source: string }> = [];
  for (let index = 0; index < trackedKeywords.length; index += 5) {
    const batch = trackedKeywords.slice(index, index + 5);
    const chunk = await Promise.all(batch.map(collectKeyword));
    results.push(...chunk);
  }
  if (runtime.DB) {
    await runtime.DB.batch(results.map(result => runtime.DB!.prepare('INSERT INTO rank_snapshots (snapshot_date, keyword, rank, source) VALUES (?, ?, ?, ?) ON CONFLICT(snapshot_date, keyword) DO UPDATE SET rank = excluded.rank, source = excluded.source').bind(snapshotDate, result.keyword, result.rank, result.source)));
  }
  return Response.json({ ok: true, snapshotDate, placeName: PLACE_NAME, placeId: PLACE_ID, results, stored: Boolean(runtime.DB), note: '네이버 지역 검색 API 기준 순위입니다. 플레이스 통합검색의 실제 노출 순위와 다를 수 있습니다.' });
}
