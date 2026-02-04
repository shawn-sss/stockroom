import os
import sqlite3

from .migrations import ensure_migrations
from .seed import seed_items, seed_owner

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app.db")


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            service_tag TEXT NOT NULL,
            row TEXT,
            status TEXT NOT NULL,
            assigned_user TEXT,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            actor TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            changes TEXT,
            note TEXT,
            FOREIGN KEY(item_id) REFERENCES items(id)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_audit_item_id ON audit_events(item_id)"
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor TEXT NOT NULL,
            target_user TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            old_value TEXT,
            new_value TEXT
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_audit_timestamp ON user_audit_logs(timestamp DESC)"
    )

    ensure_migrations(conn)
    conn.commit()

    cur = conn.execute("SELECT COUNT(*) AS count FROM users")
    row = cur.fetchone()
    if row["count"] == 0:
        seed_owner(conn)
        conn.commit()

    cur = conn.execute("SELECT COUNT(*) AS count FROM items")
    row = cur.fetchone()
    if row["count"] == 0:
        seed_items(conn)
        conn.commit()

    conn.close()
