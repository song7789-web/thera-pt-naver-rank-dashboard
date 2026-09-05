export function normalizePlaceText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function findPlaceRank(items, targetName, targetPlaceId) {
  const target = normalizePlaceText(targetName);
  const index = items.findIndex((item) => {
    const link = String(item?.link ?? '');
    const title = normalizePlaceText(item?.title);
    return (targetPlaceId && link.includes(String(targetPlaceId))) || title === target || title.includes(target);
  });
  return index === -1 ? null : index + 1;
}

export function extractPlaceId(href) {
  return String(href ?? '').match(/\/place\/(\d+)/)?.[1] ?? null;
}

export function findRenderedPlaceRank(entries, targetPlaceId) {
  const seenPlaceIds = new Set();
  let organicRank = 0;

  for (const entry of entries ?? []) {
    if (entry?.isAd) continue;
    const placeId = extractPlaceId(entry?.href);
    if (!placeId || seenPlaceIds.has(placeId)) continue;
    seenPlaceIds.add(placeId);
    organicRank += 1;
    if (placeId === String(targetPlaceId)) return organicRank;
  }

  return null;
}

export function isNaverSecurityChallenge(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ');
  return normalized.includes('NAVER 보안 확인')
    || normalized.includes('서비스 이용이 제한되었습니다')
    || normalized.includes('과도한 접근 요청');
}

export function mergeReviewCounts(visitor, blog) {
  if (!Number.isFinite(visitor) || !Number.isFinite(blog) || visitor < 0 || blog < 0) return null;
  return visitor + blog;
}
