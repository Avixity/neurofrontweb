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
- `styles.css`: responsive visual system, reduced-motion and no-JavaScript layouts.
- `src/main.ts`: navigation, sensor tabs, scroll coordination and progressive enhancement.
- `src/scene.ts`: Three.js renderer, lighting, camera, logo handoff and rendering lifecycle.
- `src/model.ts`: separate procedural hardware groups, materials and attached deforming wires.
- `src/baseline.ts`: clearly labelled illustration of the dashboard's current baseline calculation.
- `public/assets`: optimised updated prototype photographs and the original logo.
- `docs/model-notes.md`: physical references, modelling assumptions and geometry checks.

The presentation retains HTML rather than adding a component framework. TypeScript separates the animation and interactions; Vite bundles local Three.js and GSAP dependencies. The 3D module loads separately from the explanatory content.

## Experience and fallbacks

The opening mark becomes the printed logo on the controller lid. It can be skipped and plays once per tab session. Slow initialisation, an existing anchor, early scrolling or reduced motion skips the intro. The page never displays a fabricated loading percentage.

Scrolling opens the lid and separates the boards. The three view buttons provide direct access to those states, including with reduced motion. Sensor tabs also support the arrow, Home and End keys. The baseline slider illustrates the verified current calculation; it does not collect physiological data.

Rendering is demand-driven, resolution is capped, and rendering stops when the story or tab is hidden. `?view=static` selects the photography fallback. If 3D cannot initialise or its context is lost, that fallback activates. Core text and all three sensor explanations remain readable without JavaScript.

## Source boundaries

The current CBSE description and updated Drive photographs inform the content and hardware model. The original local MP4 was inspected through extracted frames, including half-second intervals through the hardware sequence. It is a visual reference and is not included in the production download.

The current dashboard source was audited separately, without modifications. Its primary electrical input drives the experimental estimate. Its temperature and GSR displays are derived values, not independently parsed sensor readings. The site states that distinction explicitly. The dashboard preview is labelled illustrative and never represents an active device session.

No physical Bluetooth session, clinical validity or stress-detection accuracy is claimed. See the model notes for unmeasured dimensions and inferred component placement.
