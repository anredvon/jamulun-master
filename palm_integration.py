"""Registration hook for the palm feature."""

from palm_routes import palm_bp


def register_palm(app):
    app.register_blueprint(palm_bp)
