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

export function mergeReviewCounts(visitor, blog) {
  if (!Number.isFinite(visitor) || !Number.isFinite(blog) || visitor < 0 || blog < 0) return null;
  return visitor + blog;
}
