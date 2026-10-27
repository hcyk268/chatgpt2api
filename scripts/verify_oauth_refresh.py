"""Verify OAuth account auto-refresh.

Usage (in container, working directory /app):
    uv run python scripts/verify_oauth_refresh.py            # read-only diagnostics
    uv run python scripts/verify_oauth_refresh.py --force    # trigger one real refresh

Read-only: lists each account's access_token TTL, refresh_token presence,
          last refresh time/error to see if refresh is possible.
--force: calls refresh_access_token(force=True) for each account with refresh_token,
         validating refresh_token + project client_id against OpenAI.
         This rotates access_token for real (new token is valid; account is not broken).
"""
from __future__ import annotations

import sys

from services.account_service import account_service


def _fmt_remaining(seconds: int | None) -> str:
    if seconds is None:
        return "cannot parse exp"
    if seconds <= 0:
        return f"expired {(-seconds) // 3600}h ago"
    return f"expires in {seconds // 3600}h{(seconds % 3600) // 60}m"


def diagnose() -> list[str]:
    """Read-only: print refresh readiness; return tokens that have refresh_token."""
    tokens = account_service.list_tokens()
    print(f"Total accounts: {len(tokens)}\n")
    refreshable: list[str] = []
    for token in tokens:
        account = account_service.get_account(token) or {}
        remaining = account_service._token_expires_in(token)
        has_rt = bool(str(account.get("refresh_token") or "").strip())
        if has_rt:
            refreshable.append(token)
        print(f"- email={account.get('email') or '(unknown)'}")
        print(f"    access_token[:20]   = {token[:20]}...")
        print(f"    time to expiry      = {_fmt_remaining(remaining)}")
        print(f"    refresh_token       = {'yes' if has_rt else 'no (cannot auto-refresh)'}")
        print(f"    last_token_refresh_at    = {account.get('last_token_refresh_at')}")
        print(f"    last_token_refresh_error = {account.get('last_token_refresh_error')}")
        print()
    return refreshable


def force_refresh(tokens: list[str]) -> None:
    """Force-refresh each account once and report success/failure."""
    if not tokens:
        print("No accounts with refresh_token; cannot verify refresh.")
        return
    print("=" * 60)
    print(f"Force refresh for {len(tokens)} account(s) (live OpenAI call)...\n")
    ok = 0
    for token in tokens:
        before = account_service.get_account(token) or {}
        new_token = account_service.refresh_access_token(token, force=True, event="manual_verify")
        after = account_service.get_account(new_token) or {}
        err = str(after.get("last_token_refresh_error") or "").strip()
        rotated = new_token != token
        success = bool(new_token) and not err
        if success:
            ok += 1
        print(f"- email={before.get('email') or '(unknown)'}")
        print(f"    old access_token[:20] = {token[:20]}...")
        print(f"    new access_token[:20] = {new_token[:20]}...")
        print(f"    token rotated         = {'yes' if rotated else 'no (may return same token before refresh window)'}")
        print(f"    last_token_refresh_at    = {after.get('last_token_refresh_at')}")
        print(f"    last_token_refresh_error = {after.get('last_token_refresh_error') or 'none'}")
        print(f"    >>> refresh result      = {'success' if success else 'failed'}")
        print()
    print("=" * 60)
    print(f"Summary: {ok}/{len(tokens)} account(s) refreshed successfully")
    if ok == len(tokens):
        print("Auto-refresh works for these accounts (refresh_token matches client_id).")
    else:
        print("Some accounts failed; see last_token_refresh_error above or docker logs for [oauth-login]/refresh.")


def main() -> None:
    do_force = "--force" in sys.argv[1:]
    refreshable = diagnose()
    if do_force:
        force_refresh(refreshable)
    else:
        print("Tip: pass --force to trigger a real refresh and verify success.")


if __name__ == "__main__":
    main()
