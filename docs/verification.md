# Redesign verification

Checked on 31 October 2026 against the local production build at `http://localhost:4173` in headless Chromium. The native in-app browser host was unavailable, so automated browser checks and rendered screenshots were used instead.

## Completed checks

- `npm run build`: TypeScript checking and Vite production build passed.
- Desktop 1440 × 900 and mobile 390 × 844: full page, scrolling down and back, navigation, image loading and layout overflow.
- Reduced motion, explicit `?view=static`, unavailable WebGL and no JavaScript: readable content and photography fallback.
- Hardware buttons: assembled, open and separated states; four component labels in the exploded view.
- Sensor tabs: pointer selection and arrow-key navigation; matching visible panel and component highlight.
- Baseline: 1.5 times resting variation produces 69; twice resting variation produces 88, matching the audited dashboard calculation.
- Mobile navigation: open, Escape to close, and section navigation.
- Motion control: pointer hit-testing, pause and resumption.
- Intro: returning sessions skip it; delayed scene loading and early scrolling do not launch it over later content.
- Actual `WEBGL_lose_context` event: switches to photography and retains the explanation.
- No unexpected console errors, page errors, missing assets, broken internal anchors or horizontal overflow in the six complete scenarios. The JavaScript-disabled browser may report blocked module preloads as `csp`; the visible page still works.

## Rendering observations

The assembled hero reported 86 render calls and 38,284 triangles in this browser configuration. Its rendered-frame counter stayed unchanged over separate short idle, offscreen, paused and reduced-motion observation windows. These checks establish that unnecessary rendering stops; they are not a claim about frame rate on other hardware.

The reference video was inspected through extracted frames, including half-second intervals around its hardware animation. Updated Drive photographs were visually inspected before the model and web crops were prepared. No physical sensor, Bluetooth pairing, clinical validation or stress-detection accuracy test was performed.

Local screenshots and detailed machine-readable results are kept in the ignored `.work/qa` directory. Original website files are preserved in `.work/original`, and the supplied video remains untouched in the project root.
