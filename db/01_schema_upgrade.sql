-- 01_schema_upgrade.sql
-- 현재 jaemulun 프로젝트를 질문풀 + 랜덤출제 구조로 업그레이드하기 위한 SQL
-- SQLite 기준. MySQL도 거의 동일하게 적용 가능.

BEGIN TRANSACTION;

-- 기존 questions 테이블이 있다면 필요한 컬럼 추가
ALTER TABLE questions ADD COLUMN category VARCHAR(30) DEFAULT 'general';
ALTER TABLE questions ADD COLUMN question_text TEXT;
ALTER TABLE questions ADD COLUMN question_subtext TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE questions ADD COLUMN weight INTEGER NOT NULL DEFAULT 1;
ALTER TABLE questions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 기존 컬럼(text, sub)을 신규 컬럼으로 백필
UPDATE questions
SET question_text = COALESCE(question_text, text),
    question_subtext = COALESCE(question_subtext, sub),
    category = COALESCE(category, 'general');

-- 기존 choices 테이블이 있다면 신규 컬럼 추가
ALTER TABLE choices ADD COLUMN choice_text VARCHAR(255);
ALTER TABLE choices ADD COLUMN choice_order INTEGER NOT NULL DEFAULT 1;
UPDATE choices
SET choice_text = COALESCE(choice_text, text),
    choice_order = COALESCE(choice_order, "order");

-- test_sessions 확장
ALTER TABLE test_sessions ADD COLUMN selected_question_ids TEXT;
ALTER TABLE test_sessions ADD COLUMN answered_question_ids TEXT DEFAULT '';
ALTER TABLE test_sessions ADD COLUMN meta_json TEXT DEFAULT '{}';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_questions_test_type_active ON questions (test_type, is_active);
CREATE INDEX IF NOT EXISTS idx_questions_test_type_category ON questions (test_type, category);
CREATE INDEX IF NOT EXISTS idx_choices_question_id ON choices (question_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_type ON test_sessions (test_type);

COMMIT;

-- 신규 설치용 정리 스키마 예시

/*
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_type VARCHAR(20) NOT NULL,
    category VARCHAR(30) NOT NULL,
    emoji VARCHAR(10),
    question_text TEXT NOT NULL,
    question_subtext TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    weight INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    choice_text VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL,
    choice_order INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE test_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_type VARCHAR(20) NOT NULL,
    selected_question_ids TEXT,
    answered_question_ids TEXT DEFAULT '',
    meta_json TEXT DEFAULT '{}',
    score INTEGER NOT NULL DEFAULT 0,
    answer_count INTEGER NOT NULL DEFAULT 0,
    unlocked BOOLEAN NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME
);

CREATE TABLE test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    final_score INTEGER NOT NULL,
    result_type VARCHAR(20) NOT NULL,
    result_title VARCHAR(100) NOT NULL,
    result_desc TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES test_sessions(id)
);
*/
