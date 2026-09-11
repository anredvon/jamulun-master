"""Small integration hook kept outside app.py to keep tarot isolated."""

from tarot_routes import tarot_bp


def register_tarot(app):
    """Register tarot routes on the Flask application."""
    app.register_blueprint(tarot_bp)
