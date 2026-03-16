# ============================================================
#  wsgi.py — PythonAnywhere / Gunicorn 배포용 진입점
#
#  PythonAnywhere 설정 방법:
#  1. Web 탭 → WSGI configuration file 클릭
#  2. 이 파일 내용으로 교체
#  3. project_home 경로를 실제 경로로 수정
# ============================================================

import sys
import os

# ── 프로젝트 경로 설정 (PythonAnywhere 유저명으로 수정) ──
project_home = '/home/YOUR_USERNAME/jaemulun'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# ── .env 파일 로드 ──
from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

# ── Flask 앱 임포트 (gunicorn이 application 변수를 찾음) ──
from app import app as application  # noqa
