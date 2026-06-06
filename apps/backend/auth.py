import hashlib
import hmac
import os
import time
from typing import Optional

from fastapi import Header, HTTPException
from passlib.context import CryptContext

# Three distinct trust roles — never the same secret (see ENTERPRISE_AUDIT P0-3).
#   _ADMIN_TOKEN         — proves the caller is the admin tier (admin proxy only).
#   _GATEWAY_TOKEN       — shared proxy<->backend secret; proves a request came through
#                          an authenticated Next.js proxy rather than the public surface.
#   _VENDOR_SIGNING_KEY  — HMAC key the vendor proxy uses to mint a short-lived token
#                          binding the *authenticated* vendor_id, so the backend never
#                          trusts a raw, attacker-settable X-Vendor-Id header.
# Each falls back to the previous role's secret so a partial .env rollout still boots,
# but production MUST set all three to independent random values.
_ADMIN_TOKEN = os.getenv("BACKEND_ADMIN_TOKEN", "")
_GATEWAY_TOKEN = os.getenv("BACKEND_GATEWAY_TOKEN") or _ADMIN_TOKEN
_VENDOR_SIGNING_KEY = os.getenv("BACKEND_VENDOR_SIGNING_KEY") or _GATEWAY_TOKEN

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _require_admin(x_admin_token: str = Header(default="", alias="X-Admin-Token")) -> None:
    if not _ADMIN_TOKEN or not hmac.compare_digest(x_admin_token, _ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _require_gateway(x_gateway_token: str = Header(default="", alias="X-Gateway-Token")) -> None:
    """Allow only requests forwarded by the authenticated Next.js proxy.

    Use on endpoints that must be reachable by any logged-in user (admin OR vendor)
    but never by an anonymous caller hitting the backend directly.
    """
    if not _GATEWAY_TOKEN or not hmac.compare_digest(x_gateway_token, _GATEWAY_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _verify_vendor_token(token: str) -> Optional[str]:
    """Verify an HMAC vendor token minted by the Next.js vendor proxy.

    Format: ``<vendor_id>.<exp_epoch_seconds>.<hex_hmac_sha256>`` where the MAC is
    computed over ``<vendor_id>.<exp>`` with _VENDOR_SIGNING_KEY. Returns the bound
    vendor_id only when the signature is valid and the token has not expired.
    """
    if not _VENDOR_SIGNING_KEY or not token:
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    vendor_id, exp, sig = parts
    expected = hmac.new(
        _VENDOR_SIGNING_KEY.encode(), f"{vendor_id}.{exp}".encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return None
    try:
        if int(exp) < int(time.time()):
            return None
    except ValueError:
        return None
    return vendor_id


def _require_vendor(
    x_vendor_token: str = Header(default="", alias="X-Vendor-Token"),
    x_gateway_token: str = Header(default="", alias="X-Gateway-Token"),
) -> str:
    # Two independent checks: the request must arrive via the proxy (gateway secret),
    # and the vendor identity must be a signed, unexpired token — not a bare header an
    # attacker could set to any UUID even if the gateway secret leaked.
    if not _GATEWAY_TOKEN or not hmac.compare_digest(x_gateway_token, _GATEWAY_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")
    vendor_id = _verify_vendor_token(x_vendor_token)
    if not vendor_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return vendor_id
