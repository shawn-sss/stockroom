import os
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from .crypto import pwd_context
from ..database.db import get_db

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")


def authenticate_user(conn, username: str, password: str):
    normalized = username.strip().lower()
    cur = conn.execute("SELECT * FROM users WHERE lower(username) = ?", (normalized,))
    row = cur.fetchone()
    if not row:
        return None
    if not pwd_context.verify(password, row["password_hash"]):
        return None
    return row


def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_MINUTES):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    conn=Depends(get_db),
):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise credentials_error
    except JWTError as exc:
        raise credentials_error from exc
    normalized = username.strip().lower()
    cur = conn.execute("SELECT * FROM users WHERE lower(username) = ?", (normalized,))
    row = cur.fetchone()
    if not row:
        raise credentials_error
    return row


def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"] not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
