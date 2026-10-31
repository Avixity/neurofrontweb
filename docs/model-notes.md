# NeuroFront model notes

The website uses a procedural Three.js explanation of the current wired prototype. It is not a measured CAD model. The model preserves the fabric headband, visible electrode leads, separate controller, and hinged enclosure shown in the current project photographs.

## References inspected

- Updated photographs **1, 2, 3, and 4** in the [primary NeuroFront Drive folder](https://drive.google.com/drive/folders/19Y8WWLh8sYoZmOehavQl_RRSuCdn6Ex8): photograph 1 shows the open black controller; 2 and 3 show the fabric band, electrode snaps, tape, clips, and white leads; 4 shows the closed lid and original NeuroFront mark.
- Local `NeuroFront-CBSE-Expo-2026.mp4`: 114 seconds, 1920 × 1080, 24 fps. Contact sheets were extracted across the video, with half-second frames inspected from 20.5 to 33.5 seconds. The product reveal and lid movement informed the pacing; the actual photographs informed the physical construction.
- Local component images `esp 32.png`, `ad8232.png`, `gsr sensor.png`, and `ntc10k.png` informed recognisable board, connector, and sensor details. The local `Control Unit.png` depicts an older clear enclosure and was superseded by the updated Drive photographs.
- The lid uses an SVG contour trace of the original supplied white logo, with its proportions preserved. The same traced paths form the animated opening.

## What is represented

The enclosure has separate base, rim, recessed lid, barrel hinges, cable socket, charging-port detail, power control, and latch. Its components are separate groups: standard ESP32 development board, red AD8232 board, GSR board, foil lithium-ion pouch, blue charging module, electrode snaps, and thermistor. The battery, charger, AD8232, and ESP32 follow their approximate relative locations in photograph 1. The band includes a textile bump texture, edge seams, securing tape, ties, red/yellow metal snap connectors, and visible white leads.

Opening uses a hinge rotation. Exploding separates the boards and sensors; jumper and electrode-lead geometry deforms to remain attached to moving component anchors. Highlights identify components without implying that the model is receiving measurements.

## Modelling assumptions

- No physical dimensions, board mounting drawing, or editable CAD asset was supplied. All dimensions and spacing are visual approximations. The enclosure is represented as 2.6 × 1.9 scene units, with the assembly approximately 5.7 scene units wide.
- The exact GSR-board position and thermistor attachment are obscured or not identifiable in the photographs. Their locations are explanatory assumptions, not claims about verified internal placement.
- Wiring is simplified for readability; it is not a verified electrical schematic or an exact reconstruction of every connection. The exploded arrangement is an explanation, not a proposed assembly method.
- Some connector and port details are inferred from the reference views. The headband is displayed as an oval for clarity, while preserving its fabric construction and wired relationship to the controller.
- The terry texture, casing grain, board markings, and battery label are lightweight procedural approximations. The logo and accompanying prototype photographs are supplied project assets.

## Implementation checks

Desktop quality contains 38,314 triangles, 85 mesh objects including instanced batches, and 261 small repeated instances. Mobile quality contains 16,234 triangles and 171 repeated instances, retaining the same component groups. Those are static geometry counts, not measured frame-rate or total renderer draw-call claims.

Numerical checks confirmed finite geometry attributes, correctly oriented inner/outer/top/bottom band normals, and restoration of the assembled geometry bounds after opening/exploding and reversing. Across 101 explosion positions, the first internal wire's endpoints matched their moving component anchors within 0.00000006 scene units in both quality levels. Unchanged animation states do not upload wire buffers again. Geometry, materials, textures and cached wire buffers have an idempotent disposal path. Browser appearance and performance are checked separately as part of the complete website.

## Model API

`buildDevice()` retains desktop quality; `buildDevice({ mobile: true })` reduces small bevels, cable subdivisions, stitching and passive-component detail. Both retain the fabric band, enclosure, connected leads, ports and individual electronics.

`SELECTABLE_PARTS` exports the exact keys `ad8232`, `esp32`, `gsr`, `temperature`, `battery`, and `charger`. Each is available through `device.parts[key]`. Its group and descendant meshes carry `userData.partKey` for selection and interaction proxies. The extra `electrode` group is retained for the electrical-path highlight.

Wire position and normal buffers are prepared at three explosion states during construction. Runtime animation blends adjacent buffers, with an endpoint correction for the boards' small rotations. Frenet frames, curve arc lengths, normals and geometry bounds are not recalculated during animation. Wire bounds are deliberately generous and frustum culling is disabled for those small meshes; use precise geometry bounds when measuring the whole assembly. Highlight materials update only when the selected key changes.

The repeatable CPU benchmark and measured limitations are documented in [model-performance.md](model-performance.md).
