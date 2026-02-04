import sqlite3


def ensure_migrations(conn: sqlite3.Connection) -> None:
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
    if "role" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")

    conn.execute("UPDATE users SET role = 'owner' WHERE username = 'owner'")
    conn.execute("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''")

    item_cols = [r["name"] for r in conn.execute("PRAGMA table_info(items)").fetchall()]
    if "updated_at" not in item_cols:
        conn.execute("ALTER TABLE items ADD COLUMN updated_at TEXT")
        conn.execute("UPDATE items SET updated_at = created_at WHERE updated_at IS NULL")
    if "row" not in item_cols:
        conn.execute("ALTER TABLE items ADD COLUMN row TEXT")
