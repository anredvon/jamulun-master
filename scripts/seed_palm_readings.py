"""Create/update source-attributed palm reading records from reviewed JSON catalogs."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import app, db  # noqa: E402
from models import PalmReadingRule, PalmSource  # noqa: E402


DATA_DIR = ROOT / "static" / "data"


def read_json(name):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def seed():
    sources = read_json("palm-sources.json")
    rules = read_json("palm-reading-rules.json")
    with app.app_context():
        db.create_all()
        source_ids = {}
        for record in sources:
            source = PalmSource.query.filter_by(source_key=record["source_key"]).first()
            if source is None:
                source = PalmSource(source_key=record["source_key"])
                db.session.add(source)
            for key, value in record.items():
                if key != "source_key":
                    setattr(source, key, value)
            source_ids[source.source_key] = source

        db.session.flush()
        for record in rules:
            source_key = record["source_key"]
            source = source_ids.get(source_key) or PalmSource.query.filter_by(source_key=source_key).first()
            if source is None:
                raise ValueError(f"Unknown palm source: {source_key}")
            rule = PalmReadingRule.query.filter_by(rule_key=record["rule_key"]).first()
            if rule is None:
                rule = PalmReadingRule(rule_key=record["rule_key"])
                db.session.add(rule)
            for key, value in record.items():
                if key not in {"rule_key", "source_key"}:
                    setattr(rule, key, value)
            rule.source_id = source.id
            rule.is_active = record.get("review_status") == "approved"

        db.session.commit()
        active_count = sum(1 for item in rules if item.get("review_status") == "approved")
        print(f"Registered {len(sources)} sources and {len(rules)} rules ({active_count} active).")


if __name__ == "__main__":
    seed()
