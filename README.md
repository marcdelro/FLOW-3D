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

## Frontend setup (same on all platforms)

```
cd frontend
npm install
npm run dev
```

## Run tests (same on all platforms — activate venv first)

```
cd backend
python -m pytest tests/ -v
```

## Note for all members

- Never commit your `venv/` or `.venv/` folder.
- Never commit `.env` — copy `.env.example` and fill in your values.
