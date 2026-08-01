"""
Autenticação simples por email e senha.

- Usuários são configurados pela variável de ambiente AUTH_USERS no formato
  "email:senha,email2:senha2". Se não houver nenhum, um usuário padrão é
  criado (admin@empresa.com / admin123) apenas para o primeiro acesso —
  troque em produção.
- As senhas são guardadas apenas como hash (PBKDF2-SHA256) em memória.
- O login devolve um token assinado com HMAC (sem dependências externas),
  contendo o email e a validade. Os endpoints protegidos exigem esse token.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional

from fastapi import Header, HTTPException

# Segredo para assinar os tokens. Defina SECRET_KEY em produção para que os
# tokens continuem válidos entre reinicializações.
SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)

# Validade do token em segundos (padrão: 12 horas)
TOKEN_TTL = int(os.environ.get("TOKEN_TTL", str(12 * 3600)))

_PBKDF2_ITERATIONS = 120_000


def _hash_password(password: str, salt: bytes) -> str:
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return f"{salt.hex()}${dk.hex()}"


def _make_password(password: str) -> str:
    return _hash_password(password, secrets.token_bytes(16))


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, _ = stored.split("$", 1)
        candidate = _hash_password(password, bytes.fromhex(salt_hex))
        return hmac.compare_digest(candidate, stored)
    except Exception:
        return False


def _load_users() -> dict[str, str]:
    """Carrega os usuários da env AUTH_USERS -> {email: hash}."""
    raw = os.environ.get("AUTH_USERS", "").strip()
    users: dict[str, str] = {}
    if raw:
        for pair in raw.split(","):
            pair = pair.strip()
            if not pair or ":" not in pair:
                continue
            email, password = pair.split(":", 1)
            email = email.strip().lower()
            if email and password:
                users[email] = _make_password(password)
    if not users:
        # Usuário padrão apenas para o primeiro acesso — troque em produção.
        users["admin@empresa.com"] = _make_password("admin123")
    return users


_USERS = _load_users()
_USING_DEFAULT = not os.environ.get("AUTH_USERS", "").strip()


def using_default_credentials() -> bool:
    return _USING_DEFAULT


# ---------------------------------------------------------------------------
# Tokens (HMAC)
# ---------------------------------------------------------------------------


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64d(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_token(email: str) -> str:
    payload = {"sub": email, "exp": int(time.time()) + TOKEN_TTL}
    body = _b64e(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64e(sig)}"


def verify_token(token: str) -> Optional[str]:
    """Retorna o email se o token for válido e não expirado, senão None."""
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64e(expected), sig):
            return None
        payload = json.loads(_b64d(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload.get("sub")
    except Exception:
        return None


def authenticate(email: str, password: str) -> Optional[str]:
    """Valida email/senha e devolve um token, ou None se inválido."""
    stored = _USERS.get((email or "").strip().lower())
    if not stored or not _verify_password(password, stored):
        return None
    return create_token((email or "").strip().lower())


# ---------------------------------------------------------------------------
# Dependência do FastAPI para proteger rotas
# ---------------------------------------------------------------------------


def require_auth(authorization: str = Header(default="")) -> str:
    """Exige um cabeçalho Authorization: Bearer <token> válido."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado.")
    token = authorization[7:].strip()
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    return email
