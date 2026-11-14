# Photo gallery and viewer refinement

Implemented and checked 15 November 2026 in the existing `neurofrontweb` repository. The companion dashboard was not changed.

## Changes

- Replaced the tall photo stack with an editorial gallery: enclosure, interior and headband. Two real photographs received AI-assisted lighting/background edits. Studio edit and Original photo controls make the distinction explicit. Source links retain the untouched files.
- Added a native modal for large photographs, with Escape, close control, focus restoration and scroll preservation. Replacement images decode before the visible image changes. Late image responses cannot replace a newer selection.
- Added direct entry to the full 3D viewer, zoom buttons, percentage readout, Reset view, keyboard shortcuts, canvas wheel zoom and two-finger pinch. Zoom is bounded to 75-185%. Component picking uses the same projected camera, including after zoom.
- Retained one renderer and the current physical model. Reset/close restores the camera. Stationary rendering remains stopped. Gallery inspection suspends unnecessary scene work, and the miniature is hidden while this section is visible so it does not cover captions.
- Cached viewer header/control bounds determine the available scene area. Desktop, narrow portrait and short landscape layouts keep the toolbar accessible. Narrow camera fitting applies only to the expanded viewer, preserving the existing scroll transition.

## Verification performed

TypeScript checking and the Vite production build passed. Browser checks used Windows-hosted Chromium 151 through Playwright, with desktop viewports of 1440x900 and 1440x1000, and touch/mobile emulation at 390x844, 320x740 and 844x390.

- All gallery photographs and source/studio modes loaded. The headband correctly offers only its original. Photo modal opening, Escape and focus restoration passed.
- Zoom buttons, keyboard + / - / 0, limits and disabled states, mouse wheel, CDP touch pinch, drag, reset and close/reopen passed. A zoomed component was selected by raycasting. The same canvas object remained throughout viewer opening and closing.
- Zoom settled and the scene frame counter stayed unchanged across a subsequent 1000 ms idle interval. A reduced-motion zoom action rendered one frame. Photo expansion also left the scene frame counter unchanged while covered.
- The logo opening ran on refresh. Successful 3D initialization did not show the fallback photograph. Forward/reverse scroll checkpoints returned to the original assembled hero. The fixed baseline path remained unchanged while the illustrative live trace moved.
- Reduced motion retained zoom interaction and paused the traces. Deliberately blocking WebGL produced the original-photo fallback, disabled viewer entry, and left the gallery usable.
- No unexpected JavaScript/HTTP errors or horizontal overflow were observed in the checks. Screenshot review identified miniature/caption overlap and narrow-viewer lid clipping, which were corrected and retested.

Local evidence: `.work/qa/editorial-regression.mjs`, `editorial-regression.json` and screenshots; gallery and dedicated viewer runs are in the Windows temporary directory under `neurofront-gallery-qa-*` and `neurofront-viewer-zoom-*`. These artifacts are not shipped to visitors.

## Limits

The tests use desktop Chromium, not a physical phone or iOS Safari. No new whole-page frame-rate or battery-performance claim is made. Existing model proportions, unseen ports and cable routing remain approximations.

The image generator rejected the headband edit, so the original is used. Fine text and surface texture in the two studio edits may be reconstructed; original photos remain the authority for engineering details. Exact prompts, generated-file paths and optimized output sizes are recorded in [photo-art-direction.md](photo-art-direction.md).
