"""Routes for the image-independent daily money-card experience."""

from flask import Blueprint, render_template

from tarot_cards import TAROT_CARDS


tarot_bp = Blueprint("tarot", __name__)


@tarot_bp.route("/tarot")
def tarot_page():
    return render_template("tarot.html", tarot_cards=TAROT_CARDS)
