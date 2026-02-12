from typing import Optional, Literal

from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    category: str = Field(..., min_length=1)
    make: str = Field(..., min_length=1)
    model: str = Field(..., min_length=1)
    service_tag: Optional[str] = None
    quantity: int = Field(1, ge=0)
    row: Optional[str] = None
    note: Optional[str] = None


class ItemUpdate(BaseModel):
    category: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    service_tag: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    row: Optional[str] = None
    note: Optional[str] = None


class DeployRequest(BaseModel):
    assigned_user: str = Field(..., min_length=1)
    note: Optional[str] = None


class ReturnRequest(BaseModel):
    note: Optional[str] = None
    zero_stock: bool = False


class QuantityAdjustRequest(BaseModel):
    delta: int
    note: Optional[str] = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    role: Literal["user", "admin"] = "user"


class UserRoleUpdate(BaseModel):
    role: Literal["user", "admin"]


class UserPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=1)
