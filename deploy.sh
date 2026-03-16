#!/bin/bash
# ============================================================
#  deploy.sh — PythonAnywhere 배포 자동화
#  사용법: bash deploy.sh YOUR_PYTHONANYWHERE_USERNAME
# ============================================================

USERNAME=${1:-"your_username"}
PROJECT="jaemulun"
PA_HOME="/home/$USERNAME/$PROJECT"

echo ""
echo "🚀  재물운 앱 배포 시작 — PythonAnywhere: $USERNAME"
echo "=================================================="

# 1. 패키지 설치
echo ""
echo "📦  패키지 설치 중..."
pip install -r requirements.txt --user -q
# MySQL 사용 시 아래 주석 해제
# pip install pymysql --user -q

# 2. .env 파일 없으면 생성
if [ ! -f ".env" ]; then
  echo ""
  echo "⚙️   .env 파일 생성 중..."
  cp .env.example .env
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i "s/your-super-secret-key-here-change-this/$SECRET/" .env
  echo "   ✅  SECRET_KEY 자동 생성 완료"
  echo "   ⚠️   DATABASE_URL 은 수동으로 수정: $PA_HOME/.env"
fi

# 3. DB 초기화 (테이블 생성)
echo ""
echo "🗄️   DB 테이블 생성 중..."
python3 -c "
from app import app, db
with app.app_context():
    db.create_all()
print('   ✅  DB 테이블 생성 완료')
"

# 4. 질문 시드 데이터 삽입
echo ""
echo "🌱  질문 데이터 시드 중..."
python3 seed_db.py
echo "   ✅  시드 완료"

# 5. wsgi.py 에 username 삽입
echo ""
echo "🔧  wsgi.py 업데이트 중..."
sed -i "s/YOUR_USERNAME/$USERNAME/g" wsgi.py
echo "   ✅  wsgi.py 완료"

echo ""
echo "=================================================="
echo "✅  배포 준비 완료!"
echo ""
echo "📋  남은 수동 작업:"
echo "   1. PythonAnywhere → Web → Add web app"
echo "   2. Framework: Manual configuration (Python 3.10+)"
echo "   3. WSGI file: $PA_HOME/wsgi.py 내용으로 교체"
echo "   4. Static files 설정:"
echo "      URL: /static/  →  Directory: $PA_HOME/static"
echo "   5. Reload 버튼 클릭"
echo ""
echo "   🔑  운영 전 반드시 수정:"
echo "      .env → SECRET_KEY (이미 자동 생성됨)"
echo "      .env → DATABASE_URL (MySQL 사용 시)"
echo "      result.html → 결제 PG 키 (토스페이먼츠 등)"
echo "      result.html → 카카오 앱 키 (공유 기능)"
echo "=================================================="
