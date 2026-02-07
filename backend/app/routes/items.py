import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..common import create_audit_event, now_iso, require_nonempty, row_to_item, title_case_words
from ..core.constants import STATUS_DEPLOYED, STATUS_IN_STOCK, STATUS_RETIRED
from ..core.security import get_current_user
from ..database.db import get_db
from ..models import DeployRequest, ItemCreate, ItemUpdate, ReturnRequest
from ..services import apply_item_status_change, build_history, get_item_or_404, get_item_response

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
    note = payload.note.strip() if payload.note else None
    cur = conn.execute(
        """
        INSERT INTO items (
            category, make, model, service_tag, row, note, status, assigned_user, created_at, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            category,
            make,
            model,
            service_tag,
            row,
            note,
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
        "note": {"old": None, "new": note},
        "status": {"old": None, "new": STATUS_IN_STOCK},
        "assigned_user": {"old": None, "new": None},
    }
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "add",
        changes=changes,
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
    row = get_item_or_404(conn, item_id)
    events = conn.execute(
        "SELECT * FROM audit_events WHERE item_id = ? ORDER BY id ASC", (item_id,)
    ).fetchall()
    return {"item": row_to_item(row), "history": build_history(events)}


@router.put("/items/{item_id}")
def update_item(
    item_id: int,
    payload: ItemUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = get_item_or_404(conn, item_id)
    updates: Dict[str, str] = {}
    for field in ["category", "make", "model", "service_tag", "row", "note"]:
        value = getattr(payload, field)
        if value is not None:
            if field in ("row", "note"):
                normalized = value.strip()
            else:
                normalized = require_nonempty(value, field)
            if field == "category":
                normalized = title_case_words(normalized)
            if field in ("row", "note") and normalized == "":
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
    )
    conn.commit()
    return get_item_response(conn, item_id)


@router.post("/items/{item_id}/deploy")
def deploy_item(
    item_id: int,
    payload: DeployRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = get_item_or_404(conn, item_id)
    if row["status"] == STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item is retired")
    assigned_user = title_case_words(require_nonempty(payload.assigned_user, "assigned_user"))
    if row["status"] == STATUS_DEPLOYED and assigned_user == row["assigned_user"]:
        raise HTTPException(status_code=400, detail="No changes to apply")
    return apply_item_status_change(
        conn=conn,
        row=row,
        item_id=item_id,
        next_status=STATUS_DEPLOYED,
        next_assigned_user=assigned_user,
        actor=current_user["username"],
        action="deploy",
        note=payload.note,
    )


@router.post("/items/{item_id}/return")
def return_item(
    item_id: int,
    payload: ReturnRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = get_item_or_404(conn, item_id)
    if row["status"] == STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item is retired")
    if row["status"] == STATUS_IN_STOCK and row["assigned_user"] is None:
        raise HTTPException(status_code=400, detail="Item already in stock")
    return apply_item_status_change(
        conn=conn,
        row=row,
        item_id=item_id,
        next_status=STATUS_IN_STOCK,
        next_assigned_user=None,
        actor=current_user["username"],
        action="return",
        note=payload.note,
    )


@router.post("/items/{item_id}/retire")
def retire_item(
    item_id: int,
    payload: ReturnRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = get_item_or_404(conn, item_id)
    if row["status"] == STATUS_DEPLOYED:
        raise HTTPException(status_code=400, detail="Item is deployed")
    if row["status"] == STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item already retired")
    return apply_item_status_change(
        conn=conn,
        row=row,
        item_id=item_id,
        next_status=STATUS_RETIRED,
        next_assigned_user=None,
        actor=current_user["username"],
        action="retire",
        note=payload.note,
    )


@router.post("/items/{item_id}/restore")
def restore_item(
    item_id: int,
    payload: ReturnRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = get_item_or_404(conn, item_id)
    if row["status"] != STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item is not retired")
    return apply_item_status_change(
        conn=conn,
        row=row,
        item_id=item_id,
        next_status=STATUS_IN_STOCK,
        next_assigned_user=None,
        actor=current_user["username"],
        action="restore",
        note=payload.note,
    )
