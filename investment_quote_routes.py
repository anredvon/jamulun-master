"""Routes and source-verified data for one-line investment reading."""

import json
from pathlib import Path

from flask import Blueprint, render_template


investment_quotes_bp = Blueprint("investment_quotes", __name__)
QUOTE_CATALOG = json.loads((Path(__file__).parent / "static/data/investment_quotes.json").read_text(encoding="utf-8"))


@investment_quotes_bp.route("/investment-quotes")
def investment_quotes_page():
    return render_template("investment_quotes.html", quotes=QUOTE_CATALOG)
