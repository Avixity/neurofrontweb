# Prototype photo art direction

Prepared 2026-11-14 using the built-in `image_gen` edit tool, not the fallback CLI. Each original was inspected before editing. The originals remain unchanged under `public/assets/` and should remain available from the gallery's Original photo control.

## Published assets

| Asset | Original edit target | Dimensions | Bytes |
| --- | --- | --- | --- |
| `public/assets/prototype-controller-editorial.webp` | `public/assets/prototype-4.webp` | 1485 x 1059 | 269754 |
| `public/assets/prototype-interior-editorial.webp` | `public/assets/prototype-1.webp` | 1536 x 1024 | 301518 |

The generated PNGs were encoded to WebP with Sharp, quality 88, effort 6, photo preset, without resizing or further visual alterations. No Sharp dependency was added to the application. Both final WebP assets were visually inspected.

These are explicitly labeled AI-assisted studio edits, not unmodified documentation photographs. The enclosure, wordmark, board arrangement, wires, battery, hinges and handmade condition remain recognizable. The generator can reconstruct fine surface texture and small component lettering; the original photographs are the authoritative source for those details. Do not use an enhanced battery label or circuit-board microtext to infer specifications. The imagery is presentation material, not engineering evidence or measurement-accurate reconstruction.

## Closed controller prompt

Input role: edit target, `public/assets/prototype-4.webp`.

> Use case: precise-object-edit. Asset type: authentic NeuroFront prototype editorial photograph for its engineering website. EDIT TARGET: the supplied photograph of the CLOSED controller; this is a retouch, not a redesigned product. Preserve the same top-down camera viewpoint, rectangular enclosure proportions, every edge/hinge/latch, visible white cable on the right, the imperfect handmade condition, and the exact real NeuroFront wordmark including its heartbeat stroke and lettering proportions. Keep the logo in its existing physical location and orientation; do not redraw or retype it. Change only the surrounding surface and photographic lighting: a matte charcoal-black studio tabletop, soft directional light from upper left, carefully controlled highlights, gentle grounding shadow. Reduce harsh flash glare on the lid, improve legibility of real material texture, modest natural sharpening. Maintain truthful scratches and wear. Tight editorial landscape crop with the entire real device and right cable visible, no excessive negative space. Warm neutral highlights and deep graphite shadows, no cyan lighting. Photoreal retouched camera image, not a 3D render. Do not add ports, displays, controls, components, wiring, cosmetic trim, labels, branding, fake text, or futuristic features. Preserve all real hardware without invention.

Generated source: `$CODEX_HOME/generated_images/01a19688-0ae6-72b0-9fb6-cbef46172b3b/exec-b271fad8-f44a-4802-ab5d-b9aa3378ce53.png`.

## Open controller prompt

Input role: edit target, `public/assets/prototype-1.webp`.

> Use case: precise-object-edit. Asset type: honest NeuroFront prototype editorial photograph for an engineering website. EDIT TARGET: the supplied real photograph of the OPEN hinged controller and electronics. Keep the exact photographed hardware arrangement: black rectangular case and open lid, real scratches, battery at upper left, red circuit board lower left, black ESP32 development board lower right, blue charging board upper right, and every existing yellow, white, green, purple, red and black wire in its original path and overlap order. Preserve component dimensions, number of boards, the visible labels, hinges, real soldering and handmade assembly. This is photographic retouching, NOT a redesign, CG rendering or replacement with idealized electronics. Change only background/lighting: matte dark charcoal studio tabletop, soft directional upper-left light, controlled natural highlights, gentle grounding shadow. Remove harsh direct-flash glare while retaining truthful material textures, modest natural sharpening. Maintain the same top-down camera view and perspective; the entire open controller remains visible. Landscape 3:2 editorial composition by extending only neutral tabletop at the sides of this portrait source, with the complete device centered; do not crop any hardware or invent unseen details. No added parts, no removed wires, no rearranged components, no fabricated ports, no text overlays, no sci-fi glow. Deep graphite shadows with warm-neutral highlights, matching restrained physical product photography.

Generated source: `$CODEX_HOME/generated_images/01a19688-0ae6-72b0-9fb6-cbef46172b3b/exec-5aa13e54-1b8d-455d-a15b-7de5ef9fe431.png`.

## Headband limitation

The built-in image generator rejected both attempts at a headband retouch at output moderation, categorized as violence. The input is an inanimate electronics prototype. No image was produced, no alternative provider or CLI was used, and further retries were stopped. Preserve `public/assets/prototype-2.webp` as the original photograph. There is deliberately no `prototype-headband-editorial.webp` placeholder or relabeled duplicate.

First prompt, input role: edit target, `public/assets/prototype-2.webp`:

> Use case: precise-object-edit. Asset type: authentic NeuroFront headband editorial photograph for its engineering website. EDIT TARGET: this exact real photograph of the fabric headband, its TWO electrode connectors and white leads. Retouch the photograph; do not redesign the hardware. Preserve the oval soft black terry-cloth loop and its irregular fabric shape, the red connector on the left and yellow connector on the right, both metallic contact faces, all existing black electrical tape folds, both black zip ties, the small white fastening pieces, and EVERY white cable's original route, crossings, loops, joins and off-frame end. Maintain the same camera viewpoint and perspective. The headband is a handmade wired prototype, NOT a wireless plastic headset. Change only the background and photographic lighting: matte deep charcoal studio tabletop, soft upper-left directional light, restrained highlights and natural grounding shadows. Tone down flash glare on tape, connectors and wires while retaining realistic material texture, modest sharpening, no sterile smoothing. Landscape 3:2 editorial framing containing the complete visible headband and the existing cable loops, using only extra neutral surface where needed. The original cable tails may continue out of the lower-right edge exactly as photographed. Matching warm-neutral highlights and deep graphite shadows. No invented components, extra electrodes, ports, embellishments, status lights, added labels, logos, text, or sci-fi glow. Preserve exact handmade construction and colors.

First output rejection request ID: `2df303f4-a331-494f-aa92-a696b176c6ad`.

Second prompt clarified the inanimate electronics subject:

> Photographic retouch of the supplied tabletop photograph of a student-built electronics headband. This is an inanimate fabric headband with two colored electrical connectors and white signal cables, with no person present. Preserve the photographed object exactly: same soft oval black fabric band, red and yellow connectors, tape, plastic fasteners, white cable positions and loops, and original camera angle. Only improve lighting and backdrop: replace the gray tabletop with a matte charcoal tabletop, use soft upper-left studio light, reduce flash glare, retain real fabric texture and handmade imperfections. A realistic editorial engineering-product photo, not a render. Landscape 3:2 framing with all originally visible parts retained. Do not add, remove or move components, alter cable paths, change colors or add text. No people, no body parts. Match understated warm-neutral illumination and charcoal shadows.

Second output rejection request ID: `7113c2d6-198e-48a0-9ad8-67145b7ae26f`.
