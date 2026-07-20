"""FastAPI dependencies for authenticating requests and enforcing permissions.

require() lives here (not just in router.py) so future modules outside
core/auth (patients, billing, ...) can reuse it, e.g.
Depends(require("patients:write")), without importing route-handling code.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.auth.models import User, UserStatus
from app.core.auth.permissions import permissions_for
from app.core.auth.security import decode_access_token
from app.database import get_db

# tokenUrl is only used to show a lock icon + login form in /docs; this API's
# actual /login endpoint takes JSON, not the OAuth2 form Swagger posts here.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise unauthorized

    payload = decode_access_token(token)
    if payload is None:
        raise unauthorized

    user = db.get(User, int(payload["sub"]))
    if user is None or user.status != UserStatus.ACTIVE:
        raise unauthorized

    return user


def require(permission: str):
    def _check(user: User = Depends(get_current_user)) -> User:
        if permission not in permissions_for(user.role):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted for this action")
        return user

    return _check
