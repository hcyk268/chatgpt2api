from __future__ import annotations

import re
import threading
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote

from services.config import _validate_image_r2_settings, config
from utils.log import logger

CLEANUP_INTERVAL_SECONDS = 3 * 60 * 60
RETENTION_DAYS = 5
# Only generated image names are eligible; unrelated bucket objects are ignored.
GENERATED_IMAGE_PATH = re.compile(r"\d{4}/\d{2}/\d{2}/\d+_[0-9a-f]{32}\.png\Z")


def _new_client(settings: dict[str, object]):
    # BackupService imports ImageStorageService; defer this import until use.
    from services.backup_service import CloudflareR2Client
    return CloudflareR2Client(settings)


class ImageR2Service:
    def __init__(
        self,
        settings_getter: Callable[[], dict[str, object]] | None = None,
        client_factory: Callable[[dict[str, object]], Any] | None = None,
    ) -> None:
        self.settings_getter = settings_getter or config.get_image_r2_settings
        self.client_factory = client_factory or _new_client

    def upload(self, rel: str, image_data: bytes) -> str | None:
        settings = self.settings_getter()
        if not settings.get("enabled"):
            return None
        _validate_image_r2_settings(settings)
        if not GENERATED_IMAGE_PATH.fullmatch(rel):
            raise ValueError("Invalid generated image path for R2 upload")
        key = f"{settings['prefix']}/{rel}"
        client = self.client_factory(settings)
        try:
            client.validate()
            client.upload_bytes(key, image_data, content_type="image/png")
        finally:
            client.close()
        return f"{settings['public_base_url']}/{quote(key, safe='/')}"

    def cleanup(self, now: datetime | None = None) -> dict[str, int]:
        settings = self.settings_getter()
        result = {"deleted": 0, "failed": 0}
        if not settings.get("enabled"):
            return result
        _validate_image_r2_settings(settings)
        cutoff = (now or datetime.now(UTC)).astimezone(UTC) - timedelta(days=RETENTION_DAYS)
        prefix = f"{settings['prefix']}/"
        client = self.client_factory(settings)
        try:
            client.validate()
            # list_objects handles S3 continuation tokens, including buckets > 1000 objects.
            for item in client.list_objects():
                key = str(item.get("key") or "")
                if not key.startswith(prefix) or not GENERATED_IMAGE_PATH.fullmatch(key[len(prefix):]):
                    continue
                try:
                    modified = datetime.fromisoformat(str(item.get("updated_at") or "").replace("Z", "+00:00"))
                    if modified.tzinfo is None or modified.astimezone(UTC) >= cutoff:
                        continue
                except ValueError:
                    continue
                try:
                    client.delete_object(key)
                    result["deleted"] += 1
                except Exception:
                    result["failed"] += 1
                    logger.error({"event": "image_r2_delete_failed", "key": key})
        finally:
            client.close()
        logger.info({"event": "image_r2_cleanup", **result})
        return result

    def _run_cleanup(self, stop_event: threading.Event) -> None:
        # Sweep once at startup to catch downtime, then every three hours.
        while not stop_event.is_set():
            try:
                self.cleanup()
            except Exception:
                logger.error({"event": "image_r2_cleanup_failed"})
            if stop_event.wait(CLEANUP_INTERVAL_SECONDS):
                break

    def start_cleanup_scheduler(self, stop_event: threading.Event) -> threading.Thread:
        thread = threading.Thread(
            target=self._run_cleanup, args=(stop_event,), daemon=True, name="image-r2-cleanup",
        )
        thread.start()
        return thread


image_r2_service = ImageR2Service()
