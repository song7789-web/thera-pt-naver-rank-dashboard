import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { extractPlaceId, findRenderedPlaceRank, isNaverSecurityChallenge } from './collector-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(resolve(root, 'data/keywords.json'), 'utf8'));
const allKeywords = [...new Set(Object.values(config.groups).flat())];
const requestedKeywords = process.env.COLLECT_KEYWORDS?.split(',').map(value => value.trim()).filter(Boolean);
const keywords = requestedKeywords?.length ? allKeywords.filter(keyword => requestedKeywords.includes(keyword)) : allKeywords;
const today = process.env.COLLECTION_DATE ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const maximumRank = Number(config.maximumRank ?? 50);
const outputPath = resolve(root, process.env.COLLECTION_OUTPUT ?? 'public/data/dashboard.json');

async function readPlaceEntries(page) {
  return page.locator('a.XCvzh').evaluateAll((anchors) => anchors.map((anchor) => ({
    href: anchor.href,
    isAd: anchor.href.includes('ader.naver.com'),
  })));
}

async function collectKeyword(page, keyword) {
  const url = new URL('https://m.place.naver.com/rest/list');
  url.searchParams.set('query', keyword);
  url.searchParams.set('sortingOrder', 'precision');
  url.searchParams.set('level', 'top');
  url.searchParams.set('entry', 'pll');

  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 });
  const pageText = await page.locator('body').innerText().catch(() => '');
  if (isNaverSecurityChallenge(pageText)) {
    throw new Error('NAVER_SECURITY_CHECK: 네이버 보안확인 또는 접근 제한이 표시되었습니다.');
  }
  await page.locator('a.XCvzh').first().waitFor({ state: 'attached', timeout: 30_000 });

  let entries = [];
  let previousOrganicCount = -1;
  let unchangedRounds = 0;
  for (let round = 0; round < 12; round += 1) {
    entries = await readPlaceEntries(page);
    const rank = findRenderedPlaceRank(entries, config.placeId);
    const organicCount = new Set(entries.filter(entry => !entry.isAd).map(entry => extractPlaceId(entry.href)).filter(Boolean)).size;
    if (rank !== null || organicCount >= maximumRank) break;
    unchangedRounds = organicCount === previousOrganicCount ? unchangedRounds + 1 : 0;
    if (unchangedRounds >= 2) break;
    previousOrganicCount = organicCount;
    await page.evaluate(() => document.scrollingElement?.scrollTo(0, document.scrollingElement.scrollHeight));
    await page.waitForTimeout(1_200);
  }

  const rank = findRenderedPlaceRank(entries, config.placeId);
  const observedCount = new Set(entries.filter(entry => !entry.isAd).map(entry => extractPlaceId(entry.href)).filter(Boolean)).size;
  return { rank, observedCount };
}

async function collectKeywordWithRetry(page, keyword) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await collectKeyword(page, keyword);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await page.goto('about:blank');
        await page.waitForTimeout(1_500);
      }
    }
  }
  throw lastError;
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}),
});
const context = await browser.newContext({
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  geolocation: { latitude: config.location.latitude, longitude: config.location.longitude },
  permissions: ['geolocation'],
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36',
});
const page = await context.newPage();
const rankings = [];

try {
  for (const keyword of keywords) {
    const group = Object.entries(config.groups).find(([, values]) => values.includes(keyword))?.[0] ?? '기타';
    try {
      const { rank, observedCount } = await collectKeywordWithRetry(page, keyword);
      rankings.push({ keyword, group, rank, checked: rank !== null, status: rank === null ? `outside_top_${Math.min(observedCount, maximumRank)}` : 'found', observedCount });
      console.log(`${keyword}: ${rank === null ? `${observedCount}위 밖` : `${rank}위`}`);
    } catch (error) {
      rankings.push({ keyword, group, rank: null, checked: false, status: 'collection_error', error: error instanceof Error ? error.message : String(error) });
      const pageSummary = await page.locator('body').innerText().catch(() => '본문 확인 실패');
      console.error(`${keyword}: 수집 실패 · ${await page.title()} · ${page.url()} · ${pageSummary.slice(0, 300).replace(/\s+/g, ' ')}`);
    }
    await page.waitForTimeout(500);
  }
} finally {
  await browser.close();
}

let previous = {};
try { previous = JSON.parse(await readFile(outputPath, 'utf8')); } catch { /* first collection */ }
const output = {
  version: 2,
  mode: 'live',
  date: today,
  collectedAt: new Date().toISOString(),
  place: { name: config.placeName, id: config.placeId },
  rankSource: `네이버 플레이스 모바일 · 관련도순 · 광고 제외 · 상위 ${maximumRank}개 · 테라PT 언주역점 위치 기준`,
  rankLocation: config.location,
  rankings,
  review: previous.review ?? { status: 'manual_required', latest: null, history: [] },
  notes: [
    '실제 네이버 플레이스 관련도순 카드에서 광고를 제외한 순위를 계산합니다.',
    '검색 위치와 시간, 개인화에 따라 사용자가 보는 순위와 차이가 날 수 있어 테라PT 언주역점 좌표를 고정 기준으로 사용합니다.',
    '방문자 리뷰 수와 플레이스 블로그 리뷰 수는 공개 API 응답에 포함되지 않아 수동 입력으로 유지합니다.',
  ],
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`네이버 플레이스 ${rankings.length}개 키워드 수집 완료: ${outputPath}`);
