import test from 'node:test';
import assert from 'node:assert/strict';
import { findPlaceRank, mergeReviewCounts } from './collector-core.mjs';

test('returns the 1-based rank when the target place id is in the results', () => {
  const items = [
    { title: '다른 헬스장', link: 'https://m.place.naver.com/place/1' },
    { title: '테라 PT 언주역점', link: 'https://m.place.naver.com/place/1846137508' },
  ];
  assert.equal(findPlaceRank(items, '테라 PT 언주역점', '1846137508'), 2);
});

test('returns null when the place is outside the returned result window', () => {
  assert.equal(findPlaceRank([{ title: '다른 테라 PT 지점', link: 'https://m.place.naver.com/place/2' }], '테라 PT 언주역점', '1846137508'), null);
});

test('sums visitor and blog review counts without inventing missing values', () => {
  assert.equal(mergeReviewCounts(531, 46), 577);
  assert.equal(mergeReviewCounts(null, 46), null);
});
