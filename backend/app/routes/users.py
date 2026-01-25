import sqlite3
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from ..crypto import pwd_context
from ..db import get_db
from ..schemas import UserCreate, UserPasswordReset, UserRoleUpdate
from ..security import get_current_user, require_admin
from ..utils import create_user_audit_log, require_nonempty

router = APIRouter()


@router.get("/users")
def list_users(
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = conn.execute(
        "SELECT id, username, role, created_at FROM users ORDER BY username ASC"
    ).fetchall()
    return {
        "users": [
            {
                "id": row["id"],
                "username": row["username"],
                "role": row["role"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]
    }


@router.post("/users", status_code=201)
def create_user(
    payload: UserCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="User creation requires admin or owner")
    role = payload.role
    if role == "admin" and current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can assign admin access")
    username = require_nonempty(payload.username, "username")
    normalized_username = username.casefold()
    existing = conn.execute(
        "SELECT 1 FROM users WHERE lower(username) = ?",
        (normalized_username,),
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    password = require_nonempty(payload.password, "password")
    password_hash = pwd_context.hash(password)
    try:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, created_at, role) VALUES (?, ?, ?, ?)",
            (username, password_hash, datetime.utcnow().isoformat(), role),
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail="Username already exists") from exc
    row = conn.execute(
        "SELECT id, username, role, created_at FROM users WHERE id = ?",
        (cur.lastrowid,),
    ).fetchone()

    create_user_audit_log(
        conn,
        actor=current_user["username"],
        target_user=username,
        action="user_created",
        details=f"Created with role: {role}",
        new_value=role,
    )
    conn.commit()

    return {
        "user": {
            "id": row["id"],
            "username": row["username"],
            "role": row["role"],
            "created_at": row["created_at"],
        }
    }


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only owners can change user roles")

    user_row = conn.execute(
        "SELECT id, username, role FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    if user_row["id"] == current_user["id"] and payload.role != "owner":
        raise HTTPException(status_code=400, detail="Cannot change your own owner role")

    if payload.role == "owner":
        raise HTTPException(status_code=403, detail="Owner role cannot be assigned")

    new_role = payload.role
    conn.execute(
        "UPDATE users SET role = ? WHERE id = ?",
        (new_role, user_id),
    )

    create_user_audit_log(
        conn,
        actor=current_user["username"],
        target_user=user_row["username"],
        action="role_changed",
        details=f"Role changed from {user_row['role']} to {new_role}",
        old_value=user_row["role"],
        new_value=new_role,
    )
    conn.commit()

    updated_row = conn.execute(
        "SELECT id, username, role, created_at FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    return {
        "user": {
            "id": updated_row["id"],
            "username": updated_row["username"],
            "role": updated_row["role"],
            "created_at": updated_row["created_at"],
        }
    }


@router.put("/users/{username}/reset-password")
def reset_user_password(
    username: str,
    payload: UserPasswordReset,
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    new_password = require_nonempty(payload.new_password, "new_password")
    normalized_username = require_nonempty(username, "username").casefold()
    user_row = conn.execute(
        "SELECT id, username, role FROM users WHERE lower(username) = ?",
        (normalized_username,),
    ).fetchone()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    current_role = current_user["role"]
    target_role = user_row["role"]

    if current_role == "owner":
        pass
    elif current_role == "admin":
        if user_row["username"] != current_user["username"] and target_role != "user":
            raise HTTPException(status_code=403, detail="Admins can only reset their own password or a user's password")
    else:
        if user_row["username"] != current_user["username"]:
            raise HTTPException(status_code=403, detail="You can only reset your own password")

    password_hash = pwd_context.hash(new_password)
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE username = ?",
        (password_hash, user_row["username"]),
    )

    create_user_audit_log(
        conn,
        actor=current_user["username"],
        target_user=user_row["username"],
        action="password_reset",
        details=f"Password reset by {current_user['username']}",
    )
    conn.commit()

    return {"ok": True, "message": "Password reset successfully"}


@router.get("/user-audit-logs")
def get_user_audit_logs(
    conn: sqlite3.Connection = Depends(get_db),
    current_user=Depends(require_admin),
):
    rows = conn.execute(
        "SELECT * FROM user_audit_logs ORDER BY timestamp DESC LIMIT 100"
    ).fetchall()
    return {
        "logs": [
            {
                "id": row["id"],
                "actor": row["actor"],
                "target_user": row["target_user"],
                "timestamp": row["timestamp"],
                "action": row["action"],
                "details": row["details"],
                "old_value": row["old_value"],
                "new_value": row["new_value"],
            }
            for row in rows
        ]
    }
