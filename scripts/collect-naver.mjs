import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPlaceRank } from './collector-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(resolve(root, 'data/keywords.json'), 'utf8'));
const clientId = process.env.NAVER_CLIENT_ID;
const clientSecret = process.env.NAVER_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error('NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 환경변수가 필요합니다.');
}

const keywords = [...new Set(Object.values(config.groups).flat())];
const apiUrl = 'https://naverapihub.apigw.ntruss.com/search/v1/local';
const today = process.env.COLLECTION_DATE ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

async function fetchLocalResults(keyword) {
  const url = new URL(apiUrl);
  url.searchParams.set('query', keyword);
  url.searchParams.set('display', '5');
  url.searchParams.set('start', '1');
  url.searchParams.set('sort', 'random');
  url.searchParams.set('format', 'json');
  const response = await fetch(url, { headers: { 'X-NCP-APIGW-API-KEY-ID': clientId, 'X-NCP-APIGW-API-KEY': clientSecret } });
  if (!response.ok) throw new Error(`네이버 API 오류 ${response.status}: ${keyword}`);
  return response.json();
}

const rankings = [];
for (const keyword of keywords) {
  const payload = await fetchLocalResults(keyword);
  const rank = findPlaceRank(payload.items ?? [], config.placeName, config.placeId);
  rankings.push({ keyword, group: Object.entries(config.groups).find(([, values]) => values.includes(keyword))?.[0] ?? '기타', rank, checked: rank !== null, status: rank === null ? 'outside_top_5' : 'found' });
}

const outputPath = resolve(root, 'public/data/dashboard.json');
let previous = {};
try { previous = JSON.parse(await readFile(outputPath, 'utf8')); } catch { /* first collection */ }
const output = {
  version: 1,
  mode: 'live',
  date: today,
  collectedAt: new Date().toISOString(),
  place: { name: config.placeName, id: config.placeId },
  rankSource: 'NAVER API HUB 지역검색 · 정확도순 · 상위 5개 결과',
  rankings,
  review: previous.review ?? { status: 'manual_required', latest: null, history: [] },
  notes: ['지역검색 API는 한 번에 최대 5개 결과만 제공하므로 5위 밖은 미확인으로 표시됩니다.', '방문자 리뷰 수와 플레이스 블로그 리뷰 수는 NAVER API HUB 공개 응답에 포함되지 않아 수동 입력으로 유지합니다.'],
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`네이버 지역검색 ${rankings.length}개 키워드 수집 완료: ${outputPath}`);
