"""The today hub that gathers daily entertainment features."""

from flask import Blueprint, render_template


today_bp = Blueprint("today", __name__)


@today_bp.route("/today")
def today_page():
    return render_template("today.html")
