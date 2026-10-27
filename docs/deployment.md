# Deployment and upgrade guide

This guide covers common ChatGPT2API deployment options and what to preserve when upgrading or migrating.

## Before deployment

Install on the server:

- Docker
- Docker Compose v2
- Git

Before first deploy, verify:

```bash
docker version
docker compose version
git --version
```

Core persistent paths:

| Path | Purpose |
| --- | --- |
| `config.json` | Main config, admin keys, proxy, images, backup, etc. |
| `.env` | Docker Compose environment variables |
| `data/` | Accounts, logs, images, task records, etc. |

Keep these when upgrading or migrating.

## Option 1: Standard Docker

For setups that do not need WARP / FlareSolverr bypass.

```bash
git clone git@github.com:basketikun/chatgpt2api.git
cd chatgpt2api
```

Set `auth-key` in `config.json`, or in `docker-compose.yml`:

```yaml
environment:
  - CHATGPT2API_AUTH_KEY=your_secret_key
```

Start:

```bash
docker compose up -d
```

Access:

```text
http://localhost:3000
```

API base:

```text
http://localhost:3000/v1
```

Logs:

```bash
docker logs -f chatgpt2api
```

Stop:

```bash
docker compose down
```

## Option 2: WARP / FlareSolverr

When upstream requests are often blocked by Cloudflare. This starts:

- `warp-proxy`
- `privoxy`
- `flaresolverr`
- `init-config`
- `app`

Copy the env template:

```bash
cp .env.example .env
```

At minimum set in `.env`:

```text
CHATGPT2API_AUTH_KEY=your_secret_key_here
```

Start:

```bash
docker compose -f docker-compose.warp.yml up -d --build
```

Access:

```text
http://localhost:3000
```

FlareSolverr settings are available under the `FlareSolverr` tab in the admin settings page.

Container status:

```bash
docker compose -f docker-compose.warp.yml ps
```

Logs:

```bash
docker logs -f chatgpt2api-warp
docker logs -f chatgpt2api-flaresolverr
```

Stop:

```bash
docker compose -f docker-compose.warp.yml down
```

## Option 3: From source

For local development or debugging.

Backend:

```bash
git clone git@github.com:basketikun/chatgpt2api.git
cd chatgpt2api
uv sync
uv run main.py
```

Frontend dev server:

```bash
cd web
bun install
bun run dev
```

When running from source, the backend reads `config.json` and `data/` at the project root.

## Storage backend

Default is local JSON:

```text
STORAGE_BACKEND=json
```

Options:

| Value | Description |
| --- | --- |
| `json` | Local JSON files (default) |
| `sqlite` | Local SQLite, usually `data/accounts.db` |
| `postgres` | External PostgreSQL |
| `git` | Private Git repo for account data |

PostgreSQL example:

```yaml
environment:
  - STORAGE_BACKEND=postgres
  - DATABASE_URL=postgresql://user:password@host:5432/dbname
```

SQLite example:

```yaml
environment:
  - STORAGE_BACKEND=sqlite
  - DATABASE_URL=sqlite:////app/data/accounts.db
```

## Backup before upgrade

Recommended backup:

```bash
mkdir -p backups
tar -czf backups/chatgpt2api-$(date +%Y%m%d-%H%M%S).tgz config.json .env data
```

If you have no `.env`, omit it:

```bash
tar -czf backups/chatgpt2api-$(date +%Y%m%d-%H%M%S).tgz config.json data
```

You can also configure Cloudflare R2 backup in settings for scheduled backups.

## Upgrade: standard Docker

Enter the project directory:

```bash
cd chatgpt2api
```

Backup:

```bash
mkdir -p backups
tar -czf backups/chatgpt2api-$(date +%Y%m%d-%H%M%S).tgz config.json .env data
```

Pull latest code and images:

```bash
git pull
docker compose pull
docker compose up -d
```

Status:

```bash
docker compose ps
docker logs -f chatgpt2api
```

## Upgrade: WARP / FlareSolverr

Enter the project directory:

```bash
cd chatgpt2api
```

Backup:

```bash
mkdir -p backups
tar -czf backups/chatgpt2api-$(date +%Y%m%d-%H%M%S).tgz config.json .env data
```

Pull and rebuild:

```bash
git pull
docker compose -f docker-compose.warp.yml up -d --build
```

Status:

```bash
docker compose -f docker-compose.warp.yml ps
docker logs -f chatgpt2api-warp
```

## Upgrade: from source

```bash
cd chatgpt2api
git pull
uv sync
```

Rebuild frontend static assets if needed:

```bash
cd web
bun install
bun run build
```

Restart the backend using your process manager.

## Rollback

To roll back code:

```bash
git log --oneline -n 20
git checkout <previous-commit>
```

Standard Docker:

```bash
docker compose up -d
```

WARP / FlareSolverr:

```bash
docker compose -f docker-compose.warp.yml up -d --build
```

Restore data:

```bash
tar -xzf backups/your-backup-file.tgz
```

Stop containers before restore to avoid overwriting live data:

```bash
docker compose down
```

Or:

```bash
docker compose -f docker-compose.warp.yml down
```

## Maintenance commands

List containers:

```bash
docker compose ps
```

Main service logs:

```bash
docker logs -f chatgpt2api
```

WARP deployment main service logs:

```bash
docker logs -f chatgpt2api-warp
```

Restart standard deployment:

```bash
docker compose restart
```

Restart WARP deployment:

```bash
docker compose -f docker-compose.warp.yml restart
```

Prune unused images:

```bash
docker image prune
```

Do not delete `data/`, `config.json`, or `.env` unless you have a verified backup.
