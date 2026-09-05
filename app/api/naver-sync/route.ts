import { trackedKeywords } from '@/lib/keywords';

const PLACE_NAME = '테라 PT 언주역점';
const PLACE_ID = '1846137508';

export async function GET() {
  return Response.json({
    connected: false,
    placeId: PLACE_ID,
    placeName: PLACE_NAME,
    keywordCount: trackedKeywords.length,
    capabilities: {
      placeRank: 'NAVER_PLACE_RENDERED_LIST',
      rankingOrder: 'PRECISION_WITH_ADS_EXCLUDED',
      fixedLocation: 'TERA_PT_EONJU',
      visitorReviewCount: 'UNAVAILABLE_OFFICIAL_API',
    },
    message: '잘못된 API 순위 표시는 중단했습니다. 반복 자동 수집은 네이버 보안확인 때문에 현재 수동 점검만 가능합니다.',
  });
}

export async function POST() {
  return Response.json(
    {
      ok: false,
      code: 'RUN_FROM_GITHUB_ACTIONS',
      message: '반복 자동 수집은 네이버 보안확인을 유발할 수 있어 중단했습니다.',
    },
    { status: 405 },
  );
}
