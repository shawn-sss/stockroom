from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from ..db import get_db
from ..security import authenticate_user, create_access_token, get_current_user

router = APIRouter()


@router.post("/token")
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    conn=Depends(get_db),
):
    user = authenticate_user(conn, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user["username"]})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {"username": current_user["username"], "role": current_user["role"]}


@router.get("/hello")
def hello(current_user=Depends(get_current_user)):
    return {"message": f"Hello, {current_user['username']}!"}


@router.post("/logout")
def logout(current_user=Depends(get_current_user)):
    return {"ok": True}
