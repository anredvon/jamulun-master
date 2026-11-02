"""Daily, non-personalized content for the Today screen."""

from datetime import datetime
from zoneinfo import ZoneInfo

from flask import Blueprint, render_template

from investment_quote_routes import QUOTE_CATALOG


today_bp = Blueprint("today", __name__)


@today_bp.route("/today")
def today_page():
    valid_quotes = [
        quote for quote in QUOTE_CATALOG
        if quote.get("text_ko") and quote.get("author") and quote.get("source_url")
    ]
    today = datetime.now(ZoneInfo("Asia/Seoul")).date()
    daily_quote = valid_quotes[today.toordinal() % len(valid_quotes)] if valid_quotes else None
    return render_template(
        "today.html",
        daily_quote=daily_quote,
        today_label=f"{today.month}월 {today.day}일",
    )
