"""Routes for the on-device palm entertainment flow."""

import json
from pathlib import Path

from flask import Blueprint, render_template


palm_bp = Blueprint("palm", __name__)
PALM_COMBINATIONS = json.loads((Path(__file__).parent / "static/data/palm-combinations.json").read_text(encoding="utf-8"))


@palm_bp.route("/palm")
def palm_page():
    return render_template("palm.html", palm_combinations=PALM_COMBINATIONS)
