"""Lotto entertainment draw routes. Numbers/quotas are decided on the server."""
import json
import time
from uuid import UUID, uuid4

from flask import Blueprint, abort, current_app, jsonify, redirect, render_template, request, url_for
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy.exc import IntegrityError, OperationalError

from core_app import _get_or_create_owner_token, _owner_token_digest
from models import db
from lotto_models import LottoDraw
from lotto_service import current_draw, generate_numbers, number_key

lotto_bp = Blueprint("lotto", __name__)
SHARE_MAX_AGE = 90 * 24 * 3600


def _owner_hash():
    return _owner_token_digest(_get_or_create_owner_token())


def _owned_round_draws(owner_hash, round_number):
    return (LottoDraw.query.filter_by(owner_token_hash=owner_hash, draw_round=round_number)
            .order_by(LottoDraw.sequence.asc()).all())


def _serializer():
    return URLSafeTimedSerializer(current_app.secret_key, salt="moneyflow-lotto-public-v1")


def _status_payload(owner_hash):
    round_number, scheduled = current_draw()
    rows = _owned_round_draws(owner_hash, round_number)
    return {
        "ok": True, "round": round_number, "draw_date": scheduled.isoformat(),
        "cutoff_time": "20:00", "limit": 3, "used": len(rows),
        "remaining": max(0, 3 - len(rows)),
        "draws": [row.public_dict() for row in rows],
    }


@lotto_bp.after_request
def no_store(response):
    if request.path.startswith("/api/lotto/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@lotto_bp.route("/lotto")
def page():
    return render_template("lotto.html")


@lotto_bp.route("/lotto/history")
def history_page():
    return redirect(url_for("history_page", filter="lotto"), code=302)


@lotto_bp.route("/api/lotto/status")
def status():
    return jsonify(_status_payload(_owner_hash()))


@lotto_bp.route("/api/lotto/draw", methods=["POST"])
def draw():
    if not request.is_json:
        return jsonify(ok=False, code="JSON_REQUIRED"), 415
    data = request.get_json(silent=True) or {}
    raw = data.get("idempotency_key")
    try:
        request_key = str(UUID(raw))
    except (ValueError, AttributeError, TypeError):
        return jsonify(ok=False, code="INVALID_REQUEST_KEY"), 400

    owner_hash = _owner_hash()
    round_number, scheduled = current_draw()

    # Optimistic slot allocation: the unique DB constraints arbitrate concurrent
    # requests on SQLite or MySQL. A conflicting request retries the next slot.
    for attempt in range(7):
        prior = LottoDraw.query.filter_by(
            owner_token_hash=owner_hash, idempotency_key=request_key).first()
        if prior:
            return jsonify(ok=True, **prior.public_dict(),
                           draw_date=scheduled.isoformat() if prior.draw_round == round_number else None,
                           remaining=max(0, 3-len(_owned_round_draws(owner_hash, prior.draw_round))),
                           replayed=True)

        rows = _owned_round_draws(owner_hash, round_number)
        if len(rows) >= 3:
            return jsonify(ok=False, code="LIMIT_REACHED", round=round_number, remaining=0), 409

        used_slots = {r.sequence for r in rows}
        sequence = next((i for i in range(1, 4) if i not in used_slots), None)
        if sequence is None:
            return jsonify(ok=False, code="LIMIT_REACHED", remaining=0), 409
        numbers = generate_numbers(r.numbers for r in rows)
        record = LottoDraw(
            id=str(uuid4()), owner_token_hash=owner_hash, draw_round=round_number,
            sequence=sequence, numbers_json=json.dumps(numbers), number_key=number_key(numbers),
            idempotency_key=request_key,
        )
        db.session.add(record)
        try:
            db.session.commit()
        except (IntegrityError, OperationalError) as exc:
            db.session.rollback()
            # Brief, bounded wait for concurrent first-time SQLite writers.
            if isinstance(exc, OperationalError) and attempt >= 2:
                return jsonify(ok=False, code="BUSY_RETRY"), 503
            time.sleep(0.015 * (attempt + 1))
            continue
        return jsonify(ok=True, **record.public_dict(), draw_date=scheduled.isoformat(),
                       remaining=3-sequence, replayed=False)

    return jsonify(ok=False, code="CONFLICT_RETRY"), 503


@lotto_bp.route("/api/lotto/history")
def history():
    rows = (LottoDraw.query.filter_by(owner_token_hash=_owner_hash())
            .order_by(LottoDraw.draw_round.desc(), LottoDraw.sequence.asc()).limit(90).all())
    return jsonify(ok=True, draws=[r.public_dict() for r in rows])


@lotto_bp.route("/api/lotto/share", methods=["POST"])
def share():
    if not request.is_json:
        return jsonify(ok=False, code="JSON_REQUIRED"), 415
    data = request.get_json(silent=True) or {}
    result_id = data.get("result_id")
    if not isinstance(result_id, str):
        return jsonify(ok=False, code="INVALID_RESULT"), 400
    record = db.session.get(LottoDraw, result_id)
    if record is None or record.owner_token_hash != _owner_hash():
        abort(404)
    token = _serializer().dumps({"result_id": record.id})
    return jsonify(ok=True, url=url_for("lotto.shared", token=token))


@lotto_bp.route("/lotto/shared/<token>")
def shared(token):
    try:
        payload = _serializer().loads(token, max_age=SHARE_MAX_AGE)
        result_id = payload.get("result_id")
        if not isinstance(result_id, str):
            abort(404)
    except (BadSignature, SignatureExpired, AttributeError, TypeError, ValueError):
        abort(404)
    record = db.session.get(LottoDraw, result_id)
    if record is None:
        abort(404)
    return render_template("lotto_shared.html", result=record.public_dict())
