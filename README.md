# FLOW-3D

Routing-Aware 3D Furniture Logistics Simulator and Decision Support System — a web-based
DSS that generates LIFO-compliant 3D loading blueprints for Philippine furniture delivery
trucks using a hybrid ILP + First-Fit Decreasing engine.

## Prerequisites

- All platforms: Python 3.10+, Node 18+, Git
- Windows: Docker Desktop (for Redis)
- macOS: `brew install redis`

## Redis setup

- Windows: `docker run -d -p 6379:6379 redis`
- macOS: `brew services start redis`

## Backend setup

### Windows

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### macOS

```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## Celery worker (required for `/api/solve` to actually execute)

The FastAPI route enqueues solver jobs onto Celery — without a worker
process consuming the queue, `POST /api/solve` returns `202 queued` and
`GET /api/result/{job_id}` will spin in `pending` forever. Open a second
terminal, activate the same venv, then run:

```
cd backend
celery -A worker.celery_app worker --loglevel=info --pool=solo
```

`--pool=solo` is required on Windows (the default prefork pool relies on
`fork()` and breaks under Win32). On macOS / Linux you can drop the flag
and use the default pool for parallelism.

## Frontend setup (same on all platforms)

```
cd frontend
npm install
npm run dev
```

Mock mode is the default so frontend devs can iterate without the backend
running. To talk to the real API, copy `.env.local.example` to `.env.local`
and set `VITE_USE_MOCK=false` — Vite picks `.env.local` up automatically
on the next `npm run dev`.

## Gurobi WLS Academic License (required for true ILP)

FLOW-3D's hybrid engine routes small manifests (≤ `SOLVER_THRESHOLD` items) through an
exact ILP solver powered by Gurobi. **Without a valid Gurobi license the ILP path cannot
run** — the engine automatically falls back to FFD for all manifest sizes so the system
stays operational, but optimality guarantees are lost.

To enable true ILP:

1. Go to [gurobi.com](https://www.gurobi.com) and sign in with your academic email.
2. Navigate to **Licenses** and request a **WLS Academic License** (free for students).
3. Download the generated `gurobi.lic` file and place it at:
   - Windows: `C:\Users\<you>\gurobi.lic`
   - macOS / Linux: `~/gurobi.lic`
4. If running via Docker, mount the license file into the containers — see the
   Docker Compose section below.

> **Note:** WLS licenses authenticate against Gurobi's own servers over the internet.
> A university VPN may be required if your institution's license is network-restricted.
> Contact FEU Tech IT or your thesis adviser for VPN access if needed.

## Running with Docker Compose (recommended)

Docker Compose is the easiest way to bring up the full stack — Redis, the FastAPI
backend, the Celery worker, and the Vite frontend all start in the correct order with
a single command. Docker Desktop must be running on Windows.

### Without a Gurobi license

All manifests use the real FFD heuristic solver. No extra setup needed.

```
docker compose up
```

### With a Gurobi WLS license

Mount your `gurobi.lic` file into the backend and celery services by adding the
following volume line under both services in `docker-compose.yml`:

```yaml
volumes:
  - ./backend:/app
  - ./docs:/docs
  - C:/Users/<you>/gurobi.lic:/root/gurobi.lic   # Windows path
  # - /Users/<you>/gurobi.lic:/root/gurobi.lic   # macOS path
```

Then bring everything up:

```
docker compose up
```

### Common commands

| Action | Command |
|---|---|
| First-time build | `docker compose build` |
| Start all services (foreground) | `docker compose up` |
| Start all services (background) | `docker compose up -d` |
| Stop all services | `docker compose down` |
| Stream logs for a service | `docker compose logs -f backend` |
| Rebuild a single service | `docker compose build backend` |

### Services and ports

| Service | URL | Notes |
|---|---|---|
| Frontend (Vite) | http://localhost:5173 | React + Three.js |
| Backend (FastAPI) | http://localhost:8000 | Swagger docs at `/docs` |
| Celery worker | — | Background solver jobs |
| Redis | localhost:6379 | Job broker; health-checked before others start |

## End-to-end live demo (full pipeline)

Bring everything up in this order — each step assumes the previous one is
already running and reachable:

1. **Redis** — `docker run -d -p 6379:6379 redis` (Windows) or
   `brew services start redis` (macOS).
2. **PostgreSQL** (optional, for ANOVA logging) — any local Postgres
   exposing `flow3d` per `DATABASE_URL`. Failures are swallowed in
   `core/db.log_job` so the API still works without it.
3. **Backend API** — `python -m uvicorn main:app --reload` from `backend/`.
4. **Celery worker** — see the section above.
5. **Frontend** — `npm run dev` from `frontend/` after creating
   `.env.local` with `VITE_USE_MOCK=false`.

Health check from the command line, before opening a browser:

```
curl -X POST http://localhost:8000/api/solve \
  -H "Content-Type: application/json" \
  -d '{"items":[{"item_id":"a","w":800,"l":600,"h":500,"weight_kg":20,"stop_id":1,"side_up":false}]}'
# -> {"job_id":"...","status":"queued"}
curl http://localhost:8000/api/result/<job_id>
# -> {"status":"done","plan":{...}}
```

## Run tests (same on all platforms — activate venv first)

```
cd backend
python -m pytest tests/ -v
```

## Note for all members

- Never commit your `venv/` or `.venv/` folder.
- Never commit `.env` — copy `.env.example` and fill in your values.
- **Before every commit and push**, run the `/ship` slash command inside Claude Code:
  - `/ship` (commit mode) — runs lint, tests, secret scan, conflict markers, and
    large-file checks; generates a ready-to-copy conventional commit message.
  - `/ship release` (release mode) — does everything above plus classifies new
    commits, updates `CHANGELOG.md`, and proposes the next semver tag. Use this when
    closing a sprint or tagging a release.
- The command is defined in `.claude/commands/ship.md` and works identically on
  Windows and macOS. If Claude Code is not open, ask the optimization engineer to
  run it before the PR is merged.
