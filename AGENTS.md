# AGENTS.md

## Cursor Cloud specific instructions

### Overview

PromptVault is a monorepo with a **FastAPI** backend (`backend/`) and a **Next.js 16** frontend (`frontend/`). It uses **PostgreSQL 16 with pgvector** for storage (via Docker Compose). See `README.md` for standard setup instructions.

### Starting services

1. **PostgreSQL**: `sudo dockerd &>/tmp/dockerd.log &` then `sudo docker compose up -d` (from workspace root). Wait for readiness: `sudo docker exec promptvault-db pg_isready -U postgres`.
2. **Database init**: `cd backend && python3 init_db.py` (idempotent, safe to re-run).
3. **Backend**: `cd backend && python3 run.py` (runs on port 8000 with auto-reload).
4. **Frontend**: `cd frontend && npm run dev` (runs on port 3000).

### Key caveats

- **bcrypt compatibility**: `passlib` requires `bcrypt==4.0.1`. Version 5.x breaks password hashing (`AttributeError: module 'bcrypt' has no attribute '__about__'`). The update script pins this version.
- **Docker in container**: This cloud environment requires `fuse-overlayfs` storage driver and `iptables-legacy` for Docker to work. The daemon config lives at `/etc/docker/daemon.json`.
- **Test user**: Created non-interactively since `create_user.py` uses `input()`. Credentials: `admin@promptvault.dev` / `devpassword123`.
- **AI providers**: No API keys required; the mock provider (`MockLLMProvider`) is the automatic fallback for prompt improvement.
- **frontend/lib/**: The `lib/auth.ts` and `lib/api.ts` files are essential for the frontend. The root `.gitignore` has `lib/` excluded for Python but `!frontend/lib/` allows the frontend lib to be committed.

### Lint / Test / Build

- **Frontend lint**: `cd frontend && npx eslint .` (some pre-existing warnings in components)
- **Frontend build**: `cd frontend && npm run build`
- **Backend tests**: `cd backend && python3 test_context_detector.py` (and other `test_*.py` scripts)
- **API health check**: `curl http://127.0.0.1:8000/api/v1/health`

### Environment files (not committed)

- `backend/.env` — see `README.md` for template. `DATABASE_URL`, `SECRET_KEY` are required.
- `frontend/.env.local` — needs `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.
