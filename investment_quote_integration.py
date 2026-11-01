"""Registration hook for the investment quote feature."""

from investment_quote_routes import investment_quotes_bp


def register_investment_quotes(app):
    app.register_blueprint(investment_quotes_bp)
