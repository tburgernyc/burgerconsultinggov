"""Observability: structured logging, safe error responses, and an append-only
audit trail. Addresses ENTERPRISE_AUDIT P1-2 (no internal-error leakage),
P2-5 (audit logging) and P4-4 (structured logging)."""
import json
import logging
import os
import sys
import uuid
from typing import Optional

from fastapi import HTTPException

from db import get_db_connection

_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        for key in ("correlation_id", "action", "actor"):
            val = getattr(record, key, None)
            if val is not None:
                payload[key] = val
        return json.dumps(payload)


def _build_logger() -> logging.Logger:
    lg = logging.getLogger("hermes")
    if not lg.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_JsonFormatter())
        lg.addHandler(handler)
        lg.setLevel(getattr(logging, _LEVEL, logging.INFO))
        lg.propagate = False
    return lg


logger = _build_logger()


def wrap_untrusted(label: str, value) -> str:
    """Fence externally-supplied text (vendor/prospect input, third-party feed data)
    so an LLM treats it as data, not instructions (ENTERPRISE_AUDIT P1-5).
    Strips embedded fence markers so the boundary cannot be spoofed."""
    text = str(value if value is not None else "")
    text = text.replace("<<", "").replace(">>", "")
    return f"<<{label}_BEGIN>>{text}<<{label}_END>>"


def fail(status_code: int, public_detail: str, exc: Optional[BaseException] = None) -> HTTPException:
    """Log the real error server-side with a correlation id and return an
    HTTPException whose public detail carries only that id — never the raw
    exception text (which can leak SQL, column names, or stack internals)."""
    cid = uuid.uuid4().hex[:12]
    logger.error(public_detail, exc_info=exc, extra={"correlation_id": cid})
    return HTTPException(status_code=status_code, detail=f"{public_detail} (ref: {cid})")


def audit(action: str, actor: str, target: Optional[str] = None,
          detail: Optional[dict] = None) -> None:
    """Append an immutable audit record. Never raises into the request path —
    an audit-write failure is logged but must not break the operation."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO audit_log (action, actor, target, detail)
            VALUES (%s, %s, %s, %s)
            """,
            (action, actor, target, json.dumps(detail or {})),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:  # noqa: BLE001 - audit must be best-effort
        logger.warning("audit write failed", exc_info=exc,
                       extra={"action": action, "actor": actor})
