# Feature status

This document reflects the current repository implementation to help you see what is available, in progress, or not yet implemented.

| Feature | Status | Notes |
|:----------------------------------------|:--:|:--------------------------------------------------------------|
| OpenAI-compatible `POST /v1/images/generations` | ✅  | Supported for image generation; multiple images via `n`. |
| OpenAI-compatible `POST /v1/images/edits` | ✅  | Supported; upload images for editing. |
| Image workflow `POST /v1/chat/completions` | ✅  | Supported for image-related requests. |
| Image workflow `POST /v1/responses` | ✅  | Supported for image generation tool calls. |
| `GET /v1/models` | ✅  | Returns `gpt-image-2`, `codex-gpt-image-2`, `auto`, `gpt-5`, `gpt-5-1`, `gpt-5-2`, `gpt-5-3`, `gpt-5-3-mini`, `gpt-5-mini`. |
| Generate multiple images at once | ✅  | Backend and frontend multi-image generation. |
| Parallel image generation | ✅  | Separate threads and accounts per image; disable via `image_parallel_generation`. |
| Image generation progress | ✅  | Steps (upload/warm-up/token fetch/generating, etc.) with timing. |
| Continue polling after timeout | ✅  | Continue waiting in UI; backend resume-poll API. |
| Image settle and check-before-hit | ✅  | Configure with `image_settle_enabled` and `image_check_before_hit_enabled`; skip wait when disabled. |
| Frontend image studio | ✅  | Generation, editing, model selection, history, lightbox. |
| Lazy load and scroll optimization | ✅  | LazyImage, scroll restore on session switch, bfcache sync. |
| Reference image input | ✅  | Upload, preview, remove, edit workflow. |
| Codex image path | ✅  | `Plus` / `Team` / `Pro` only; alias `codex-gpt-image-2`; map to `gpt-image-2` if needed. Separate from web image gen; same account often has both quotas. |
| Cherry Studio integration | ✅  | Image API for Cherry Studio. |
| New API integration | ✅  | New API compatible. |
| Account pool management | ✅  | List, filter, batch ops, export, edit, refresh, delete. |
| Async refresh progress | ✅  | Refresh and re-login async with frontend polling. |
| Password re-login for errored accounts | ✅  | Re-login on pool page; optional auto re-login after refresh. |
| Quota refresh and recovery time | ✅  | Account refresh; rate-limited accounts rechecked. |
| Invalid token cleanup | ✅  | Auto-remove invalid tokens. |
| CPA connection management | ✅  | CRUD for CPA connections. |
| CPA file browse and import | ✅  | Remote file list, filter, select, import to local pool. |
| CPA import progress | ✅  | Progress UI and polling. |
| `sub2api` connections and browse | ✅  | CRUD, groups, OpenAI OAuth account lists. |
| `sub2api` import | ✅  | Select OAuth accounts, batch `access_token` import, progress. |
| Docker self-hosting | ✅  | Docker Compose; multi-arch images. |
| Multiple reference images in compatible APIs | ✅  | Multi reference images in compatible endpoints. |
| Advanced token scheduling | ⚠️ | Basic round-robin and rate-limit refresh; richer scheduling in progress. |
| Render / Vercel deployment docs | ⚠️ | Docker-first; other platforms not fully documented. |
| `/v1/complete` text completion and streaming | ✅  | Implemented. |
| Streaming output | ✅  | Implemented. |
| Chat completion cache and deduplication | ✅  | `/v1/chat/completions` text: 60s cache, stream replay, in-flight merge, adjacent duplicate cleanup; configure via `chat_completion_cache`. |
| Image size parameters | ❌  | Not implemented. |
| Server-side image URL cache | ✅  | Implemented. |
| `rt_token` refresh | ❌  | Not implemented. |
| Proxy configuration | ✅  | Global HTTP / HTTPS / SOCKS5 / SOCKS5H in web UI for outbound requests. |
| Anthropic protocol | ❌  | Not implemented. |
