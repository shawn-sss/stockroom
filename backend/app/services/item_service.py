import json
import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from ..common import create_audit_event, now_iso, row_to_item


def get_item_or_404(conn: sqlite3.Connection, item_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return row


def get_item_response(conn: sqlite3.Connection, item_id: int) -> Dict[str, Any]:
    return {"item": row_to_item(get_item_or_404(conn, item_id))}


def apply_item_status_change(
    conn: sqlite3.Connection,
    row: sqlite3.Row,
    *,
    item_id: int,
    next_status: str,
    next_assigned_user: Optional[str],
    actor: str,
    action: str,
    note: Optional[str],
) -> Dict[str, Any]:
    changes = {
        "status": {"old": row["status"], "new": next_status},
        "assigned_user": {"old": row["assigned_user"], "new": next_assigned_user},
    }
    conn.execute(
        "UPDATE items SET status = ?, assigned_user = ?, updated_at = ? WHERE id = ?",
        (next_status, next_assigned_user, now_iso(), item_id),
    )
    create_audit_event(
        conn,
        item_id,
        actor,
        action,
        changes=changes,
        note=note,
    )
    conn.commit()
    return get_item_response(conn, item_id)


def build_history(events: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    history = []
    for event in events:
        history.append(
            {
                "id": event["id"],
                "actor": event["actor"],
                "timestamp": event["timestamp"],
                "action": event["action"],
                "changes": json.loads(event["changes"]) if event["changes"] else None,
                "note": event["note"],
            }
        )
    return history
