import sqlite3
from typing import Optional, Tuple

from fastapi import HTTPException


CABLE_DUPLICATE_ERROR = (
    "A cable with the same ends and length already exists. "
    "Each cable ends+length combination must be unique."
)


def normalize_cable_length(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return raw
    lowered = raw.lower()
    if lowered.endswith(" ft"):
        return f"{raw[:-3].strip()} ft"
    if lowered.endswith("ft"):
        return f"{raw[:-2].strip()} ft"
    return f"{raw} ft"


def normalize_cable_ends(value: str) -> str:
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


def cable_signature(make: str, model: str) -> Tuple[str, str]:
    return (
        normalize_cable_ends(make).lower(),
        normalize_cable_length(model).lower(),
    )


def is_cable_unique_integrity_error(exc: sqlite3.IntegrityError) -> bool:
    return "idx_items_cable_unique_signature" in str(exc)


def raise_if_cable_unique_integrity_error(exc: sqlite3.IntegrityError) -> None:
    if is_cable_unique_integrity_error(exc):
        raise HTTPException(status_code=400, detail=CABLE_DUPLICATE_ERROR) from exc
