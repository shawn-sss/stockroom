import json
import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..constants import STATUS_DEPLOYED, STATUS_IN_STOCK, STATUS_RETIRED
from ..db import get_db
from ..schemas import DeployRequest, ItemCreate, ItemUpdate, ReturnRequest
from ..security import get_current_user
from ..utils import create_audit_event, now_iso, require_nonempty, row_to_item, title_case_words

router = APIRouter()


@router.get("/items")
def list_items(
    q: Optional[str] = Query(None),
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    base_query = "SELECT * FROM items"
    params: List[Any] = []
    if q:
        like_q = f"%{q}%"
        base_query += (
            " WHERE category LIKE ? OR make LIKE ? OR model LIKE ?"
            " OR service_tag LIKE ? OR row LIKE ? OR assigned_user LIKE ?"
        )
        params.extend([like_q, like_q, like_q, like_q, like_q, like_q])
    base_query += " ORDER BY id DESC"
    rows = conn.execute(base_query, params).fetchall()
    return {"items": [row_to_item(row) for row in rows]}


@router.post("/items", status_code=201)
def add_item(
    payload: ItemCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    created_at = now_iso()
    category = title_case_words(require_nonempty(payload.category, "category"))
    make = require_nonempty(payload.make, "make")
    model = require_nonempty(payload.model, "model")
    service_tag = require_nonempty(payload.service_tag, "service_tag")
    row = payload.row.strip() if payload.row else None
    cur = conn.execute(
        """
        INSERT INTO items (
            category, make, model, service_tag, row, status, assigned_user, created_at, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            category,
            make,
            model,
            service_tag,
            row,
            STATUS_IN_STOCK,
            None,
            created_at,
            current_user["username"],
            created_at,
        ),
    )
    item_id = cur.lastrowid
    changes = {
        "category": {"old": None, "new": category},
        "make": {"old": None, "new": make},
        "model": {"old": None, "new": model},
        "service_tag": {"old": None, "new": service_tag},
        "row": {"old": None, "new": row},
        "status": {"old": None, "new": STATUS_IN_STOCK},
        "assigned_user": {"old": None, "new": None},
    }
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "add",
        changes=changes,
        note=payload.note,
    )
    conn.commit()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return {"item": row_to_item(row)}


@router.get("/items/{item_id}")
def get_item(
    item_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    events = conn.execute(
        "SELECT * FROM audit_events WHERE item_id = ? ORDER BY id ASC", (item_id,)
    ).fetchall()
    history = []
    for event in events:
        changes = json.loads(event["changes"]) if event["changes"] else None
        history.append(
            {
                "id": event["id"],
                "actor": event["actor"],
                "timestamp": event["timestamp"],
                "action": event["action"],
                "changes": changes,
                "note": event["note"],
            }
        )
    return {"item": row_to_item(row), "history": history}


@router.put("/items/{item_id}")
def update_item(
    item_id: int,
    payload: ItemUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    updates: Dict[str, str] = {}
    for field in ["category", "make", "model", "service_tag", "row"]:
        value = getattr(payload, field)
        if value is not None:
            if field == "row":
                normalized = value.strip()
            else:
                normalized = require_nonempty(value, field)
            if field == "category":
                normalized = title_case_words(normalized)
            if field == "row" and normalized == "":
                normalized = None
            updates[field] = normalized
    changes: Dict[str, Dict[str, Any]] = {}
    for field, new_value in updates.items():
        old_value = row[field]
        if new_value != old_value:
            changes[field] = {"old": old_value, "new": new_value}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes to apply")
    set_clause = ", ".join([f"{field} = ?" for field in changes.keys()])
    updated_at = now_iso()
    conn.execute(
        f"UPDATE items SET {set_clause}, updated_at = ? WHERE id = ?",
        [changes[field]["new"] for field in changes.keys()] + [updated_at, item_id],
    )
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "edit",
        changes=changes,
        note=payload.note,
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return {"item": row_to_item(updated)}


@router.post("/items/{item_id}/deploy")
def deploy_item(
    item_id: int,
    payload: DeployRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    if row["status"] == STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item is retired")
    assigned_user = title_case_words(require_nonempty(payload.assigned_user, "assigned_user"))
    changes: Dict[str, Dict[str, Any]] = {}
    if row["status"] != STATUS_DEPLOYED:
        changes["status"] = {"old": row["status"], "new": STATUS_DEPLOYED}
    if assigned_user != row["assigned_user"]:
        changes["assigned_user"] = {"old": row["assigned_user"], "new": assigned_user}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes to apply")
    updated_at = now_iso()
    conn.execute(
        "UPDATE items SET status = ?, assigned_user = ?, updated_at = ? WHERE id = ?",
        (STATUS_DEPLOYED, assigned_user, updated_at, item_id),
    )
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "deploy",
        changes=changes,
        note=payload.note,
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return {"item": row_to_item(updated)}


@router.post("/items/{item_id}/return")
def return_item(
    item_id: int,
    payload: ReturnRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    if row["status"] == STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item is retired")
    if row["status"] == STATUS_IN_STOCK and row["assigned_user"] is None:
        raise HTTPException(status_code=400, detail="Item already in stock")
    changes = {
        "status": {"old": row["status"], "new": STATUS_IN_STOCK},
        "assigned_user": {"old": row["assigned_user"], "new": None},
    }
    updated_at = now_iso()
    conn.execute(
        "UPDATE items SET status = ?, assigned_user = ?, updated_at = ? WHERE id = ?",
        (STATUS_IN_STOCK, None, updated_at, item_id),
    )
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "return",
        changes=changes,
        note=payload.note,
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return {"item": row_to_item(updated)}


@router.post("/items/{item_id}/retire")
def retire_item(
    item_id: int,
    payload: ReturnRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    if row["status"] == STATUS_DEPLOYED:
        raise HTTPException(status_code=400, detail="Item is deployed")
    if row["status"] == STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item already retired")
    changes = {
        "status": {"old": row["status"], "new": STATUS_RETIRED},
        "assigned_user": {"old": row["assigned_user"], "new": None},
    }
    updated_at = now_iso()
    conn.execute(
        "UPDATE items SET status = ?, assigned_user = ?, updated_at = ? WHERE id = ?",
        (STATUS_RETIRED, None, updated_at, item_id),
    )
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "retire",
        changes=changes,
        note=payload.note,
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return {"item": row_to_item(updated)}


@router.post("/items/{item_id}/restore")
def restore_item(
    item_id: int,
    payload: ReturnRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    if row["status"] != STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item is not retired")
    changes = {
        "status": {"old": row["status"], "new": STATUS_IN_STOCK},
        "assigned_user": {"old": row["assigned_user"], "new": None},
    }
    updated_at = now_iso()
    conn.execute(
        "UPDATE items SET status = ?, assigned_user = ?, updated_at = ? WHERE id = ?",
        (STATUS_IN_STOCK, None, updated_at, item_id),
    )
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "restore",
        changes=changes,
        note=payload.note,
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return {"item": row_to_item(updated)}
