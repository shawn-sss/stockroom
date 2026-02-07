import json
from datetime import datetime, timedelta

from ..core.constants import STATUS_DEPLOYED, STATUS_IN_STOCK
from ..core.crypto import pwd_context


def seed_owner(conn) -> None:
    owner_hash = pwd_context.hash("owner")
    conn.execute(
        "INSERT INTO users (username, password_hash, created_at, role) VALUES (?, ?, ?, ?)",
        ("owner", owner_hash, datetime.utcnow().isoformat(), "owner"),
    )

    admin_hash = pwd_context.hash("admin")
    conn.execute(
        "INSERT INTO users (username, password_hash, created_at, role) VALUES (?, ?, ?, ?)",
        ("admin", admin_hash, datetime.utcnow().isoformat(), "admin"),
    )

    user_hash = pwd_context.hash("user")
    conn.execute(
        "INSERT INTO users (username, password_hash, created_at, role) VALUES (?, ?, ?, ?)",
        ("user", user_hash, datetime.utcnow().isoformat(), "user"),
    )


def seed_items(conn) -> None:
    default_items = [
        ("Laptop", "Dell", "Latitude 5420", "L5A2K7Q", "A1", STATUS_IN_STOCK, None),
        ("Laptop", "Dell", "Latitude 5420", "L8M4P2T", "A2", STATUS_DEPLOYED, "Alice Carter"),
        ("Laptop", "Dell", "Latitude 5440", "L7N3R9V", "A3", STATUS_IN_STOCK, None),
        ("Laptop", "Dell", "Latitude 5440", "L2H6X1B", "A4", STATUS_DEPLOYED, "Bob Martinez"),
        ("Laptop", "Dell", "Precision 3571", "L9Q5C8D", "A5", STATUS_IN_STOCK, None),
        ("Laptop", "Dell", "Precision 3571", "L3Z7M4F", "A6", STATUS_DEPLOYED, "Evan Reed"),
        ("Laptop", "Dell", "Precision 3591", "L6T1G9H", "A7", STATUS_IN_STOCK, None),
        ("Laptop", "Dell", "Precision 3591", "L4J8S2W", "A8", STATUS_DEPLOYED, "Nina Torres"),
        ("Laptop", "Dell", "Latitude 5420", "L1K5V7Y", "A9", STATUS_IN_STOCK, None),
        ("Laptop", "Dell", "Latitude 5440", "L2P9N3A", "A10", STATUS_IN_STOCK, None),
        ("Desktop", "Dell", "Precision 7910", "D8C4R2M", "B1", STATUS_IN_STOCK, None),
        ("Desktop", "Dell", "Precision 7910", "D1T7L5Q", "B2", STATUS_DEPLOYED, "Carol Johnson"),
        ("Desktop", "Dell", "Precision 3660", "D9H3W6X", "B3", STATUS_IN_STOCK, None),
        ("Desktop", "Dell", "Precision 3660", "D2S8B4N", "B4", STATUS_DEPLOYED, "David King"),
        ("Desktop", "Dell", "OptiPlex Micro 7010", "D7P1K9J", "B5", STATUS_IN_STOCK, None),
        ("Desktop", "Dell", "OptiPlex Micro 7010", "D4M6Z2T", "B6", STATUS_DEPLOYED, "Lucia Perez"),
        ("Desktop", "Dell", "OptiPlex Micro 7020", "D5V3Q8S", "B7", STATUS_IN_STOCK, None),
        ("Desktop", "Dell", "OptiPlex Micro 7020", "D6N9F1H", "B8", STATUS_DEPLOYED, "Miguel Ortiz"),
        ("Desktop", "Dell", "Precision 7910", "D3X7A5P", "B9", STATUS_IN_STOCK, None),
        ("Desktop", "Dell", "Precision 3660", "D2R6Y8C", "B10", STATUS_IN_STOCK, None),
        ("Monitor", "Dell", "P2422H", "M4P1T7H", "C1", STATUS_IN_STOCK, None),
        ("Monitor", "Dell", "P2422H", "M7Q2V9L", "C2", STATUS_DEPLOYED, "Taylor Brooks"),
        ("Monitor", "Dell", "U2720Q", "M1C8R5N", "C3", STATUS_IN_STOCK, None),
        ("Monitor", "Dell", "U2720Q", "M9K3S6B", "C4", STATUS_DEPLOYED, "Jordan Lee"),
        ("Dock", "Dell", "WD19S", "K2W6F8D", "D1", STATUS_IN_STOCK, None),
        ("Dock", "Dell", "WD19S", "K5H1P9T", "D2", STATUS_DEPLOYED, "Riley Chen"),
        ("Dock", "Dell", "WD19DCS", "K8N4Z2Q", "D3", STATUS_IN_STOCK, None),
        ("Dock", "Dell", "WD19DCS", "K3L7A5M", "D4", STATUS_DEPLOYED, "Morgan Patel"),
        ("Part", "Western Digital", "Blue 1TB", "P4W8D2L", "E1", STATUS_IN_STOCK, None),
        ("Part", "NVIDIA", "Quadro P2000", "P7N3Q5R", "E2", STATUS_IN_STOCK, None),
    ]

    created_by = "owner"
    for index, (category, make, model, service_tag, row, item_status, assigned_user) in enumerate(default_items):
        now = datetime.utcnow()
        if item_status == STATUS_DEPLOYED and assigned_user:
            created_at = now - timedelta(seconds=60) + timedelta(seconds=index)
        else:
            created_at = now + timedelta(seconds=index)
        created_at_str = created_at.isoformat()
        cursor = conn.execute(
            """
            INSERT INTO items (category, make, model, service_tag, row, note, status, assigned_user, created_at, created_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                category,
                make,
                model,
                service_tag,
                row,
                None,
                STATUS_IN_STOCK,
                None,
                created_at_str,
                created_by,
                created_at_str,
            ),
        )
        item_id = cursor.lastrowid
        changes = {
            "category": {"old": None, "new": category},
            "make": {"old": None, "new": make},
            "model": {"old": None, "new": model},
            "service_tag": {"old": None, "new": service_tag},
            "row": {"old": None, "new": row},
            "note": {"old": None, "new": None},
            "status": {"old": None, "new": STATUS_IN_STOCK},
            "assigned_user": {"old": None, "new": None},
        }

        conn.execute(
            """
            INSERT INTO audit_events (item_id, actor, timestamp, action, changes, note)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (item_id, created_by, created_at_str, "add", json.dumps(changes), None),
        )

        if item_status == STATUS_DEPLOYED and assigned_user:
            deployed_at = created_at + timedelta(seconds=30)
            deployed_at_str = deployed_at.isoformat()
            deploy_changes = {
                "status": {"old": STATUS_IN_STOCK, "new": STATUS_DEPLOYED},
                "assigned_user": {"old": None, "new": assigned_user},
            }
            conn.execute(
                "UPDATE items SET status = ?, assigned_user = ?, updated_at = ? WHERE id = ?",
                (STATUS_DEPLOYED, assigned_user, deployed_at_str, item_id),
            )
            conn.execute(
                """
                INSERT INTO audit_events (item_id, actor, timestamp, action, changes, note)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    item_id,
                    created_by,
                    deployed_at_str,
                    "deploy",
                    json.dumps(deploy_changes),
                    None,
                ),
            )
