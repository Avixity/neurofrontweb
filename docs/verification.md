# Refinement verification

Checked on 31 October 2026 against the local production build at `http://localhost:4173`. TypeScript checking and the Vite production build passed. The initial optimization was tested with bundles `index-CXX81UyK.js` and `scene-Dq_I9zwR.js`; the measurements below belong to that revision, before the final panel, preview and graph adjustments.

## Floating preview and viewer follow-up

The follow-up build uses `index-DgXv5bq0.js`, `scene-DBWaoV6o.js` and `index-DBHXCjkL.css`. TypeScript and the production build passed. The focused browser suite passed 47/47 checks at desktop widths 1440 and 1920, and touch-emulated widths 390 and 320, with no page, console or HTTP errors.

- The floating corner model has a visible shadow, no enclosing background, border or clipping, and a separate 44 px high Explore device button. The whole band, cable and controller fit. The previous stage caption is absent.
- The hero footer disappears before passing behind the device. One reveal state now coordinates the camera handoff, a stationary interval, lid opening, another interval and component separation. Slow and fast forward/reverse samples preserve that phase order. The previous 1440 run covered 1,330 samples; the final build repeated the wide-screen sequence.
- Actual viewer drags were measured using the projected ESP32 position: left/right moved the board by approximately -51/+51 px, and up/down by -18/+18 px, returning to its starting projection. Component selection beside the panel, same-canvas expansion, collapse and focus restoration passed on desktop and mobile.
- Each viewport recorded 72 rightward live-trace frame pairs and none moving left. The calibrated path remained fixed. Numerical buffer-boundary checks retained identical sample heights and the expected positive horizontal displacement. Paused dock frame counters stayed unchanged.
- Successful startup showed no photographic fallback flash, and no horizontal overflow was detected. Screenshots of the floating preview were visually inspected at all four widths.

Evidence is retained in `.work/qa/floating-transition-qa.json`, `floating-transition-before-interruption.json` and `floating-*.png`. These checks use the desktop Chromium environment described below, not physical phones. No new whole-page performance measurement was made. A direct jump from the exploded view to the footer can still ease reassembly and docking at the same time; normal scroll targets finish reassembly first.

## Previous publication refinements (8288a12)

That release used `index-8LoZ-mQf.js`, `scene-1Lz6RNC6.js` and `index-CvNtsGJS.css`. Focused browser checks at 1440 × 900, 390 × 844 and 320 × 740 verified its follow-up changes:

- Details move the model left of the desktop panel or above the mobile sheet. Actual component taps still work. Closing restores the original position, story copy and keyboard focus. Desktop inspection temporarily hides the surrounding story copy so it does not compete with the model.
- The corner tile is 184 px wide on desktop and 112 px on mobile. Its tighter framing retains the complete band, cable and controller with visible margins. The expanded view retains the original canvas and restores dock focus when closed.
- The real 1899 × 967 `Dashboard.png` loads as `Dashboard-D5V_IxKI.png`, with a static screenshot caption and working dashboard link. Caption labels remain at least 12 px.
- The calibrated reference path stays unchanged while the live comparison moves and responds to the slider. Fixed-time samples translate smoothly between buffered geometry refreshes. The previous sharp-peak phase shimmer was reproduced numerically; 1,753 retained sample values were identical across a new geometry refresh boundary. Browser checks observed no blank live-trace frames and confirmed pause behavior.
- Skip intro is absent, the revised electrical-impulse copy appears, and there is no horizontal overflow or unexpected browser/HTTP error in the focused runs.

The first focused suite contained 58 checks. Its mobile caption issue and two visually detected framing issues were corrected and passed the targeted retest. Evidence is retained in `.work/qa/latest-refinement-report.json`, `latest-layout-retest.log` and `latest-final-*.png`. The graph lifecycle harness also checked one scheduled animation frame, fixed baseline writes, pause, simulated visibility state, reduced motion and disposal; it does not establish real hidden-tab behavior.

## Browser and functional checks

Tests used Playwright with headless Chromium 151 on Windows, on an Intel Core i3-1005G1 host with Intel UHD graphics through ANGLE/D3D11. Viewports included desktop 1440 × 900, touch-emulated 390 × 844, landscape 844 × 390 and narrow 320 × 740. Rendered screenshots were visually inspected.

- Cold loads and repeated refreshes: heartbeat draws from zero, individual traced letters resolve, and the completed logo moves into perspective onto the controller lid. Successful startup never shows a painted prototype photograph. Delayed scene loading, direct anchors and resizing during the opening were checked. The initially tested Skip intro control was subsequently removed at the user's request.
- Normal refreshes replay the opening at the top. Explicit anchored navigation preserves its destination. Warm reloads completed the opening approximately 2.02–2.09 seconds after navigation in the final run. Cold loads took approximately 2.74 seconds on the mobile viewport and 3.62 seconds on desktop, including asset preparation. These are observed local timings, not load-time guarantees.
- Slow and fast scrolling in both directions: assembly, hinge opening, separation, sensor explanation, reassembly and docking. View controls and reverse scrolling restore the appropriate state.
- All six component buttons and all six actual model raycasts passed on both desktop and touch emulation. Detail names, images, captions, sensor-tab synchronization and keyboard navigation were checked. Battery and charger images are explicitly labelled model close-ups.
- Dock, expand, orbit, component close-up, collapse and return to story: one original canvas and one WebGL context are retained. Closing preserves scroll and returns focus to the dock control. Escape and focus trapping, including an open details panel, passed targeted retests.
- Distinct electrical, EDA and temperature traces move continuously. Baseline changes affect the moving comparison trace; 1.5 times baseline produces 69 and twice baseline produces 88. Visible pause/resume, reduced motion, offscreen graphs and graphs covered by the viewer were checked.
- Desktop/mobile navigation, external dashboard links, image loading, narrow content reflow and horizontal overflow were checked. Visible landscape viewer controls were hittable; the model is relatively small at 844 × 390.
- Explicit `?view=static`, unavailable WebGL, a real `WEBGL_lose_context` event and disabled JavaScript retain readable explanation and prototype photographs. Reduced motion retains the content and interaction controls.
- Docked and expanded stationary frame counters stayed unchanged. No additional renderer is created for close-ups or the expanded viewer.

The primary suite contained 114 checks. Defects it found in canvas stacking, focus restoration, the focus trap and mobile refresh were fixed and retested. The final targeted suite passed 22/22 checks; the additional narrow-layout and renderer-lifecycle suite passed 9/9. Final targeted runs reported no page errors, console errors or failed HTTP responses. No visitor-facing em dashes remain in the HTML or TypeScript copy.

## Matched browser performance comparison

Both runs used 121 scripted scroll positions from 0 to 2514 px and back, 80 ms between positions and 750 ms settling. The viewport was 390 × 844 with touch emulation and device pixel ratio 1. No CPU throttling was configured. Page narrative lengths differ, but scroll positions and timing match.

| Measurement | Before | Final |
| --- | ---: | ---: |
| Renderer-process task duration | 5.794 s | 1.941 s |
| JavaScript duration | 4.606 s | 1.156 s |
| Scene frames rendered | 628 | 271 |
| Reported triangles | 38,284 | 16,236 |
| Layout duration | 30.4 ms | 16.0 ms |
| Layout count | 108 | 156 |
| Style recalculation count | 631 | 327 |
| Animation-frame interval, 95th percentile | 17.2 ms | 16.9 ms |
| Maximum animation-frame interval | 50.4 ms | 18.5 ms |
| Animation-frame intervals above 33.34 ms | 5 | 0 |

Task time fell 66.5%, JavaScript time fell 74.9%, and rendered frames fell 56.8% in this single matched run of the initial optimization. Layout count increased, while total layout time decreased. The optimized scene performed no additional cached layout measurement during that scroll workload. Mobile started at rendering pixel ratio 0.85 and adjusted to 1.00 based on measured moving-frame cost; real-time shadows remained disabled. This full performance workload was not repeated after the final panel framing and graph-sampling changes.

The separate repeatable [model CPU benchmark](model-performance.md) measures wire deformation and geometry construction without a GPU. It confirms removal of runtime curve-frame and bounds recalculation. It must not be treated as a browser or phone frame-rate test.

## Limits and evidence

These are desktop-host measurements with mobile viewport and touch emulation, not physical-phone GPU, battery or iOS Safari results. Actual hidden-tab suspension could not be measured: activating a second headless tab left both documents reporting visible. Visibility handlers were reviewed without spoofing the browser's visibility state; visible idle and viewer-covered graph suspension were measured.

The model preserves the current wired headband and separate controller. Dimensions, obscured sensor placement and some ports remain visual approximations, documented in [model-notes.md](model-notes.md). No new physical sensor, Bluetooth pairing, clinical validation or stress-detection accuracy test was performed. The companion dashboard was not changed.

Local screenshots, scripts and detailed results are retained in the ignored `.work/qa` directory, including `refinement-summary.md`, `refinement-report.json`, `refinement-final-targeted.json`, `refinement-lifecycle.json`, `performance-before-refinement.json` and `performance-final-refinement.json`. The original video and existing reference photographs remain intact.
