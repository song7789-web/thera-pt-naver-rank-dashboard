import test from 'node:test';
import assert from 'node:assert/strict';
import { findPlaceRank, findRenderedPlaceRank, isNaverSecurityChallenge, mergeReviewCounts } from './collector-core.mjs';

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

test('counts the target rank from the rendered Naver Place list while excluding ads', () => {
  const entries = [
    ...Array.from({ length: 3 }, (_, index) => ({ href: `https://ader.naver.com/v1/ad-${index}`, isAd: true })),
    ...Array.from({ length: 20 }, (_, index) => ({ href: `https://m.place.naver.com/place/${1000 + index}`, isAd: false })),
    { href: 'https://m.place.naver.com/place/1846137508?entry=pll', isAd: false },
  ];

  assert.equal(findRenderedPlaceRank(entries, '1846137508'), 21);
});

test('does not treat an advertised target card as an organic rank', () => {
  const entries = [
    { href: 'https://ader.naver.com/v1/target-ad?fu=https%3A%2F%2Fm.place.naver.com%2Fplace%2F1846137508', isAd: true },
    { href: 'https://m.place.naver.com/place/1234', isAd: false },
  ];

  assert.equal(findRenderedPlaceRank(entries, '1846137508'), null);
});

test('does not count duplicate organic cards twice', () => {
  const entries = [
    { href: 'https://m.place.naver.com/place/1000', isAd: false },
    { href: 'https://m.place.naver.com/place/1000?entry=pll', isAd: false },
    { href: 'https://m.place.naver.com/place/1846137508', isAd: false },
  ];

  assert.equal(findRenderedPlaceRank(entries, '1846137508'), 2);
});

test('recognizes Naver security and access-limit pages', () => {
  assert.equal(isNaverSecurityChallenge('NAVER 보안 확인'), true);
  assert.equal(isNaverSecurityChallenge('과도한 접근 요청으로 서비스 이용이 제한되었습니다.'), true);
  assert.equal(isNaverSecurityChallenge('언주역피티 플레이스 검색 결과'), false);
});

test('sums visitor and blog review counts without inventing missing values', () => {
  assert.equal(mergeReviewCounts(531, 46), 577);
  assert.equal(mergeReviewCounts(null, 46), null);
});
