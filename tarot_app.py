"""Tarot-enabled Flask entrypoint.

Keeps the feature isolated while the legacy app.py remains stable.
"""

from app import app
from tarot_integration import register_tarot

register_tarot(app)

__all__ = ["app"]
