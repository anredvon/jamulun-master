# 💸 재물운 테스트 서비스

Flask + SQLAlchemy + Vanilla JS 기반의 재물운 테스트 웹앱.
토스 미니앱 / WebView 환경에 최적화된 모바일 우선 설계.

---

## 📁 프로젝트 구조

```
jaemulun/
├── app.py               # Flask 메인 앱 (라우트 + API + 헬퍼)
├── models.py            # DB 모델 (Question, Choice, TestSession, TestResult)
├── seed_db.py           # 질문 데이터 시드 스크립트
├── wsgi.py              # PythonAnywhere / Gunicorn 배포 진입점
├── requirements.txt     # Python 패키지 목록
├── deploy.sh            # PythonAnywhere 배포 자동화 스크립트
├── .env.example         # 환경변수 템플릿
│
├── templates/           # Jinja2 HTML 템플릿
│   ├── base.html        # 공통 레이아웃 (헤더/푸터/플래시)
│   ├── index.html       # 메인 페이지 (테스트 카드 3개)
│   ├── test.html        # 테스트 진행 페이지
│   ├── result.html      # 결과 페이지 (광고/결제 유도)
│   └── insight.html     # 상세 인사이트 (잠금 해제 후)
│
├── static/
│   ├── css/jaemulun.css # 전체 스타일시트 (모바일 우선)
│   └── js/jaemulun.js   # 테스트 진행 로직 (fetch 기반)
│
├── seeds/
│   ├── 02_questions_100_seed.sql  # 질문 100개 + 선택지 400개 SQL
│   └── 03_questions_100_seed.csv  # CSV 형식 (참고용)
│
└── db/
    └── 01_schema_upgrade.sql      # DB 스키마 업그레이드 SQL
```

---

## 🧩 테스트 종류

| 테스트 | test_type | 설명 |
|--------|-----------|------|
| 오늘 금전운 보기 | `money` | 데일리 금전 흐름, 매일 다른 질문 |
| 소비 성향 테스트 | `spending` | 충동구매/예산관리/저축 패턴 분석 |
| 미래 자산 테스트 | `future` | 장기 자산 습관, 투자 성향 측정 |

---

## 🗄️ DB 테이블 구조

### questions
| 컬럼 | 설명 |
|------|------|
| test_type | money / spending / future |
| category | 카테고리 (daily, luck, impulse, goal 등) |
| emoji | 질문 아이콘 |
| question_text | 질문 본문 |
| question_subtext | 보조 설명 |
| is_active | False면 출제 대상 제외 |
| weight | 출제 확률 가중치 (1~5) |

### test_sessions
| 컬럼 | 설명 |
|------|------|
| selected_question_ids | 이 세션에 고정된 질문 ID (쉼표 구분) |
| answered_question_ids | 이미 답변한 질문 ID |
| score | 누적 raw 점수 |
| unlocked | 광고/결제 완료 여부 |
| share_count | 공유 횟수 |

### test_results
| 컬럼 | 설명 |
|------|------|
| final_score | 0~100 정규화 점수 |
| result_type | gold / silver / bronze / caution |
| result_title | 결과 유형 제목 |
| result_desc | 결과 설명 |

---

## 🚀 로컬 실행 방법

```bash
# 1. 저장소 클론 / 파일 압축 해제 후 디렉터리 이동
cd jaemulun

# 2. 가상환경 생성 및 활성화 (권장)
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 3. 패키지 설치
pip install -r requirements.txt

# 4. 환경변수 설정
cp .env.example .env
# .env 파일에서 SECRET_KEY 수정 (선택)

# 5. DB 초기화 (테이블 생성)
python app.py
# → "DB 테이블 생성 완료" 메시지 확인 후 Ctrl+C

# 6. 질문 데이터 시드 삽입
python seed_db.py
# → "시드 완료: 질문 100개, 선택지 400개" 확인

# 7. 서버 실행
python app.py
# → http://localhost:5000 접속
```

---

## 🌐 PythonAnywhere 배포

```bash
# 자동 배포 스크립트 실행
bash deploy.sh YOUR_PYTHONANYWHERE_USERNAME
```

수동 작업:
1. PythonAnywhere → Web → Add web app → Manual configuration (Python 3.10+)
2. WSGI file: `wsgi.py` 내용으로 교체 (경로 확인)
3. Static files: URL `/static/` → Directory `프로젝트경로/static`
4. Reload 클릭

---

## 🔌 추가 기능 연동 포인트

### 광고 (AdFit / AdMob)
- `result.html` → `unlock-btn` 클릭 시 광고 SDK 콜백 연동
- `insight.html` → 광고 배너 영역 주석 해제

### 결제 (토스페이먼츠)
- `result.html` → "광고 없이 보기" 버튼에 토스 결제 SDK 연동
- `app.py` → `payment_success()` 에 서버-to-서버 검증 로직 추가

### AI 인사이트 (OpenAI / Claude API)
- `insight.html` → TODO 주석 영역에 API 호출 결과 렌더링
- `app.py` → `insight_page()` 에서 결과 데이터 기반으로 프롬프트 생성

### 카카오 공유
- `result.html` → `share-btn` 클릭 핸들러에 Kakao SDK `shareDefault()` 연동

---

## ✅ 배포 전 체크리스트

- [ ] `.env` 에서 `SECRET_KEY` 강력한 값으로 변경
- [ ] `DATABASE_URL` 운영 DB로 변경 (MySQL 권장)
- [ ] `python seed_db.py` 로 질문 데이터 삽입 확인
- [ ] `python seed_db.py --check` 로 질문 수 확인
- [ ] 토스 결제 PG 키 삽입 (result.html)
- [ ] 카카오 앱 키 삽입 (result.html)
- [ ] `FLASK_ENV=production` 확인
- [ ] Static files 경로 설정 완료
- [ ] WSGI 파일 경로 확인 및 Reload

---

## 🧪 질문 추가 방법

```sql
-- seeds/02_questions_100_seed.sql 끝에 추가 후 python seed_db.py --reset

INSERT INTO questions (test_type, category, emoji, question_text, question_subtext, is_active, weight, created_at)
VALUES ('money', 'daily', '💡', '새 질문 내용', '보조 설명', 1, 1, CURRENT_TIMESTAMP);

INSERT INTO choices (question_id, choice_text, score, choice_order)
VALUES (LAST_INSERT_ID(), '선택지 1', 8, 1);
-- ... (choice_order 2, 3, 4 계속 추가)
```

---

## 📊 API 엔드포인트 요약

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/` | 메인 페이지 |
| GET | `/test/<type>` | 테스트 진행 페이지 |
| GET | `/result/<id>` | 결과 페이지 |
| GET | `/insight/<id>` | 상세 인사이트 (잠금 해제 후) |
| POST | `/api/start` | 세션 생성 + 질문 반환 |
| POST | `/api/answer` | 답변 저장 |
| POST | `/api/finish` | 결과 계산 |
| POST | `/api/unlock` | 잠금 해제 |
| POST | `/api/share` | 공유 카운트 기록 |
| GET | `/api/stats` | 통계 (관리자용) |
| GET | `/payment/success` | 결제 성공 콜백 |
| GET | `/payment/fail` | 결제 실패 콜백 |
