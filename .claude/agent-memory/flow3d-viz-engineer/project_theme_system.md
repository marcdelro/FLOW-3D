---
name: Theme system architecture
description: Light/dark theme implementation — store, token file, and component wiring pattern
type: project
---

A full light/dark theme system was added to FLOW-3D. Key facts:

- `frontend/src/store/themeStore.js` — Zustand store, persists to localStorage under key `flow3d-theme`. Exports `theme` ('dark'|'light') and `toggleTheme()`.
- `frontend/src/theme.js` — exports `darkTheme`, `lightTheme`, and `getTheme(name)`. All color tokens live here (bg, border, text, accent, danger, toggle, component-specific overrides).
- Default theme is **dark**.

**Wiring pattern:**
- `App.jsx` reads `useThemeStore`, calls `getTheme(theme)`, passes the token object as `theme={t}` and `themeName={theme}` props down to `SimHeader` and `Sidebar`.
- `Sidebar` passes `t` and `themeName` further to tab sub-components (`ItemsTab`, `RouteTab`, etc.) as `t` prop.
- `FurnitureItemCard` accepts `theme={t}` prop.
- `Legend.jsx` and `LandingPage.jsx` read `useThemeStore` directly (no prop drilling) since they are not in the sidebar/header tree.
- `SimulatorCanvas` / `ContainerCanvas` are NOT themed — they own the Three.js scene and must not be touched.

**Body transition:** `index.html` has `transition: background-color 0.3s ease, color 0.3s ease` on `body`. App.jsx and LandingPage.jsx each use `useEffect` to set `document.body.style.background` on mount and clear on unmount.

**Why:** App.jsx controls body bg for the dashboard page; LandingPage does it for the landing page — ensures the body never shows a flash of wrong color between route transitions.
