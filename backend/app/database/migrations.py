import sqlite3
from typing import Dict, List, Tuple

from ..core.constants import STATUS_IN_STOCK, STATUS_RETIRED


def _normalize_cable_length(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return raw
    lowered = raw.lower()
    if lowered.endswith(" ft"):
        return f"{raw[:-3].strip()} ft"
    if lowered.endswith("ft"):
        return f"{raw[:-2].strip()} ft"
    return f"{raw} ft"


def _normalize_cable_ends(value: str) -> str:
    raw = (value or "").strip()
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


def _cable_signature(make: str, model: str) -> Tuple[str, str]:
    return (_normalize_cable_ends(make).lower(), _normalize_cable_length(model).lower())


def _canonicalize_and_merge_cable_duplicates(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT *
        FROM items
        WHERE lower(category) IN ('cable', 'cables')
        ORDER BY id ASC
        """
    ).fetchall()
    groups: Dict[Tuple[str, str], List[sqlite3.Row]] = {}
    for row in rows:
        signature = _cable_signature(row["make"], row["model"])
        groups.setdefault(signature, []).append(row)

    for signature, grouped in groups.items():
        normalized_make, normalized_model = signature[0], signature[1]
        canonical_make = _normalize_cable_ends(grouped[0]["make"])
        canonical_model = _normalize_cable_length(grouped[0]["model"])
        if len(grouped) == 1:
            row = grouped[0]
            quantity = int(row["quantity"] or 0)
            conn.execute(
                """
                UPDATE items
                SET category = ?, make = ?, model = ?, service_tag = ?, quantity = ?, assigned_user = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    "Cables",
                    canonical_make,
                    canonical_model,
                    "N/A",
                    max(0, quantity),
                    None,
                    row["updated_at"] or row["created_at"],
                    row["id"],
                ),
            )
            continue

        keep = next((item for item in grouped if item["status"] != STATUS_RETIRED), grouped[0])
        keep_id = int(keep["id"])
        total_quantity = sum(max(0, int(item["quantity"] or 0)) for item in grouped)
        next_status = STATUS_IN_STOCK if any(item["status"] != STATUS_RETIRED for item in grouped) else STATUS_RETIRED
        merged_row = keep["row"] or next((item["row"] for item in grouped if item["row"]), None)
        merged_note = keep["note"] or next((item["note"] for item in grouped if item["note"]), None)
        merged_updated_at = max((item["updated_at"] or item["created_at"] for item in grouped))

        conn.execute(
            """
            UPDATE items
            SET category = ?, make = ?, model = ?, service_tag = ?, quantity = ?, row = ?, note = ?,
                status = ?, assigned_user = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                "Cables",
                canonical_make,
                canonical_model,
                "N/A",
                total_quantity,
                merged_row,
                merged_note,
                next_status,
                None,
                merged_updated_at,
                keep_id,
            ),
        )

        for duplicate in grouped:
            duplicate_id = int(duplicate["id"])
            if duplicate_id == keep_id:
                continue
            conn.execute(
                "UPDATE audit_events SET item_id = ? WHERE item_id = ?",
                (keep_id, duplicate_id),
            )
            conn.execute("DELETE FROM items WHERE id = ?", (duplicate_id,))

    conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_items_cable_unique_signature
        ON items(lower(make), lower(model))
        WHERE lower(category) IN ('cable', 'cables')
        """
    )


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
    if "note" not in item_cols:
        conn.execute("ALTER TABLE items ADD COLUMN note TEXT")
    if "quantity" not in item_cols:
        conn.execute("ALTER TABLE items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1")
    conn.execute("UPDATE items SET quantity = 1 WHERE quantity IS NULL")
    _canonicalize_and_merge_cable_duplicates(conn)
