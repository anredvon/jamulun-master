#!/usr/bin/env python3
"""Add nullable visitor ownership metadata to an existing SQLite database."""

import argparse
import sqlite3
import sys
from pathlib import Path
from urllib.parse import quote


def upgrade_connection(connection: sqlite3.Connection) -> bool:
    """Upgrade an open SQLite connection; return True when a change was made."""
    try:
        connection.execute("BEGIN IMMEDIATE")
        table_exists = connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='test_sessions'"
        ).fetchone()
        if table_exists is None:
            raise RuntimeError("test_sessions table does not exist; refusing to migrate")

        columns = {
            row[1]: row
            for row in connection.execute("PRAGMA table_info(test_sessions)").fetchall()
        }
        existing = columns.get("owner_token_hash")
        if existing is not None:
            if existing[2].upper() != "VARCHAR(64)" or existing[3] != 0:
                raise RuntimeError("owner_token_hash exists with an unexpected schema")
            connection.commit()
            return False

        connection.execute(
            "ALTER TABLE test_sessions ADD COLUMN owner_token_hash VARCHAR(64) NULL"
        )
        connection.commit()
        return True
    except Exception:
        connection.rollback()
        raise


def migrate_database(database_path: str | Path) -> bool:
    """Open an existing SQLite file and add the owner digest column once."""
    path = Path(database_path)
    if not path.is_file():
        raise FileNotFoundError("database file must already exist")

    uri = f"file:{quote(str(path.resolve()), safe='/')}?mode=rw"
    connection = sqlite3.connect(uri, uri=True, timeout=10)
    try:
        return upgrade_connection(connection)
    finally:
        connection.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        required=True,
        help="existing SQLite database file to migrate",
    )
    args = parser.parse_args()
    try:
        changed = migrate_database(args.database)
    except (OSError, sqlite3.Error, RuntimeError) as exc:
        print(f"Migration refused: {exc}", file=sys.stderr)
        return 1

    print("Session ownership migration applied." if changed else "Session ownership schema already current.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
