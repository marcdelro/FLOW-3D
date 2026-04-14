---
name: Placement manifest schema
description: Canonical JSON schema the backend returns and the frontend consumes
type: project
---

Backend POST /api/solve returns:

```json
{
  "container": { "L": 6000, "W": 2400, "H": 2600 },
  "placements": [
    {
      "item_id": "chair-01",
      "x": 0, "y": 0, "z": 0,
      "l": 500, "w": 500, "h": 900,
      "rotation": "identity",
      "delivery_stop": 1,
      "phase": 1
    }
  ],
  "utilization": 0.72,
  "solver_time_ms": 340
}
```

All spatial values are in millimetres (mm). The Three.js scene uses mm as world units directly — no scaling applied.

Coordinate mapping to Three.js axes:
- x_i → Three.js X (length, left→right)
- y_i → Three.js Y (height, bottom→top)
- z_i → Three.js Z (depth, door→back wall)

Item bounding box is placed with its corner at (x_i, y_i, z_i); centre offset to (x + l/2, y + h/2, z + w/2) for Three.js Mesh positioning.

delivery_stop is 1-based. Stop 1 = nearest door = first unloaded.

**Why:** Agreed schema at scaffold time. Backend deviations must be flagged against this record.

**How to apply:** Cross-check any manifest field referenced in Three.js code against this schema before writing rendering logic.
