import os
from fastapi import Header, HTTPException
from passlib.context import CryptContext

_ADMIN_TOKEN = os.getenv("BACKEND_ADMIN_TOKEN", "")
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _require_admin(x_admin_token: str = Header(default="", alias="X-Admin-Token")) -> None:
    if not _ADMIN_TOKEN or x_admin_token != _ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
