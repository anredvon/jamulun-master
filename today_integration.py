"""Registration hook for the daily hub."""

from today_routes import today_bp


def register_today(app):
    app.register_blueprint(today_bp)
