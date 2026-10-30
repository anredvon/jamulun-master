"""Shared validation for the application's signing key."""

KNOWN_SECRET_PLACEHOLDERS = frozenset({
    "dev-secret-change-in-prod",
    "replace-with-a-random-secret-at-least-32-characters-long",
    "your-super-secret-key-here-change-this",
    "REPLACE_WITH_A_RANDOM_SECRET",
})


def is_valid_secret_key(secret_key: str | None) -> bool:
    return (
        isinstance(secret_key, str)
        and len(secret_key) >= 32
        and secret_key not in KNOWN_SECRET_PLACEHOLDERS
    )
