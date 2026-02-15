import re
from typing import Optional, Literal

from pydantic import BaseModel, Field, field_validator

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9]+$")
PASSWORD_PATTERN = re.compile(r"^[A-Za-z0-9!@#$%^&*()_+\-=.?]+$")


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

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        cleaned = value.strip()
        if not USERNAME_PATTERN.fullmatch(cleaned):
            raise ValueError("username must use letters and numbers only")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(value):
            raise ValueError(
                "password must use letters, numbers, and safe symbols (!@#$%^&*()_+-=.?) only"
            )
        return value


class UserRoleUpdate(BaseModel):
    role: Literal["user", "admin"]


class UserPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=1)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(value):
            raise ValueError(
                "new_password must use letters, numbers, and safe symbols (!@#$%^&*()_+-=.?) only"
            )
        return value
