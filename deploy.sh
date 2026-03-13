#!/bin/bash
# ============================================================
#  deploy.sh — PythonAnywhere 배포 자동화 스크립트
#  사용법: bash deploy.sh YOUR_PYTHONANYWHERE_USERNAME
# ============================================================

USERNAME=${1:-"your_username"}
PROJECT="jaemulun"
PA_HOME="/home/$USERNAME/$PROJECT"

echo ""
echo "🚀  재물운 앱 배포 시작 — PythonAnywhere: $USERNAME"
echo "=================================================="

# ── 1. 패키지 설치 ──
echo ""
echo "📦  패키지 설치 중..."
pip install -r requirements.txt --user -q
pip install pymysql --user -q   # MySQL 사용 시

# ── 2. .env 파일 생성 (없을 경우) ──
if [ ! -f ".env" ]; then
  echo ""
  echo "⚙️   .env 파일 생성 중..."
  cp .env.example .env
  # 랜덤 SECRET_KEY 자동 생성
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i "s/your-super-secret-key-here/$SECRET/" .env
  echo "   ✅  SECRET_KEY 자동 생성 완료"
  echo "   ⚠️   DATABASE_URL은 직접 수정하세요: $PA_HOME/.env"
fi

# ── 3. DB 초기화 & 시드 ──
echo ""
echo "🗄️   데이터베이스 초기화 중..."
python3 -c "
from app import app, db, seed_data
with app.app_context():
    db.create_all()
    seed_data()
print('   ✅  DB 초기화 & 시드 완료')
"

# ── 4. wsgi.py 에 username 자동 삽입 ──
echo ""
echo "🔧  wsgi.py 설정 중..."
sed -i "s/YOUR_USERNAME/$USERNAME/g" wsgi.py
echo "   ✅  wsgi.py 업데이트 완료"

# ── 5. Static 파일 경로 확인 ──
echo ""
echo "📁  파일 구조 확인:"
echo "   프로젝트 : $PA_HOME"
echo "   Static   : $PA_HOME/static"
echo "   Templates: $PA_HOME/templates"
echo "   WSGI     : $PA_HOME/wsgi.py"

echo ""
echo "=================================================="
echo "✅  배포 준비 완료!"
echo ""
echo "📋  남은 수동 작업:"
echo "   1. PythonAnywhere 대시보드 → Web → Add web app"
echo "   2. Framework: Manual configuration (Python 3.10)"
echo "   3. WSGI file: wsgi.py 내용으로 교체"
echo "   4. Static files 설정:"
echo "      URL: /static/  →  Directory: $PA_HOME/static"
echo "   5. 'Reload' 버튼 클릭"
echo ""
echo "   🔑  교체 필요한 키값:"
echo "      .env → DATABASE_URL (MySQL 사용 시)"
echo "      templates/result.html → TOSS_CLIENT_KEY"
echo "      templates/result.html → Kakao App Key (카카오 개발자센터)"
echo "      templates/result.html → data-ad-unit (AdFit 단위 ID)"
echo "      templates/insight.html → data-ad-unit (AdFit 단위 ID)"
echo ""
echo "   📖  전체 가이드: README.md"
echo "=================================================="
