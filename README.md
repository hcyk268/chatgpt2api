<h1 align="center">ChatGPT2API</h1>


<p align="center">ChatGPT2API reverse-engineers and wraps ChatGPT web capabilities into an OpenAI-compatible image API / proxy for image generation, image editing, and multi-image composite editing. It includes an online image studio, account pool management, multiple account import methods, and Docker self-hosting.</p>

> [!WARNING]
> Disclaimer:
>
> This project involves reverse-engineering ChatGPT web APIs for text generation, image generation, and image editing. It is for personal learning, technical research, and non-commercial technical exchange only.
>
> - Do not use this project for commercial purposes, profit, bulk operations, automated abuse, or large-scale calling.
> - Do not use this project to disrupt markets, engage in malicious competition, arbitrage, resell services, or violate OpenAI Terms of Service or applicable laws.
> - Do not use this project to generate, distribute, or assist illegal, violent, sexual, or minor-related content, or for fraud, harassment, or other unlawful or improper purposes.
> - You assume all risks, including account restrictions, temporary or permanent bans, and legal liability from misuse.
> - By using this project you agree to this disclaimer in full; any consequences from abuse or illegal use are your responsibility.
> - Because this project relies on reverse-engineered ChatGPT web capabilities, accounts may be restricted or banned. Do not test with important, frequently used, or high-value accounts.


## Sponsors

<table>
  <tr>
    <td width="190" align="center">
      <a href="https://kunrouai.com/?utm_source=chatgpt2api"><img src="assets/kunrouai.svg" width="163" alt="Kunrou AI"></a>
    </td>
    <td>
      <a href="https://kunrouai.com/?utm_source=chatgpt2api">Kunrou AI</a> is an all-in-one AI visual creation platform with image generation, video generation, collaborative canvas, and Agent/MCP connectivity—for creators and teams, with enterprise source licensing and private deployment. See also the <a href="https://api.kunrouai.com/?utm_source=chatgpt2api">API platform</a> for model APIs and integrations.
    </td>
  </tr>
  <tr>
    <td width="190" align="center">
      <a href="https://www.ipwo.net/?ref=githubbasketikunchatgpt2api"><img src="assets/ipwo.png" width="163" alt="IPWO"></a>
    </td>
    <td>
      <a href="https://www.ipwo.net/?ref=githubbasketikunchatgpt2api">IPWO</a> residential proxies (dynamic, static, and unlimited) in 195+ countries with HTTP(S) and SOCKS5.<br>For developers using ChatGPT2API for AI images and API integration, IPWO offers free trials, region selection, and network configuration. Discount code: <b>0200</b>.
    </td>
  </tr>
  <tr>
    <td width="190" align="center">
      <a href="https://www.atlascloud.ai/zh?utm_source=github&utm_medium=link&utm_campaign=chatgpt2api"><img src="assets/atlascloud.svg" width="163" alt="Atlas Cloud"></a>
    </td>
    <td>
      <a href="https://www.atlascloud.ai/zh?utm_source=github&utm_medium=link&utm_campaign=chatgpt2api">Atlas Cloud</a> is a full-modal AI inference platform that gives developers a single AI API to access video generation, image generation, and LLM APIs. Instead of managing multiple vendor integrations, you connect once and get unified access to 300+ curated models across all modalities. Check out <a href="https://www.atlascloud.ai/console/coding-plan">Atlas Cloud's new coding plan promotion</a> for more budget-friendly API access.
    </td>
  </tr>
</table>

## Quick start

### Docker

```bash
git clone git@github.com:basketikun/chatgpt2api.git
cd chatgpt2api
docker compose up -d
```

Set `auth-key` in `config.json` before starting, or override via `CHATGPT2API_AUTH_KEY` in `docker-compose.yml`.

- Web panel: `http://localhost:3000`
- API base: `http://localhost:3000/v1`
- Data directory: `./data`

### WARP / FlareSolverr stable proxy

If image requests are often blocked by Cloudflare, use the bundled WARP + Privoxy + FlareSolverr stack:

```bash
cp .env.example .env
docker compose -f docker-compose.warp.yml up -d --build
```

This compose file starts:

- `warp-proxy`: WARP SOCKS5 egress
- `privoxy`: converts WARP SOCKS5 to HTTP proxy
- `flaresolverr`: refreshes Cloudflare clearance
- `init-config`: idempotently writes default `proxy_runtime` config
- `app`: ChatGPT2API main service

By default only upstream OpenAI / ChatGPT requests use the stable proxy; account email, CPA, and other auxiliary paths are not forced through it. Priority: per-account proxy, then stable proxy runtime, then explicit proxy and legacy global proxy.

Adjust ports and proxy runtime in `.env`, or use the **Stable proxy runtime** panel in settings to save, test proxy, and test clearance.

### Local development

Backend:

```bash
git clone git@github.com:basketikun/chatgpt2api.git
cd chatgpt2api
uv sync
uv run main.py
```

Frontend:

```bash
cd chatgpt2api/web
bun install
bun run dev
```

Upgrade to a new release:

```bash
docker pull ghcr.io/basketikun/chatgpt2api:latest
docker-compose down
docker-compose up -d

```

### Storage backend

Set `STORAGE_BACKEND` to switch storage:

- `json` - local JSON files (default)
- `sqlite` - local SQLite database
- `postgres` - external PostgreSQL (set `DATABASE_URL`)
- `git` - private Git repo (set `GIT_REPO_URL` and `GIT_TOKEN`)

Example: PostgreSQL

```yaml
environment:
  - STORAGE_BACKEND=postgres
  - DATABASE_URL=postgresql://user:password@host:5432/dbname
```

## Features

### API compatibility

- `POST /v1/images/generations` image generation
- `POST /v1/images/edits` image editing
- Image-oriented `POST /v1/chat/completions`
- Image-oriented `POST /v1/responses`
- `GET /v1/models` returns `gpt-image-2`, `codex-gpt-image-2`, `auto`, `gpt-5`, `gpt-5-1`, `gpt-5-2`, `gpt-5-3`, `gpt-5-3-mini`,
  `gpt-5-mini`
- Multiple results via `n`
- Editable PPT export
- Editable PSD export
- Codex image path reverse-engineering (`Plus` / `Team` / `Pro` only), model alias `codex-gpt-image-2`; map back to
  `gpt-image-2` elsewhere if needed to distinguish from web image gen—one account may have both web and Codex quotas

### Online image studio

- Built-in studio for generation, editing, and multi-image composites
- Models: `gpt-image-2`, `codex-gpt-image-2`, `auto`, `gpt-5`, `gpt-5-1`, `gpt-5-2`, `gpt-5-3`, `gpt-5-3-mini`, `gpt-5-mini`
- Reference image upload in edit mode
- Multi-image generation in the UI
- Local session history with review, delete, and clear
- Server-side image URL caching
- Progress tracking; continue waiting after timeout
- Lazy loading and scroll position memory for large galleries

### Account pool

- Async refresh of email, type, quota, and recovery time
- Round-robin available accounts for image gen and edit
- Drop invalid tokens on auth errors
- Periodic refresh of rate-limited accounts
- Password re-login for errored accounts; optional auto re-login after refresh
- Global HTTP / HTTPS / SOCKS5 / SOCKS5H proxy in the web UI
- WARP / FlareSolverr stable proxy runtime
- Search, filter, batch refresh, export, manual edit, cleanup
- Import: local CPA JSON, remote CPA server, `sub2api` server, `access_token`
- Configure `sub2api` in settings; filter and batch-import OpenAI OAuth accounts

### Experimental / planned

- See [feature status](./docs/feature-status.en.md)

## Showcase

<table width="100%">
  <tr>
    <td width="50%"><img src="https://i.ibb.co/Jj8nfwwP/image.png" alt="image" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/pqf235v/image-edit.png" alt="image edit" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://i.ibb.co/tPcqtVfd/chery-studio.png" alt="chery studio" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/PsT9YHBV/account-pool.png" alt="account pool" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://i.ibb.co/rRWLG08q/new-api.png" alt="new api" border="0"></td>
  </tr>
</table>

## API

All AI endpoints require:

```http
Authorization: Bearer <auth-key>
```

<details>
<summary><code>GET /v1/models</code></summary>
<br>

Returns exposed image models.

```bash
curl http://localhost:8000/v1/models \
  -H "Authorization: Bearer <auth-key>"
```

<details>
<summary>Details</summary>
<br>

| Field | Description                                                                                                         |
|:-----|:-----------------------------------------------------------------------------------------------------------|
| Models | `gpt-image-2`, `codex-gpt-image-2`, `auto`, `gpt-5`, `gpt-5-1`, `gpt-5-2`, `gpt-5-3`, `gpt-5-3-mini`, `gpt-5-mini` |
| Use cases | Cherry Studio, New API, and other clients                                                                          |

<br>
</details>
</details>

<details>
<summary><code>POST /v1/images/generations</code></summary>

Optional public image links: enable Cloudflare R2 uploads in Settings → General.
The backend checks R2 every 3 hours and deletes generated images older than 5 days.
See [R2 image configuration](docs/image-r2.md).
<br>

OpenAI-compatible text-to-image generation.

```bash
curl http://localhost:8000/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth-key>" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "A cat floating in space",
    "n": 1,
    "response_format": "b64_json"
  }'
```

<details>
<summary>Fields</summary>
<br>

| Field                | Description                                                 |
|:------------------|:---------------------------------------------------|
| `model`           | Image model; see `/v1/models`; `gpt-image-2` recommended |
| `prompt`          | Image prompt                                            |
| `n`               | Count; backend limit `1-4`                                 |
| `response_format` | Optional; default `b64_json`                       |

<br>
</details>
</details>

<details>
<summary><code>POST /v1/images/edits</code></summary>
<br>

OpenAI-compatible image editing via file upload or official JSON image URLs.

```bash
curl http://localhost:8000/v1/images/edits \
  -H "Authorization: Bearer <auth-key>" \
  -F "model=gpt-image-2" \
  -F "prompt=Turn this image into a cyberpunk night scene" \
  -F "n=1" \
  -F "image=@./input.png"
```

Or pass image URLs:

```bash
curl http://localhost:8000/v1/images/edits \
  -H "Authorization: Bearer <auth-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "Turn this image into a cyberpunk night scene",
    "images": [
      {"image_url": "https://example.com/input.png"}
    ]
  }'
```

<details>
<summary>Fields</summary>
<br>

| Field          | Description                                            |
|:------------|:----------------------------------------------|
| `model`     | Image model, e.g. `gpt-image-2`                           |
| `prompt`    | Edit prompt                                       |
| `n`         | Count; backend limit `1-4`                            |
| `image`     | Image file via multipart/form-data           |
| `images`    | JSON array; `{"image_url": "https://..."}` |
| `image_url` | Form mode URL; repeat field for multiple images                     |

<br>
</details>
</details>

<details>
<summary><code>POST /v1/chat/completions</code></summary>
<br>

Chat Completions compatibility for text, web search, and images—not a full general chat proxy.

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth-key>" \
  -d '{
    "model": "gpt-image-2",
    "messages": [
      {
        "role": "user",
        "content": "Generate a cyberpunk cat on a rainy Tokyo street at night"
      }
    ],
    "n": 1
  }'
```

<details>
<summary>Fields</summary>
<br>

| Field                   | Description                                                                           |
|:---------------------|:-----------------------------------------------------------------------------|
| `model`              | Text, search, or image model; search models trigger web search logic                                                   |
| `messages`           | Message array for text, search, and image content                                                          |
| `n`                  | Image count for generation                                                          |
| `stream`             | Supported for text, search, and images; still in testing                                                           |
| `tools`              | Text: `web_search` / `web_search_preview` / `web_search_preview_2025_03_11` |
| `web_search_options` | Triggers web search compatibility                                                               |

<br>
</details>
</details>

<details>
<summary><code>POST /v1/responses</code></summary>
<br>

Responses API compatibility for text, web search, and image generation tools—not a full Responses proxy.

```bash
curl http://localhost:8000/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth-key>" \
  -d '{
    "model": "gpt-5",
    "input": "Generate a futuristic city skyline image",
    "tools": [
      {
        "type": "image_generation"
      }
    ]
  }'
```

<details>
<summary>Fields</summary>
<br>

| Field       | Description                                                                                      |
|:---------|:----------------------------------------------------------------------------------------|
| `model`  | Echoed in response; search and image gen use compatibility paths                                                             |
| `input`  | Input; search uses last user text; image gen needs a parseable prompt                                                          |
| `tools`  | `image_generation`, `web_search`, `web_search_preview`, `web_search_preview_2025_03_11` |
| `stream` | Implemented; still in testing                                                                               |

<br>
</details>
</details>

## Community

Learn AI on LinuxDO: [LinuxDO](https://linux.do)

## Contributors

Thanks to all contributors:

<a href="https://github.com/basketikun/chatgpt2api/graphs/contributors">
  <img alt="Contributors" src="https://contrib.rocks/image?repo=basketikun/chatgpt2api" />
</a>

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=basketikun/chatgpt2api&type=date&legend=top-left)](https://www.star-history.com/?repos=basketikun%2Fchatgpt2api&type=date&legend=top-left)
