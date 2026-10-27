# Changelog

## Unreleased

## 1.8.0 - 2026-07-28

+ [Added] Default upstream request model name and default reasoning effort settings; editable in the settings page, overridable via `-standard`, `-extended`, and `-max` model name suffixes.
+ [Fixed] Option to remove local conversations even when no image is produced; asynchronously hides matching conversation records on image generation failure, timeout, or text-only responses.
+ [Fixed] `/v1/models` aggregates official model lists per account type; text requests select accounts by model permissions.
+ [Fixed] Filter hidden, non-final channels and assistant messages sent to internal tools to prevent search instructions and reasoning content from leaking into API output.
+ [Fixed] Output sanitization no longer incorrectly removes spaces before punctuation in code and commands.
+ [Fixed] Configurable hard timeout cap for image generation SSE streams to avoid long-hanging upstream connections.
+ [Improved] Database storage uses incremental sync—only add, update, or delete changed records while preserving IDs for unchanged rows.

## 1.7.0 - 2026-07-05

+ [Removed] Registration feature and anti-abuse mechanisms that led to GitHub account bans.

## 1.6.0 - 2026-07-04

+ [Fixed] sub2api import issues.
+ [Fixed] Frontend 404 and 405 issues.
+ [Added] Option to delete conversation records after image generation.
+ [Changed] Pro accounts no longer treated as unlimited quota; approximately 1000 images per day.

## 1.5.0 - 2026-06-13

+ [Added] WARP / Privoxy / FlareSolverr bypass stack; refresh clearance and retry when registration hits Cloudflare blocks.
+ [Added] `outlook_token` email pool for Outlook/Hotmail registration verification codes.
+ [Added] Web search compatibility API, image edit masks, and image task capabilities.
+ [Improved] Updated sentinel/PoW acquisition for better upstream request compatibility.
+ [Improved] Proxy priority and registration request retry logic.

## 1.4.1 - 2026-06-03

+ [Added] Async account refresh with frontend polling for refresh/re-login progress.
+ [Added] Re-login on the account pool page to recover errored accounts via password login.
+ [Added] Auto re-login for errored accounts after refresh (configurable in settings).
+ [Added] Parallel image generation—multiple images use separate threads and accounts concurrently.
+ [Added] Auto switch accounts on image poll timeout (up to 4 retries); incremental wait retries on connection timeout for the same account.
+ [Added] Configurable image settle and check-before-hit; when disabled, skip wait and return results directly.
+ [Added] Image task progress tracking showing current step (upload/warm-up/token fetch/generating, etc.).
+ [Added] Continue polling after image timeout; frontend shows a "Continue waiting" button.
+ [Added] Settings for image settle, timeout wait, auto re-login, and related options.
+ [Improved] Image studio scroll performance—lazy loading, scroll position save/restore on session switch.

## 1.4.0 - 2026-05-31

+ [Added] Reverse-engineered AI-generated editable PSD files.
+ [Added] Reverse-engineered AI-generated editable PPT files.

## 1.3.1 - 2026-05-30

+ [Added] ChatGPT search debugging and Skills.

## 1.3.0 - 2026-05-30

+ [Added] Reverse-engineered ChatGPT search API.

## 1.2.4 - 2026-05-30

+ [Added] Chat completion cache and duplicate request coalescing.
+ [Added] One-click jump to infinite canvas.

## 1.2.3 - 2026-05-29

+ [Added] Per-account proxy support.
+ [Fixed] 503 error messaging and frontend email line wrapping.

## 1.2.2 - 2026-05-29

+ [Added] Codex path image generation with 2k and 4k support.
+ [Added] RT-based account info refresh.

## 1.2.0 - 2026-05-28

+ [Added] Baseline release with web panel, image studio, account pool, registration bot, image management, logs, and settings.
+ [Added] Clickable frontend version opens update dialog with current version, latest version, and changelog.
+ [Improved] Registration bot efficiency and success rate.
+ [Improved] Image studio configuration options.
