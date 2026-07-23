"""Auth endpoints: register, login, password reset, email verification.

DB timestamp columns are TIMESTAMP WITHOUT TIME ZONE (naive), so all
datetimes compared/stored here must also be naive - always UTC by
convention, never local time.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user, require
from app.core.auth.email import send_password_reset_email, send_verification_email
from app.core.auth.models import AuthToken, AuthTokenPurpose, User, UserRole, UserStatus
from app.core.auth.schemas import (
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    ResendVerificationRequest,
    StaffOut,
    TokenResponse,
    UserOut,
    VerifyEmailRequest,
)
from app.core.auth.security import (
    create_access_token,
    generate_raw_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFICATION_TOKEN_LIFETIME = timedelta(hours=24)
PASSWORD_RESET_TOKEN_LIFETIME = timedelta(minutes=30)

# Generic responses that must look identical whether or not the target
# account exists, to avoid leaking which emails are registered.
_RESET_REQUEST_MESSAGE = "If that email is registered, a password reset link has been sent."
_RESEND_VERIFICATION_MESSAGE = (
    "If that account exists and is not yet verified, a verification email has been sent."
)


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _issue_token(db: Session, user: User, purpose: str, lifetime: timedelta) -> str:
    """Invalidates any outstanding unconsumed tokens of this purpose for the
    user, then creates and returns a fresh raw token (only its hash is
    stored)."""
    db.query(AuthToken).filter(
        AuthToken.user_id == user.user_id,
        AuthToken.purpose == purpose,
        AuthToken.consumed_at.is_(None),
    ).update({"consumed_at": datetime.utcnow()})

    raw_token = generate_raw_token()
    db.add(
        AuthToken(
            user_id=user.user_id,
            purpose=purpose,
            token_hash=hash_token(raw_token),
            expires_at=datetime.utcnow() + lifetime,
        )
    )
    return raw_token


def _consume_token(db: Session, raw_token: str, purpose: str) -> AuthToken | None:
    token = (
        db.query(AuthToken)
        .filter(
            AuthToken.token_hash == hash_token(raw_token),
            AuthToken.purpose == purpose,
            AuthToken.consumed_at.is_(None),
        )
        .first()
    )
    if token is None:
        return None
    if token.expires_at < datetime.utcnow():
        return None
    token.consumed_at = datetime.utcnow()
    return token


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    # Self-closing bootstrap guard: once one admin exists, this open
    # endpoint stops minting more. Does NOT lock down other staff roles -
    # see auth_notes.md for what's still needed before real deployment.
    if payload.role == UserRole.ADMIN:
        if db.query(User).filter(User.role == UserRole.ADMIN).first() is not None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Admin registration is closed; contact an existing administrator.",
            )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        role=payload.role,
        status=UserStatus.ACTIVE,
        is_verified=False,
    )
    db.add(user)
    db.flush()  # assigns user.user_id before we reference it below

    raw_token = _issue_token(db, user, AuthTokenPurpose.EMAIL_VERIFICATION, VERIFICATION_TOKEN_LIFETIME)
    record_audit(
        db,
        actor_user_id=user.user_id,
        action="auth.register",
        entity="user",
        entity_id=str(user.user_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(user)

    send_verification_email(to_email=user.email, name=user.name, raw_token=raw_token)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise invalid

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive. Contact an administrator.")

    access_token, expires_in = create_access_token(user_id=user.user_id, role=user.role)
    record_audit(
        db,
        actor_user_id=user.user_id,
        action="auth.login",
        entity="user",
        entity_id=str(user.user_id),
        ip_address=_client_ip(request),
    )
    db.commit()

    return TokenResponse(access_token=access_token, expires_in=expires_in, user=user)


@router.post("/password-reset-request", response_model=MessageResponse)
def password_reset_request(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        raw_token = _issue_token(db, user, AuthTokenPurpose.PASSWORD_RESET, PASSWORD_RESET_TOKEN_LIFETIME)
        record_audit(
            db,
            actor_user_id=user.user_id,
            action="auth.password_reset_request",
            entity="user",
            entity_id=str(user.user_id),
        )
        db.commit()
        send_password_reset_email(to_email=user.email, name=user.name, raw_token=raw_token)

    return MessageResponse(detail=_RESET_REQUEST_MESSAGE)


@router.post("/password-reset-confirm", response_model=MessageResponse)
def password_reset_confirm(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    token = _consume_token(db, payload.token, AuthTokenPurpose.PASSWORD_RESET)
    if token is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token")

    user = db.get(User, token.user_id)
    user.hashed_password = hash_password(payload.new_password)
    record_audit(
        db,
        actor_user_id=user.user_id,
        action="auth.password_reset_confirm",
        entity="user",
        entity_id=str(user.user_id),
    )
    db.commit()
    return MessageResponse(detail="Password has been reset. You can now log in.")


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    token = _consume_token(db, payload.token, AuthTokenPurpose.EMAIL_VERIFICATION)
    if token is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token")

    user = db.get(User, token.user_id)
    user.is_verified = True
    record_audit(
        db,
        actor_user_id=user.user_id,
        action="auth.email_verify",
        entity="user",
        entity_id=str(user.user_id),
    )
    db.commit()
    return MessageResponse(detail="Email verified successfully.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None and not user.is_verified:
        raw_token = _issue_token(db, user, AuthTokenPurpose.EMAIL_VERIFICATION, VERIFICATION_TOKEN_LIFETIME)
        db.commit()
        send_verification_email(to_email=user.email, name=user.name, raw_token=raw_token)

    return MessageResponse(detail=_RESEND_VERIFICATION_MESSAGE)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/staff", response_model=list[StaffOut])
def list_staff(
    role: str | None = Query(default=None, pattern="^(" + "|".join(UserRole.ALL) + ")$"),
    db: Session = Depends(get_db),
    _user: User = Depends(require("queue:read")),
):
    """Staff lookup for cross-module pickers (e.g. the queue board's
    per-doctor filter). Only active accounts - an inactive/suspended
    doctor shouldn't be selectable for a new token."""
    query = db.query(User).filter(User.status == UserStatus.ACTIVE)
    if role is not None:
        query = query.filter(User.role == role)
    return query.order_by(User.name).all()
