"""Request/response models for the auth endpoints."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, computed_field

from app.core.auth.models import UserRole
from app.core.auth.permissions import permissions_for


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    role: str = Field(pattern="^(" + "|".join(UserRole.ALL) + ")$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    user_id: int
    email: str
    name: str
    role: str
    status: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @computed_field
    @property
    def permissions(self) -> list[str]:
        return sorted(permissions_for(self.role))



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class MessageResponse(BaseModel):
    detail: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class StaffOut(BaseModel):
    """Lightweight shape for staff-lookup lists (e.g. the queue board's
    per-doctor filter) - no email/status/permissions, unlike UserOut."""

    user_id: int
    name: str
    role: str

    class Config:
        from_attributes = True
