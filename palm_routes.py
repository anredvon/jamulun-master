"""Routes for the on-device palm entertainment flow."""

from flask import Blueprint, current_app, render_template
from sqlalchemy.exc import SQLAlchemyError

from models import PalmReadingRule


palm_bp = Blueprint("palm", __name__)


@palm_bp.route("/palm")
def palm_page():
    rules = []
    try:
        rules = [rule.to_dict() for rule in PalmReadingRule.query.join(PalmReadingRule.source)
                 .filter(PalmReadingRule.is_active.is_(True), PalmReadingRule.review_status == "approved")
                 .order_by(PalmReadingRule.line_type, PalmReadingRule.rule_key).all()]
    except SQLAlchemyError:
        # New content tables may not yet be present on an existing local install.
        current_app.logger.info("Palm reading tables are not initialized; serving with no active reading rules.")
    return render_template("palm.html", palm_reading_rules=rules)
