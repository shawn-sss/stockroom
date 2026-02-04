import json
import sqlite3
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import HTTPException


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def require_nonempty(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")
    return cleaned


def title_case_words(value: str) -> str:
    return " ".join(
        [word[:1].upper() + word[1:].lower() for word in value.strip().split()]
    )


def row_to_item(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "category": row["category"],
        "make": row["make"],
        "model": row["model"],
        "service_tag": row["service_tag"],
        "row": row["row"] if "row" in row.keys() else None,
        "status": row["status"],
        "assigned_user": row["assigned_user"],
        "created_at": row["created_at"],
        "created_by": row["created_by"],
        "updated_at": row["updated_at"] if "updated_at" in row.keys() else row["created_at"],
    }


def create_audit_event(
    conn: sqlite3.Connection,
    item_id: int,
    actor: str,
    action: str,
    changes: Optional[Dict[str, Dict[str, Any]]] = None,
    note: Optional[str] = None,
) -> None:
    changes_payload = json.dumps(changes) if changes else None
    conn.execute(
        """
        INSERT INTO audit_events (item_id, actor, timestamp, action, changes, note)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (item_id, actor, now_iso(), action, changes_payload, note),
    )


def create_user_audit_log(
    conn: sqlite3.Connection,
    actor: str,
    target_user: str,
    action: str,
    details: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> None:
    conn.execute(
        """
        INSERT INTO user_audit_logs (actor, target_user, timestamp, action, details, old_value, new_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (actor, target_user, now_iso(), action, details, old_value, new_value),
    )
