# NeuroFront

The main presentation site for **NeuroFront — Multi-Sensor Stress Monitoring Wearable**. The companion dashboard remains a separate project at [neurofrontui.vercel.app](https://neurofrontui.vercel.app/).

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

The development preview is available at `http://localhost:5173`. To check the production build:

```sh
npm run build
npm run preview
```

The production preview uses `http://localhost:4173`. Vercel builds with `npm run build` and serves `dist`, as declared in `vercel.json`. The existing GitHub repository and Vercel project are retained.

## Structure

- `index.html`: accessible page content, navigation and controls.
- `styles.css`: base visual system; `experience.css` controls the persistent scene and viewer; `readability.css` sets readable type and responsive controls; `dashboard-image.css` presents the supplied dashboard screenshot.
- `src/main.ts`: navigation, sensor tabs, scroll coordination and progressive enhancement.
- `src/scene.ts`: one Three.js renderer, adaptive quality, raycast selection, camera and rendering lifecycle.
- `src/story.ts`: reversible scroll state, from assembled device to docked model.
- `src/opening.ts`: SVG heartbeat and lettering animation, with a projected handoff onto the lid.
- `src/components.ts`: verified component descriptions and reference-image mapping.
- `src/model.ts`: separate procedural hardware groups, materials and attached deforming wires.
- `src/baseline.ts` and `src/signals.ts`: continuous illustrative traces and the dashboard's current baseline calculation, with an independent visibility-aware animation loop.
- `public/assets`: optimised updated prototype photographs and the original logo.
- `docs/model-notes.md`: physical references, modelling assumptions and geometry checks.

The presentation retains HTML rather than adding a component framework. TypeScript separates state, rendering and interactions; Vite bundles Three.js separately from the explanatory content. Scroll updates no longer create GSAP tweens.

## Experience and fallbacks

The accurately traced SVG mark draws its heartbeat, resolves its lettering and becomes the printed logo on the controller lid. It plays on every full load, including refresh, with a restrained reduced-motion alternative. There is no visible Skip intro button; scrolling or using navigation still releases the opening. The loading state never shows a prototype photograph. A completed first model frame changes the scene to ready; failed 3D or explicit static mode enables photographs. A slow initialisation releases the opening after 2.4 seconds so navigation and content remain available.

Scrolling opens the lid, separates the components, explains the sensors, reassembles the device and docks it in a compact corner preview. Reverse scrolling reverses that state. View buttons provide direct access. Six components can be selected by tapping the model or using accessible buttons. Opening details moves the model clear of the side panel, or fits it above the mobile bottom sheet; closing restores its previous framing. The expanded viewer reuses the same renderer and supports dragging, Close, Escape and focus restoration. Sensor tabs support arrow, Home and End keys. The baseline slider illustrates the current calculation; it does not collect physiological data.

Rendering stops when the model is stationary or the tab is hidden. Mobile starts with a reduced geometry tier, two directional lights, a cheap contact shadow and a conservative resolution; measured moving-frame cost adjusts resolution within a capped range. Geometry quality is chosen at startup, including touch-device orientation changes. Layout measurements are cached and refreshed on resize or observed content changes. Scroll events coalesce into one update per animation frame.

Live example graphs scroll continuously while visible and stop offscreen, in hidden tabs, when paused or with reduced motion. The calibrated baseline stays fixed. Signal samples retain their shape as they move through clipped SVG windows; only the live comparison amplitude responds to the slider. The graphs never create a WebGL renderer. `?view=static` selects photography. Core text and all three sensor explanations remain readable without JavaScript. `?inspect=1` adds projected component coordinates to scene diagnostics for repeatable raycast tests.

See [model-performance.md](docs/model-performance.md) for the repeatable CPU benchmark and its limitations, and [verification.md](docs/verification.md) for browser verification.

## Source boundaries

The current CBSE description and updated Drive photographs inform the content and hardware model. The original local MP4 was inspected through extracted frames, including half-second intervals through the hardware sequence. It is a visual reference and is not included in the production download.

The current dashboard source was audited separately, without modifications. Its primary electrical input drives the experimental estimate. Its temperature and GSR displays are derived values, not independently parsed sensor readings. The site states that distinction explicitly. The dashboard section uses the actual supplied `Dashboard.png`, labelled as a static screenshot, and never represents an active device session.

No physical Bluetooth session, clinical validity or stress-detection accuracy is claimed. See the model notes for unmeasured dimensions and inferred component placement.
