---
name: LIFO stop color palette
description: Canonical delivery-stop color mapping for FLOW-3D LIFO visualization
type: project
---

Defined in `frontend/src/utils/stopColors.js`. STOP_COLORS array, index 0 = stop 1:

| Stop | Color   | Hex     |
|------|---------|---------|
| 1    | red     | #ff3b3b |
| 2    | orange  | #ff8c00 |
| 3    | yellow  | #f5e642 |
| 4    | green   | #4cde5a |
| 5    | cyan    | #23c6c8 |
| 6    | blue    | #3a7bd5 |
| 7    | violet  | #8b5cf6 |
| 8    | pink    | #ec4899 |

Convention: stop 1 = nearest door (hottest/red), highest stop = deepest in container (coolest/violet end). Wraps for manifests with more than 8 stops.

**Why:** Established at scaffold time so Legend and Three.js scene use the identical palette without coordination overhead.

**How to apply:** When adding new visual elements that reference delivery stops, always import getStopColor from stopColors.js — never hardcode colors inline.
