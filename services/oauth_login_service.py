"""Manual OAuth bridge service.

Lets the user complete OpenAI's standard OAuth + PKCE authorization code flow in their browser:
  1. Backend generates code_verifier / code_challenge / state and builds the authorize URL.
  2. User signs in; the browser is redirected to the platform.openai.com callback;
     the user copies the code from the address bar or devtools back into the UI.
  3. Backend exchanges the stored code_verifier + code via /api/accounts/oauth/token
     for {access_token, refresh_token, id_token}.

The refresh_token uses the same client_id as account_service auto-refresh
(app_2SKx67EdpoN0G6j64rFvigXD), so persisted accounts enter the keepalive cycle.
"""
from __future__ import annotations

import secrets
import threading
import time
import uuid
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

from curl_cffi import requests

from services.openai_oauth import (
    auth_base,
    common_headers,
    platform_auth0_client,
    platform_base,
    platform_oauth_audience,
    platform_oauth_client_id,
    platform_oauth_redirect_uri,
    sec_ch_ua,
    user_agent,
)
from services.proxy_service import proxy_settings


class OAuthLoginError(Exception):
    """Expected OAuth bridge error; API layer maps this to HTTP 400."""


class OAuthLoginService:
    """Maintains temporary PKCE sessions and exchanges code for tokens."""

    _SESSION_TTL_SECONDS = 10 * 60  # Time for user to open browser and submit code
    _MAX_SESSIONS = 64               # Cap sessions; evict oldest when over limit

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sessions: dict[str, dict[str, Any]] = {}

    @staticmethod
    def _generate_pkce() -> tuple[str, str]:
        """Generate PKCE code_verifier and code_challenge (S256)."""
        from utils.pkce import generate_pkce
        return generate_pkce()

    def _purge_expired_locked(self) -> None:
        """Remove expired or excess sessions; caller must hold the lock."""
        now = time.time()
        expired = [sid for sid, item in self._sessions.items() if now - item["created_at"] > self._SESSION_TTL_SECONDS]
        for sid in expired:
            self._sessions.pop(sid, None)
        if len(self._sessions) > self._MAX_SESSIONS:
            ordered = sorted(self._sessions.items(), key=lambda kv: kv[1]["created_at"])
            for sid, _ in ordered[: len(self._sessions) - self._MAX_SESSIONS]:
                self._sessions.pop(sid, None)

    def start(self, email_hint: str = "") -> dict[str, str]:
        """Register a PKCE session; return session_id and authorize_url for the browser.

        state is "<session_id>.<nonce>" so the callback URL carries session_id even
        if frontend React state is lost.
        """
        verifier, challenge = self._generate_pkce()
        nonce = secrets.token_urlsafe(32)
        device_id = str(uuid.uuid4())
        session_id = uuid.uuid4().hex
        state = f"{session_id}.{secrets.token_urlsafe(16)}"

        params = {
            "issuer": auth_base,
            "client_id": platform_oauth_client_id,
            "audience": platform_oauth_audience,
            "redirect_uri": platform_oauth_redirect_uri,
            "device_id": device_id,
            "screen_hint": "login_or_signup",
            "max_age": "0",
            "scope": "openid profile email offline_access",
            "response_type": "code",
            "response_mode": "query",
            "state": state,
            "nonce": nonce,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "auth0Client": platform_auth0_client,
        }
        email_hint = str(email_hint or "").strip()
        if email_hint:
            params["login_hint"] = email_hint

        authorize_url = f"{auth_base}/api/accounts/authorize?{urlencode(params)}"

        with self._lock:
            self._purge_expired_locked()
            self._sessions[session_id] = {
                "code_verifier": verifier,
                "state": state,
                "created_at": time.time(),
                "redirect_uri": platform_oauth_redirect_uri,
            }

        return {
            "session_id": session_id,
            "authorize_url": authorize_url,
            "expires_in": str(self._SESSION_TTL_SECONDS),
            "redirect_uri_prefix": platform_oauth_redirect_uri,
        }

    @staticmethod
    def _extract_code_from_callback(value: str) -> tuple[str, str]:
        """Extract (code, state) from callback URL or raw code string."""
        raw = str(value or "").strip()
        if not raw:
            return "", ""
        if raw.startswith("http://") or raw.startswith("https://"):
            try:
                parsed = parse_qs(urlparse(raw).query)
            except Exception as exc:
                raise OAuthLoginError(f"Failed to parse callback URL: {exc}") from exc
            code = str((parsed.get("code") or [""])[0]).strip()
            state = str((parsed.get("state") or [""])[0]).strip()
            if not code:
                err = str((parsed.get("error_description") or parsed.get("error") or [""])[0]).strip()
                raise OAuthLoginError(err or "callback URL has no code parameter")
            return code, state
        return raw, ""

    def finish(self, session_id: str, callback: str) -> dict[str, str]:
        """Exchange callback code for tokens using the session's code_verifier."""
        body_sid = str(session_id or "").strip()
        code, state = self._extract_code_from_callback(callback)
        if not code:
            raise OAuthLoginError("Missing code or callback URL")

        state_sid = state.split(".", 1)[0] if state else ""
        candidate_sids = [sid for sid in (state_sid, body_sid) if sid]
        if not candidate_sids:
            raise OAuthLoginError("No session_id provided and callback URL has no state")

        with self._lock:
            self._purge_expired_locked()
            session = None
            picked_sid = ""
            for sid in candidate_sids:
                cur = self._sessions.get(sid)
                if cur is not None:
                    session = cur
                    picked_sid = sid
                    break
        if session is None:
            raise OAuthLoginError(
                "OAuth session expired or not found; regenerate the authorize URL and try again"
            )

        if state and session.get("state") and state != session["state"]:
            raise OAuthLoginError(
                "state mismatch. You may have opened authorize twice but finished an older window; regenerate and retry."
            )

        tokens = self._exchange_code(
            code,
            session["code_verifier"],
            session.get("redirect_uri") or platform_oauth_redirect_uri,
        )
        with self._lock:
            self._sessions.pop(picked_sid, None)
        return tokens

    @staticmethod
    def _exchange_code(code: str, code_verifier: str, redirect_uri: str) -> dict[str, str]:
        """Call /api/accounts/oauth/token to exchange code + verifier for tokens."""
        kwargs = proxy_settings.build_session_kwargs(impersonate="chrome", verify=False)
        session = requests.Session(**kwargs)
        try:
            response = session.post(
                f"{auth_base}/api/accounts/oauth/token",
                headers={
                    **common_headers,
                    "referer": f"{platform_base}/",
                    "origin": platform_base,
                    "auth0-client": platform_auth0_client,
                    "sec-ch-ua": sec_ch_ua,
                    "user-agent": user_agent,
                },
                json={
                    "client_id": platform_oauth_client_id,
                    "code_verifier": code_verifier,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                timeout=60,
            )
        except Exception as exc:
            raise OAuthLoginError(f"Token exchange network error: {exc}") from exc
        finally:
            session.close()

        try:
            data = response.json() if response.text else {}
        except Exception:
            data = {}

        if response.status_code != 200 or not isinstance(data, dict) or not data.get("access_token"):
            detail = ""
            if isinstance(data, dict):
                detail = str(data.get("error_description") or data.get("error") or data.get("message") or "")
            if not detail:
                try:
                    detail = str(response.text or "")[:300]
                except Exception:
                    detail = ""
            print(
                f"[oauth-login] /api/accounts/oauth/token rejected: "
                f"status={response.status_code} detail={detail!r} "
                f"raw_body={(getattr(response, 'text', '') or '')[:500]!r}",
                flush=True,
            )
            raise OAuthLoginError(
                f"OpenAI rejected token exchange (HTTP {response.status_code}){': ' + detail if detail else ''}"
            )

        access_token = str(data.get("access_token") or "").strip()
        refresh_token = str(data.get("refresh_token") or "").strip()
        id_token = str(data.get("id_token") or "").strip()

        if not access_token:
            raise OAuthLoginError("OpenAI returned an empty access_token")
        if not refresh_token:
            raise OAuthLoginError(
                "OpenAI did not return refresh_token (scope may lack offline_access or code was already used)"
            )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "id_token": id_token,
        }


oauth_login_service = OAuthLoginService()
