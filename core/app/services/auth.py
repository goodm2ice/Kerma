from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

from fastapi import Request

from ..config import Settings


@dataclass(slots=True)
class AuthUser:
    login: str
    role: str
    source: str


class AuthService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.database_path = settings.database_path
        self._ensure_database()
        self._bootstrap_admin()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_database(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    login TEXT PRIMARY KEY,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL
                )
                """
            )

    def _bootstrap_admin(self) -> None:
        if not self.settings.bootstrap_admin_login or not self.settings.bootstrap_admin_password:
            return
        self.upsert_user(
            login=self.settings.bootstrap_admin_login,
            password=self.settings.bootstrap_admin_password,
            role=self.settings.bootstrap_admin_role,
        )

    def upsert_user(self, login: str, password: str, role: str) -> AuthUser:
        password_hash = self.hash_password(password)
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO users (login, password_hash, role)
                VALUES (?, ?, ?)
                ON CONFLICT(login) DO UPDATE SET
                    password_hash = excluded.password_hash,
                    role = excluded.role
                """,
                (login, password_hash, role),
            )
        return AuthUser(login=login, role=role, source="local")

    def ensure_sso_user(self, login: str, role: str) -> AuthUser:
        current = self.get_user(login)
        if current:
            if current.role != role:
                with self._connect() as connection:
                    connection.execute("UPDATE users SET role = ? WHERE login = ?", (role, login))
            return AuthUser(login=login, role=role, source="sso")

        if not self.settings.sso_auto_create_users:
            raise ValueError("SSO user is not provisioned.")

        with self._connect() as connection:
            connection.execute(
                "INSERT INTO users (login, password_hash, role) VALUES (?, ?, ?)",
                (login, "", role),
            )
        return AuthUser(login=login, role=role, source="sso")

    def get_user(self, login: str) -> AuthUser | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT login, password_hash, role FROM users WHERE login = ?",
                (login,),
            ).fetchone()

        if row is None:
            return None

        source = "local" if row["password_hash"] else "sso"
        return AuthUser(login=row["login"], role=row["role"], source=source)

    def authenticate_local(self, login: str, password: str) -> AuthUser | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT login, password_hash, role FROM users WHERE login = ?",
                (login,),
            ).fetchone()

        if row is None or not row["password_hash"]:
            return None

        if not self.verify_password(password, row["password_hash"]):
            return None

        return AuthUser(login=row["login"], role=row["role"], source="local")

    def authenticate_sso_request(self, request: Request) -> AuthUser | None:
        if not self.settings.sso_enabled:
            return None

        login = request.headers.get(self.settings.sso_user_header)
        if not login:
            return None

        role = request.headers.get(self.settings.sso_role_header) or self.settings.sso_default_role
        return self.ensure_sso_user(login=login.strip(), role=role.strip())

    def hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        iterations = 200_000
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return f"pbkdf2_sha256${iterations}${salt}${base64.b64encode(digest).decode('ascii')}"

    def verify_password(self, password: str, password_hash: str) -> bool:
        try:
            algorithm, iterations_raw, salt, digest_raw = password_hash.split("$", 3)
        except ValueError:
            return False

        if algorithm != "pbkdf2_sha256":
            return False

        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations_raw),
        )
        expected = base64.b64decode(digest_raw.encode("ascii"))
        return hmac.compare_digest(digest, expected)

    def create_session_token(self, user: AuthUser) -> str:
        payload = {
            "login": user.login,
            "role": user.role,
            "source": user.source,
            "exp": int((datetime.now(UTC) + timedelta(hours=self.settings.auth_session_ttl_hours)).timestamp()),
        }
        payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        signature = hmac.new(
            self.settings.auth_session_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).digest()
        return ".".join(
            [
                base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("="),
                base64.urlsafe_b64encode(signature).decode("ascii").rstrip("="),
            ]
        )

    def parse_session_token(self, token: str) -> AuthUser | None:
        try:
            payload_part, signature_part = token.split(".", 1)
            payload_bytes = base64.urlsafe_b64decode(_padded(payload_part))
            expected_signature = base64.urlsafe_b64decode(_padded(signature_part))
        except (ValueError, json.JSONDecodeError, binascii.Error, UnicodeDecodeError):
            return None

        actual_signature = hmac.new(
            self.settings.auth_session_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(actual_signature, expected_signature):
            return None

        payload: dict[str, Any] = json.loads(payload_bytes.decode("utf-8"))
        if int(payload.get("exp", 0)) < int(datetime.now(UTC).timestamp()):
            return None

        user = self.get_user(str(payload.get("login", "")))
        if user is None:
            return None

        return AuthUser(login=user.login, role=user.role, source=str(payload.get("source", user.source)))

    def build_sso_redirect(self, request: Request, next_url: str) -> str:
        if not self.settings.sso_login_url:
            raise ValueError("SSO login URL is not configured.")

        callback_url = str(request.url_for("sso_login"))
        callback_with_next = f"{callback_url}?{urlencode({'next': next_url})}"
        separator = "&" if "?" in self.settings.sso_login_url else "?"
        return f"{self.settings.sso_login_url}{separator}{urlencode({self.settings.sso_return_to_param: callback_with_next})}"


def _padded(value: str) -> bytes:
    return f"{value}{'=' * (-len(value) % 4)}".encode("ascii")
