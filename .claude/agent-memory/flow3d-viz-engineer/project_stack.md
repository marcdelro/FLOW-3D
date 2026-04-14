---
name: FLOW-3D Frontend Stack
description: Confirmed tech stack and file layout for the FLOW-3D frontend scaffold
type: project
---

Frontend stack is React 18 + Vite 5 + Three.js r165 + Zustand 4. No other state management libraries are in use.

Key file locations:
- `frontend/src/store/useManifestStore.js` — Zustand store; single source of truth for manifest + container dims
- `frontend/src/api/solverApi.js` — only file that calls backend endpoints (POST /api/solve, GET /api/health)
- `frontend/src/hooks/useThreeScene.js` — full Three.js lifecycle (init, rebuild, dispose)
- `frontend/src/components/ContainerCanvas.jsx` — mounts renderer, reads store, delegates to hook
- `frontend/src/components/LoadForm.jsx` — form; the only component that imports solverApi.js
- `frontend/src/components/Legend.jsx` — LIFO stop color legend; reads placements from store
- `frontend/src/utils/stopColors.js` — canonical STOP_COLORS palette and getStopColor(stop) helper
- `frontend/vite.config.js` — proxies /api to http://localhost:8000 (strips /api prefix before forwarding)

**Why:** This is the finalized scaffold established in the initial frontend build session.

**How to apply:** Use these paths when navigating to or referencing frontend modules. Verify they exist before citing them in future sessions.
