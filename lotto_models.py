"""SQLAlchemy table for per-visitor, per-round Lotto draws."""
from datetime import datetime, timezone

from models import db


class LottoDraw(db.Model):
    __tablename__ = "lotto_draws"
    __table_args__ = (
        db.UniqueConstraint("owner_token_hash", "draw_round", "sequence", name="uq_lotto_owner_round_seq"),
        db.UniqueConstraint("owner_token_hash", "idempotency_key", name="uq_lotto_owner_request"),
        db.UniqueConstraint("owner_token_hash", "draw_round", "number_key", name="uq_lotto_owner_round_numbers"),
        db.CheckConstraint("sequence BETWEEN 1 AND 3", name="ck_lotto_sequence"),
    )

    id = db.Column(db.String(36), primary_key=True)
    owner_token_hash = db.Column(db.String(64), nullable=False, index=True)
    draw_round = db.Column(db.Integer, nullable=False, index=True)
    sequence = db.Column(db.Integer, nullable=False)
    numbers_json = db.Column(db.Text, nullable=False)
    number_key = db.Column(db.String(17), nullable=False)
    idempotency_key = db.Column(db.String(36), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    @property
    def numbers(self):
        import json
        return json.loads(self.numbers_json)

    def public_dict(self):
        return {
            "result_id": self.id,
            "round": self.draw_round,
            "sequence": self.sequence,
            "numbers": self.numbers,
            "created_at": self.created_at.isoformat() + "Z",
        }
