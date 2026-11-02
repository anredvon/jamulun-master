# 머니플로우 V1.1 — 이번 주 로또번호 받기

연결 기획: [Issue #11](https://github.com/anredvon/jamulun-master/issues/11)

## 구현 범위
- 홈 메뉴(타로 아래, 손금 위) → /lotto
- 최초 방문과 재방문 모두 저장된 결과만 표시하며, 새 번호는 추첨 버튼을 눌렀을 때 생성
- Flask 서버에서 `secrets.SystemRandom`로 6/45 무작위 번호 확정
- 쿠키 기반 익명 소유자별 회차당 3회, 세트 간 조합 중복 방지
- UNIQUE 제약 + 멱등 UUID + 충돌 재시도
- 추첨 중에만 실행되는 Canvas 볼 애니메이션(화면 비표시/감소된 모션에서는 정지) / 프리미엄 결과 카드 / 이미지·링크 공유 폴백
- 동일 회차 3세트 이력 및 기존 로컬 기록 스토어 연동
- 오락용 랜덤 번호 고지, 구매/당첨 예측 기능 없음

## 파일
- `lotto_service.py`, `lotto_models.py`, `lotto_routes.py`, `lotto_integration.py`
- `templates/lotto.html`, `templates/lotto_shared.html`
- `static/css/lotto.css`, `static/js/lotto.js`
- `scripts/migrate_lotto.py`
- `tests/test_lotto.py`
- 홈/메인 앱/기록 통합: `templates/home.html`, `app.py`, history 관련 파일

## 배포 전 체크리스트 (반드시 수동 확인)
1. **운영 DB 백업**. SQLite이면 쓰기 중지 후 SQLite 백업 API 또는 적절한 안전한 방법으로 사본 확보.
2. Python 3.12에서 로또 전용 11개 테스트와 전체 45개 Python 테스트를 실행해 통과 확인. CI에서 같은 테스트를 재확인.
3. 테스트 환경에서 `python -m scripts.migrate_lotto` 수행 (기존 테이블 삭제 없음).
4. `flask --app app routes`에서 로또 경로 등록 확인. 로컬 브라우저에서 버튼 추첨과 새로고침 결과 복원을 확인했고, API 테스트에서 회차당 3회 제한과 4회째 409를 검증.
5. iPhone Safari/Android Chrome에서 Canvas 애니메이션, 재방문/새로고침, 이미지 공유, 링크 복사 확인은 아직 필요.
6. SQLite 동시 요청 테스트(동일 익명 소유자 8개 클라이언트)를 통과. 운영 DB 엔진/다중 프로세스 환경에서의 부하 검증은 아직 필요.
7. 홈·타로·손금·기록·재물 흐름 체크 회귀 테스트.
8. Draft PR 리뷰/승인 전 `main` 병합·AWS 자동 배포 금지. 현재 변경은 Draft 상태이며 병합/배포하지 않음.

## 구현 주의사항
- 토요일 20:00 KST를 일반 회차 마감 시점으로 사용, 편성 변경 시 별도 설정/공식 확인 필요.
- 2026-11-02 확인: [동행복권 로또6/45 안내](https://www.dhlottery.co.kr/lt645/intro)는 인터넷 판매가 추첨일 토요일 20:00에 마감되고, 추첨은 토요일 20:35경 진행되며 방송 사정으로 변경될 수 있다고 안내한다. [공식 추첨결과 화면](https://www.dhlottery.co.kr/lt645/result?ltEpsd=1248)은 확인 시 제1248회 결과를 선택 상태로 제공했다.
- 앱의 차기 회차/날짜는 이 정기 일정을 기준으로 계산하며 공식 API와 동기화하지 않는다. 비정기 편성 공지가 확인되면 회차/날짜 표시와 한도 경계를 함께 다시 검증한다.
- 기존 익명 쿠키를 지우면 신규 소유자로 인식되므로 3회 제한은 계정 단위 강제 제한이 아님.
- 공유 링크는 90일 만료. 기기의 공유 API 지원 상태에 따라 PNG 다운로드/클립보드 폴백.
- `scripts/migrate_lotto.py`는 로또 테이블 생성 전용; 다른 기존 테이블을 드롭하지 않음.
- 클라이언트 Canvas는 연출만 담당; 실제 번호 및 횟수는 서버 DB가 담당.
- **코드가 GitHub에 등록된 것과 테스트 통과/배포 성공은 별개**. 별도 실행 결과 확보가 필요함.
