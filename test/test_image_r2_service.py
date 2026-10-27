from __future__ import annotations

import base64
import tempfile
import threading
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest import mock

from services.config import _normalize_image_r2_settings, _validate_image_r2_settings
from services.image_r2_service import CLEANUP_INTERVAL_SECONDS, ImageR2Service
from services.image_storage_service import ImageStorageError, ImageStorageService

REL = "2026/10/01/1790812800_" + "a" * 32 + ".png"
SETTINGS = {
    "enabled": True,
    "account_id": "account",
    "access_key_id": "access",
    "secret_access_key": "secret",
    "bucket": "images",
    "prefix": "chatgpt2api/images",
    "public_base_url": "https://images.example.test",
}
KEY = f"{SETTINGS['prefix']}/{REL}"


class ImageR2Tests(unittest.TestCase):
    def setUp(self):
        self.settings = dict(SETTINGS)
        self.client = mock.Mock()
        self.factory = mock.Mock(return_value=self.client)
        self.service = ImageR2Service(lambda: dict(self.settings), self.factory)

    def test_disabled_does_not_contact_r2(self):
        self.settings["enabled"] = False
        self.assertIsNone(self.service.upload(REL, b"image"))
        self.assertEqual(self.service.cleanup(), {"deleted": 0, "failed": 0})
        self.factory.assert_not_called()

    def test_upload_returns_public_url_after_success(self):
        url = self.service.upload(REL, b"image")
        self.assertEqual(url, f"https://images.example.test/{KEY}")
        self.client.upload_bytes.assert_called_once_with(KEY, b"image", content_type="image/png")
        self.client.close.assert_called_once()

    def test_upload_error_propagates_and_closes_connection(self):
        self.client.upload_bytes.side_effect = RuntimeError("unavailable")
        with self.assertRaisesRegex(RuntimeError, "unavailable"):
            self.service.upload(REL, b"image")
        self.client.close.assert_called_once()

    def test_cleanup_uses_upload_time_strictly_older_than_five_days(self):
        now = datetime(2026, 10, 27, 12, tzinfo=UTC)
        cutoff = now - timedelta(days=5)
        items = []
        for index, modified in enumerate((cutoff - timedelta(seconds=1), cutoff, now)):
            items.append({"key": KEY.replace("1790812800", str(index)), "updated_at": modified.isoformat()})
        # Old-looking object names do not determine age; R2 LastModified does.
        self.client.list_objects.return_value = items
        self.assertEqual(self.service.cleanup(now), {"deleted": 1, "failed": 0})
        self.client.delete_object.assert_called_once_with(items[0]["key"])

    def test_cleanup_skips_other_objects_and_invalid_timestamps(self):
        self.client.list_objects.return_value = [
            {"key": "backups/" + REL, "updated_at": "2020-01-01T00:00:00Z"},
            {"key": SETTINGS["prefix"] + "/notes.txt", "updated_at": "2020-01-01T00:00:00Z"},
            {"key": KEY, "updated_at": "invalid"},
            {"key": KEY, "updated_at": "2020-01-01T00:00:00"},
            {"key": KEY, "updated_at": "2026-10-22T15:00:00+07:00"},
        ]
        self.assertEqual(self.service.cleanup(datetime(2026, 10, 27, 9, tzinfo=UTC)), {"deleted": 1, "failed": 0})
        self.client.delete_object.assert_called_once_with(KEY)

    def test_cleanup_continues_after_individual_delete_failure(self):
        self.client.list_objects.return_value = [
            {"key": KEY.replace("1790812800", str(index)), "updated_at": "2020-01-01T00:00:00Z"}
            for index in range(2)
        ]
        self.client.delete_object.side_effect = [RuntimeError("failed"), None]
        self.assertEqual(self.service.cleanup(), {"deleted": 1, "failed": 1})
        self.assertEqual(self.client.delete_object.call_count, 2)
        self.client.close.assert_called_once()

    def test_scheduler_runs_on_start_then_every_three_hours_and_recovers(self):
        stop = mock.Mock()
        stop.is_set.return_value = False
        stop.wait.side_effect = [False, True]
        with mock.patch.object(self.service, "cleanup", side_effect=[RuntimeError("temporary"), {}]) as cleanup:
            self.service._run_cleanup(stop)
        self.assertEqual(cleanup.call_count, 2)
        self.assertEqual(stop.wait.call_args_list, [mock.call(10800), mock.call(10800)])
        self.assertEqual(CLEANUP_INTERVAL_SECONDS, 10800)

    def test_scheduler_thread_stops_with_app_event(self):
        stop = threading.Event()
        swept = threading.Event()
        with mock.patch.object(self.service, "cleanup", side_effect=lambda: swept.set()):
            thread = self.service.start_cleanup_scheduler(stop)
            try:
                self.assertTrue(swept.wait(2))
            finally:
                stop.set()
                thread.join(timeout=2)
        self.assertFalse(thread.is_alive())

    def test_cleanup_processes_more_than_one_thousand_images(self):
        self.client.list_objects.return_value = [
            {"key": KEY.replace("1790812800", str(index)), "updated_at": "2020-01-01T00:00:00Z"}
            for index in range(1001)
        ]
        self.assertEqual(self.service.cleanup(), {"deleted": 1001, "failed": 0})

    def test_settings_persist_and_reject_incomplete_enabled_config(self):
        import json
        from services.config import ConfigStore

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "config.json"
            path.write_text(json.dumps({"auth-key": "test-auth"}), encoding="utf-8")
            cfg = ConfigStore(path)
            cfg.update({"image_r2": SETTINGS})
            self.assertEqual(ConfigStore(path).get_image_r2_settings(), SETTINGS)
            before = path.read_bytes()
            with self.assertRaises(ValueError):
                cfg.update({"image_r2": {"enabled": True}})
            self.assertEqual(path.read_bytes(), before)
            cfg.update({"image_r2": {**SETTINGS, "enabled": False}})
            self.assertFalse(ConfigStore(path).get_image_r2_settings()["enabled"])

    def test_config_defaults_boolean_and_validation(self):
        self.assertFalse(_normalize_image_r2_settings({})["enabled"])
        self.assertFalse(_normalize_image_r2_settings({"enabled": "false"})["enabled"])
        _validate_image_r2_settings(_normalize_image_r2_settings(SETTINGS))
        for field in ("account_id", "access_key_id", "secret_access_key", "bucket", "public_base_url"):
            with self.subTest(field=field), self.assertRaises(ValueError):
                _validate_image_r2_settings({**SETTINGS, field: ""})
        for prefix in ("../backups", "images//other", "images/../backups", "/"):
            with self.subTest(prefix=prefix), self.assertRaises(ValueError):
                _validate_image_r2_settings({**SETTINGS, "prefix": prefix})
        for url in ("https://account.r2.cloudflarestorage.com", "https://cdn.test/path", "ftp://cdn.test", "https://cdn.test?token=x"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                _validate_image_r2_settings({**SETTINGS, "public_base_url": url})

    def test_storage_returns_r2_url_and_keeps_local_image(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch("services.image_storage_service.config") as cfg:
            cfg.images_dir = Path(tmp) / "images"
            cfg.base_url = "http://local.test"
            cfg.get_image_storage_settings.return_value = {"mode": "local"}
            storage = ImageStorageService(Path(tmp) / "index.json")
            with mock.patch("services.image_storage_service.image_r2_service", self.service):
                stored = storage.save(b"image")
            self.assertEqual(stored.url, f"https://images.example.test/{SETTINGS['prefix']}/{stored.rel}")
            self.assertEqual((cfg.images_dir / stored.rel).read_bytes(), b"image")
            self.client.upload_bytes.side_effect = RuntimeError("failed")
            with mock.patch("services.image_storage_service.image_r2_service", self.service):
                with self.assertRaises(ImageStorageError):
                    storage.save(b"image")

    def test_image_formats_include_online_url_and_keep_base64_contract(self):
        from services.protocol.conversation import format_image_result
        payload = base64.b64encode(b"image").decode()
        with mock.patch("services.protocol.conversation.save_image_bytes", return_value="https://cdn.test/image.png"):
            for response_format in ("b64_json", "url"):
                result = format_image_result([{"b64_json": payload}], "draw", response_format)
                self.assertEqual(result["data"][0]["url"], "https://cdn.test/image.png")
                self.assertEqual("b64_json" in result["data"][0], response_format == "b64_json")

    def test_r2_listing_follows_continuation_pages(self):
        from services.backup_service import CloudflareR2Client

        client = CloudflareR2Client(SETTINGS)
        self.addCleanup(client.close)
        pages = [
            mock.Mock(status_code=200, text=(
                "<ListBucketResult><IsTruncated>true</IsTruncated>"
                f"<Contents><Key>{KEY}</Key><Size>4</Size>"
                "<LastModified>2020-01-01T00:00:00Z</LastModified></Contents>"
                "<NextContinuationToken>next-page</NextContinuationToken></ListBucketResult>"
            )),
            mock.Mock(status_code=200, text=(
                "<ListBucketResult><IsTruncated>false</IsTruncated>"
                f"<Contents><Key>{KEY.replace('1790812800', '1')}</Key><Size>4</Size>"
                "<LastModified>2020-01-01T00:00:00Z</LastModified></Contents></ListBucketResult>"
            )),
        ]
        with mock.patch.object(client, "_request", side_effect=pages) as request:
            items = client.list_objects()
        self.assertEqual(len(items), 2)
        self.assertEqual(request.call_args_list[1].kwargs["query"]["continuation-token"], "next-page")
        self.assertEqual(request.call_args_list[1].kwargs["query"]["prefix"], SETTINGS["prefix"] + "/")

    def test_generations_endpoint_returns_online_url(self):
        import asyncio
        import httpx
        from fastapi import FastAPI
        from api.ai import create_router
        from services.protocol import openai_v1_image_generations as protocol
        from services.protocol.conversation import ImageOutput, format_image_result

        app = FastAPI()
        app.include_router(create_router())

        def outputs(request):
            data = format_image_result(
                [{"b64_json": base64.b64encode(b"image").decode()}], "draw", request.response_format,
            )["data"]
            yield ImageOutput(kind="result", model="gpt-image-2", index=1, total=1, data=data)

        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://local.test") as client:
                return await client.post("/v1/images/generations", json={"prompt": "draw", "response_format": "url"})

        with (
            mock.patch("api.ai.require_identity", return_value={"role": "admin", "subject_id": "test"}),
            mock.patch("api.ai.filter_or_log", new_callable=mock.AsyncMock),
            mock.patch.object(protocol, "stream_image_outputs_with_pool", side_effect=outputs),
            mock.patch.object(protocol, "count_text_tokens", return_value=3),
            mock.patch.object(protocol, "count_image_output_items_tokens", return_value=6),
            mock.patch("services.protocol.conversation.save_image_bytes", return_value="https://cdn.test/image.png"),
            mock.patch("services.log_service.log_service.add"),
        ):
            response = asyncio.run(run())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"], [{"url": "https://cdn.test/image.png", "revised_prompt": "draw"}])

    def test_chat_uses_public_link_only_when_r2_enabled(self):
        from utils.helper import build_chat_image_markdown_content
        result = {"data": [{"url": "https://cdn.test/image.png", "b64_json": "aW1hZ2U="}]}
        with mock.patch("services.config.config.get_image_r2_settings", return_value={"enabled": True}):
            self.assertEqual(build_chat_image_markdown_content(result), "![image_1](https://cdn.test/image.png)")
        with mock.patch("services.config.config.get_image_r2_settings", return_value={"enabled": False}):
            self.assertIn("data:image/png;base64,aW1hZ2U=", build_chat_image_markdown_content(result))


if __name__ == "__main__":
    unittest.main()
