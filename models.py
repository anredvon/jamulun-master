from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Question(db.Model):
    """테스트 질문"""
    __tablename__ = 'questions'

    id         = db.Column(db.Integer, primary_key=True)
    test_type  = db.Column(db.String(20), nullable=False)   # money / spending / future
    order      = db.Column(db.Integer, nullable=False)
    emoji      = db.Column(db.String(10), default='💰')
    text       = db.Column(db.Text, nullable=False)
    sub        = db.Column(db.Text, default='')

    choices    = db.relationship('Choice', backref='question', lazy=True,
                                 order_by='Choice.order')

    def to_dict(self):
        return {
            'id':      self.id,
            'emoji':   self.emoji,
            'text':    self.text,
            'sub':     self.sub,
            'choices': [c.to_dict() for c in self.choices]
        }


class Choice(db.Model):
    """선택지"""
    __tablename__ = 'choices'

    id          = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    text        = db.Column(db.String(200), nullable=False)
    score       = db.Column(db.Integer, default=0)   # 선택 시 부여 점수
    order       = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {'id': self.id, 'text': self.text, 'order': self.order}


class TestSession(db.Model):
    """사용자 테스트 세션"""
    __tablename__ = 'test_sessions'

    id           = db.Column(db.Integer, primary_key=True)
    test_type    = db.Column(db.String(20), nullable=False)
    score        = db.Column(db.Integer, default=0)
    answer_count = db.Column(db.Integer, default=0)
    unlocked     = db.Column(db.Boolean, default=False)   # 광고/결제 완료 여부
    share_count  = db.Column(db.Integer, default=0)
    started_at   = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at  = db.Column(db.DateTime, nullable=True)

    result       = db.relationship('TestResult', backref='session',
                                   uselist=False, lazy=True)


class TestResult(db.Model):
    """계산된 결과"""
    __tablename__ = 'test_results'

    id           = db.Column(db.Integer, primary_key=True)
    session_id   = db.Column(db.Integer, db.ForeignKey('test_sessions.id'), nullable=False)
    final_score  = db.Column(db.Integer, nullable=False)
    result_type  = db.Column(db.String(20))   # gold / silver / bronze / caution
    result_title = db.Column(db.String(100))
    result_desc  = db.Column(db.Text)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'final_score':  self.final_score,
            'result_type':  self.result_type,
            'result_title': self.result_title,
            'result_desc':  self.result_desc,
        }
