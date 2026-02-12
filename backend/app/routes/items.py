import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..common import (
    create_audit_event,
    is_cable_category,
    now_iso,
    require_nonempty,
    row_to_item,
    title_case_words,
)
from ..core.constants import STATUS_DEPLOYED, STATUS_IN_STOCK, STATUS_RETIRED
from ..core.security import get_current_user
from ..database.db import get_db
from ..models import (
    DeployRequest,
    ItemCreate,
    ItemUpdate,
    QuantityAdjustRequest,
    ReturnRequest,
)
from ..services import apply_item_status_change, build_history, get_item_or_404, get_item_response

router = APIRouter()


def normalize_service_tag(category: str, value: Optional[str]) -> str:
    if value is None:
        if is_cable_category(category):
            return "N/A"
        raise HTTPException(status_code=400, detail="service_tag is required")
    cleaned = value.strip()
    if cleaned:
        return cleaned
    if is_cable_category(category):
        return "N/A"
    raise HTTPException(status_code=400, detail="service_tag is required")


def normalize_cable_length(value: str) -> str:
    raw = value.strip()
    if not raw:
        return raw
    lowered = raw.lower()
    if lowered.endswith(" ft"):
        return f"{raw[:-3].strip()} ft"
    if lowered.endswith("ft"):
        return f"{raw[:-2].strip()} ft"
    return f"{raw} ft"


def normalize_cable_ends(value: str) -> str:
    raw = value.strip()
    if not raw:
        return raw
    parts = [part.strip() for part in raw.split("-", 1)]
    if len(parts) < 2:
        return raw
    left, right = parts[0], parts[1]
    if not left or not right:
        return raw
    ordered = sorted([left, right], key=lambda part: part.lower())
    return f"{ordered[0]}-{ordered[1]}"


def cable_signature(make: str, model: str) -> tuple[str, str]:
    return (
        normalize_cable_ends(make).lower(),
        normalize_cable_length(model).lower(),
    )


def find_existing_cable_conflict(
    conn: sqlite3.Connection,
    make: str,
    model: str,
    exclude_item_id: Optional[int] = None,
) -> Optional[int]:
    params: List[Any] = []
    query = "SELECT id, make, model FROM items WHERE lower(category) IN ('cable', 'cables')"
    if exclude_item_id is not None:
        query += " AND id != ?"
        params.append(exclude_item_id)
    rows = conn.execute(query, params).fetchall()
    target_signature = cable_signature(make, model)
    for existing in rows:
        if cable_signature(existing["make"], existing["model"]) == target_signature:
            return int(existing["id"])
    return None


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
    if is_cable_category(category):
        make = normalize_cable_ends(make)
        model = normalize_cable_length(model)
    service_tag = normalize_service_tag(category, payload.service_tag)
    quantity = 1
    row = payload.row.strip() if payload.row else None
    note = payload.note.strip() if payload.note else None
    if is_cable_category(category):
        existing_id = find_existing_cable_conflict(conn, make, model)
        if existing_id is not None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This cable already exists with the same ends and length. "
                    "Use Cable Manager to adjust quantity (+/-) instead of adding a new item."
                ),
            )
    try:
        cur = conn.execute(
            """
            INSERT INTO items (
                category, make, model, service_tag, quantity, row, note, status, assigned_user, created_at, created_by, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                category,
                make,
                model,
                service_tag,
                quantity,
                row,
                note,
                STATUS_IN_STOCK,
                None,
                created_at,
                current_user["username"],
                created_at,
            ),
        )
    except sqlite3.IntegrityError as exc:
        if "idx_items_cable_unique_signature" in str(exc):
            raise HTTPException(
                status_code=400,
                detail=(
                    "A cable with the same ends and length already exists. "
                    "Each cable ends+length combination must be unique."
                ),
            ) from exc
        raise
    item_id = cur.lastrowid
    changes = {
        "category": {"old": None, "new": category},
        "make": {"old": None, "new": make},
        "model": {"old": None, "new": model},
        "service_tag": {"old": None, "new": service_tag},
        "quantity": {"old": None, "new": quantity},
        "row": {"old": None, "new": row},
        "note": {"old": None, "new": note},
        "status": {"old": None, "new": STATUS_IN_STOCK},
    }
    if not is_cable_category(category):
        changes["assigned_user"] = {"old": None, "new": None}
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


@router.get("/items/category/{category}/summary")
def get_category_summary(
    category: str,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    normalized_category = title_case_words(require_nonempty(category, "category"))
    rows = conn.execute(
        "SELECT * FROM items WHERE lower(category) = lower(?) ORDER BY make ASC, model ASC, id ASC",
        (normalized_category,),
    ).fetchall()
    item_map = {row["id"]: row_to_item(row) for row in rows}
    if not item_map:
        return {"category": normalized_category, "items": [], "history": []}
    placeholders = ", ".join(["?"] * len(item_map))
    events = conn.execute(
        f"SELECT * FROM audit_events WHERE item_id IN ({placeholders}) ORDER BY id DESC",
        list(item_map.keys()),
    ).fetchall()
    history = []
    for event in events:
        parsed = build_history([event])[0]
        item = item_map.get(event["item_id"])
        parsed["item_id"] = event["item_id"]
        length_value = item["model"] if item else ""
        parsed["item_label"] = (
            f'{item["make"]} ({length_value})'.strip() if item else f'Item {event["item_id"]}'
        )
        history.append(parsed)
    return {"category": normalized_category, "items": list(item_map.values()), "history": history}


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
    updates: Dict[str, Any] = {}
    for field in ["category", "make", "model", "service_tag", "row", "note"]:
        value = getattr(payload, field)
        if value is not None:
            if field in ("row", "note"):
                normalized = value.strip()
            elif field == "service_tag":
                normalized = value.strip()
            else:
                normalized = require_nonempty(value, field)
            if field == "category":
                normalized = title_case_words(normalized)
            if field in ("row", "note") and normalized == "":
                normalized = None
            if field == "service_tag" and normalized == "":
                normalized = None
            updates[field] = normalized
    if payload.quantity is not None:
        raise HTTPException(
            status_code=400,
            detail="Use Cable Manager quantity controls to change quantity",
        )
    next_category = updates.get("category", row["category"])
    if is_cable_category(next_category):
        next_make = updates.get("make", row["make"])
        next_model = updates.get("model", row["model"])
        normalized_make = normalize_cable_ends(next_make)
        normalized_model = normalize_cable_length(next_model)
        if normalized_make != next_make:
            updates["make"] = normalized_make
        if normalized_model != next_model:
            updates["model"] = normalized_model
        next_signature = cable_signature(normalized_make, normalized_model)
        current_signature = (
            cable_signature(row["make"], row["model"])
            if is_cable_category(row["category"])
            else None
        )
        if current_signature != next_signature:
            existing_id = find_existing_cable_conflict(
                conn,
                normalized_make,
                normalized_model,
                exclude_item_id=item_id,
            )
            if existing_id is not None:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "A cable with the same ends and length already exists. "
                        "Each cable ends+length combination must be unique."
                    ),
                )
    next_service_tag = updates.get("service_tag", row["service_tag"])
    if not next_service_tag and not is_cable_category(next_category):
        raise HTTPException(status_code=400, detail="service_tag is required")
    if not next_service_tag and is_cable_category(next_category):
        updates["service_tag"] = "N/A"
    if "category" in updates and not is_cable_category(next_category) and row["quantity"] != 1:
        updates["quantity"] = 1
    changes: Dict[str, Dict[str, Any]] = {}
    for field, new_value in updates.items():
        old_value = row[field]
        if new_value != old_value:
            changes[field] = {"old": old_value, "new": new_value}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes to apply")
    set_clause = ", ".join([f"{field} = ?" for field in changes.keys()])
    updated_at = now_iso()
    try:
        conn.execute(
            f"UPDATE items SET {set_clause}, updated_at = ? WHERE id = ?",
            [changes[field]["new"] for field in changes.keys()] + [updated_at, item_id],
        )
    except sqlite3.IntegrityError as exc:
        if "idx_items_cable_unique_signature" in str(exc):
            raise HTTPException(
                status_code=400,
                detail=(
                    "A cable with the same ends and length already exists. "
                    "Each cable ends+length combination must be unique."
                ),
            ) from exc
        raise
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "edit",
        changes=changes,
    )
    conn.commit()
    return get_item_response(conn, item_id)


@router.post("/items/{item_id}/quantity")
def adjust_quantity(
    item_id: int,
    payload: QuantityAdjustRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = get_item_or_404(conn, item_id)
    if not is_cable_category(row["category"]):
        raise HTTPException(status_code=400, detail="Quantity adjustments are only available for cables")
    if payload.delta == 0:
        raise HTTPException(status_code=400, detail="No changes to apply")
    old_quantity = int(row["quantity"] or 0)
    new_quantity = old_quantity + payload.delta
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    changes = {"quantity": {"old": old_quantity, "new": new_quantity}}
    conn.execute(
        "UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?",
        (new_quantity, now_iso(), item_id),
    )
    create_audit_event(
        conn,
        item_id,
        current_user["username"],
        "quantity_adjust",
        changes=changes,
        note=payload.note.strip() if payload.note else None,
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
    if is_cable_category(row["category"]):
        raise HTTPException(
            status_code=400,
            detail="Cables do not use deploy/assigned user tracking",
        )
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
        include_assigned_user_change=not is_cable_category(row["category"]),
    )


@router.post("/items/{item_id}/retire")
def retire_item(
    item_id: int,
    payload: ReturnRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = get_item_or_404(conn, item_id)
    if row["status"] == STATUS_DEPLOYED and not is_cable_category(row["category"]):
        raise HTTPException(status_code=400, detail="Item is deployed")
    if row["status"] == STATUS_RETIRED:
        raise HTTPException(status_code=400, detail="Item already retired")
    is_cable = is_cable_category(row["category"])
    old_quantity = int(row["quantity"] or 0)
    should_zero_stock = is_cable and bool(payload.zero_stock) and old_quantity > 0
    changes = {"status": {"old": row["status"], "new": STATUS_RETIRED}}
    if not is_cable:
        changes["assigned_user"] = {"old": row["assigned_user"], "new": None}
    if should_zero_stock:
        changes["quantity"] = {"old": old_quantity, "new": 0}
        conn.execute(
            "UPDATE items SET status = ?, assigned_user = ?, quantity = ?, updated_at = ? WHERE id = ?",
            (STATUS_RETIRED, None, 0, now_iso(), item_id),
        )
    else:
        conn.execute(
            "UPDATE items SET status = ?, assigned_user = ?, updated_at = ? WHERE id = ?",
            (STATUS_RETIRED, None, now_iso(), item_id),
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
    return get_item_response(conn, item_id)


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
        include_assigned_user_change=not is_cable_category(row["category"]),
    )
