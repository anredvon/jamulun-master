#!/usr/bin/env python3
"""Validate an application's dotenv file without printing its secret."""

import sys
from pathlib import Path

from dotenv import dotenv_values

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from secret_policy import is_valid_secret_key


def main() -> int:
    env_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".env")
    values = dotenv_values(env_path)
    if not is_valid_secret_key(values.get("SECRET_KEY")):
        print(
            "Invalid or missing SECRET_KEY; rotate SECRET_KEY to a random value of at least 32 characters.",
            file=sys.stderr,
        )
        return 1
    print("SECRET_KEY configuration is valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
