# 테라PT 언주역점 네이버 순위 대시보드

테라PT 언주역점의 네이버 키워드별 순위를 확인하기 위한 대시보드입니다.

## 무료 운영 방식

이 프로젝트는 ChatGPT나 OpenAI API를 사용하지 않습니다. 공개 GitHub 저장소의 GitHub Actions가 매일 한 번 `scripts/collect-naver.mjs`를 실행하고, 결과를 `public/data/dashboard.json`에 저장하도록 구성했습니다.

1. NAVER API HUB에서 검색 API 키를 발급합니다.
2. GitHub 저장소의 Settings > Secrets and variables > Actions에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 등록합니다.
3. `.github/workflows/collect-naver.yml`을 기본 브랜치에 올립니다.
4. Actions에서 `네이버 순위 매일 수집`을 한 번 수동 실행해 연결을 확인합니다.

## 범위와 제한

- 순위는 NAVER API HUB 지역검색의 정확도순 상위 5개 결과 기준입니다. 네이버 통합검색 플레이스 화면의 실제 노출 순위와 다를 수 있고, 5위 밖은 미확인으로 표시됩니다.
- NAVER API HUB 공개 응답에는 방문자 리뷰 수와 플레이스에 수집된 블로그 리뷰 수가 포함되지 않아 리뷰 수는 화면의 직접 입력 기능으로 기록합니다.
- GitHub는 무료 정책과 한도를 변경할 수 있으므로 “평생 무료”를 보장할 수는 없습니다. 공개 저장소의 표준 GitHub-hosted runner는 현재 무료이지만, 공개 저장소의 예약 워크플로는 60일 동안 활동이 없으면 자동 비활성화될 수 있습니다.
- 네이버 API 키는 저장소 파일에 넣지 말고 GitHub Secrets에만 저장합니다.
