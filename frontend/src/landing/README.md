# FLOW-3D — Landing page

Public marketing page at `/` for FLOW-3D. The existing tool/dashboard app moved
to `/app`. Auth pages are stubs at `/login` and `/register`.

## File map

| File                          | Responsibility                                                  |
| ----------------------------- | --------------------------------------------------------------- |
| `pages/Landing.tsx`           | Composes the sections below.                                    |
| `landing/Nav.tsx`             | Sticky glassmorphism nav.                                       |
| `landing/Hero.tsx`            | Headline + CTAs + lazy-loaded 3D canvas (or mobile poster).     |
| `landing/Hero3D.tsx`          | r3f `<Canvas>`, post-fx, suspense boundary. Lazy-loaded.        |
| `landing/TruckScene.tsx`      | Translucent truck shell, lighting, animation loop, label chip.  |
| `landing/FurnitureMeshes.tsx` | Six low-poly furniture types in real-world mm dimensions.       |
| `landing/SocialProof.tsx`     | Logo strip, 5-star block, two placeholder testimonials.         |
| `landing/AboutSection.tsx`    | What it is + Why-in-the-Philippines context.                    |
| `landing/HowItWorks.tsx`      | Four-step manifest-to-load explainer.                           |
| `landing/FAQ.tsx`             | 8-item accordion (single-open).                                 |
| `landing/FinalCTA.tsx`        | Closing band with primary CTA.                                  |
| `landing/Footer.tsx`          | Columns + copyright + advisory disclaimer.                      |
| `landing/primitives/*`        | `Button`, `ButtonLink`, `Section`, `Eyebrow`, `H2`, `Lead`.     |
| `landing/hooks/*`             | `usePrefersReducedMotion`, `useIsMobile`.                       |

## 3D scene perf budget

- **Target:** ≥ 50 fps on a mid-range laptop (M1, Ryzen 5 + integrated GPU).
- **Draw calls per frame:** ~10. Truck shell (5: floor + 3 walls + roof + edges)
  + 6 wheels + ~18 furniture groups (~3 primitives each, no instancing yet).
- **Geometry:** Box and short-segment cylinders only. No external GLTFs.
- **Materials:** `MeshStandardMaterial` (one per furniture variant), one
  `MeshPhysicalMaterial` for the frosted walls. Shared where possible.
- **Post-fx:** Bloom (luminance 0.85, intensity 0.45) + Vignette. Disabled
  automatically when `prefers-reduced-motion: reduce`.
- **DPR:** `[1, 1.8]` — caps retina to keep mobile-class GPUs honest.
- **Lazy loading:** `Hero3D` is `React.lazy()`-imported; fallback is the blurred
  hero poster.
- **Mobile (`< 768 px`) / reduced-motion:** canvas is replaced by the static
  poster `frontend/public/landing/hero-poster.webp`. No drag, no rotate.

If FPS regresses below 50 on the target laptop, the cheapest wins are:
1. Merge each furniture type's primitives via `BufferGeometryUtils.mergeGeometries`
   and switch to `drei`'s `<Instances>` (one draw call per type).
2. Drop the Bloom pass (single biggest cost on iGPUs).
3. Reduce `dpr` cap to `[1, 1.4]`.

## Swap placeholder testimonials

`landing/SocialProof.tsx` contains two placeholder testimonial cards near the
bottom of the component. Each call to `<Testimonial quote=... attrib=... />`
takes a quote string and an attribution string. Replace both before the demo;
the `TODO` comment in that file is the marker.

## Hero poster fallback

`frontend/public/landing/hero-poster.webp` is the static fallback used on
mobile, when the user has `prefers-reduced-motion`, and as the Suspense
fallback while `Hero3D` is being loaded. **A real pre-rendered scene is not
yet committed** — the current file is a placeholder. To regenerate:

1. Open the landing page on desktop, drag the truck into a flattering angle.
2. Use the browser devtools "Capture screenshot" or any 3D capture tool to
   export a 1920×1080 PNG.
3. Convert to WebP at ~80 quality and replace the file.

## Routes added

- `/` → `Landing`
- `/app/*` → existing simulator (was previously the root)
- `/register`, `/login` → stub pages

`react-router-dom` was added as a dep; previous root-mounted `App` is now
wrapped by `BrowserRouter` in `src/main.tsx`.
