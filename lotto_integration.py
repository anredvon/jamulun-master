"""Register the Lotto feature without changing the legacy Flask app."""
from lotto_routes import lotto_bp


def register_lotto(app):
    app.register_blueprint(lotto_bp)
