import sqlite3

from fastapi import HTTPException

from ..common import require_nonempty


def serialize_user(row: sqlite3.Row):
    return {
        "id": row["id"],
        "username": row["username"],
        "role": row["role"],
        "created_at": row["created_at"],
    }


def get_user_by_id_or_404(conn: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    row = conn.execute(
        "SELECT id, username, role, created_at FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row


def get_user_by_username_or_404(conn: sqlite3.Connection, username: str) -> sqlite3.Row:
    normalized_username = require_nonempty(username, "username").lower()
    row = conn.execute(
        "SELECT id, username, role, created_at FROM users WHERE lower(username) = ?",
        (normalized_username,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row


def can_reset_password(actor: sqlite3.Row, target: sqlite3.Row) -> bool:
    if actor["role"] == "owner":
        return True
    if actor["role"] == "admin":
        return target["username"] == actor["username"] or target["role"] == "user"
    return target["username"] == actor["username"]
