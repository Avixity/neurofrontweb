# Model animation CPU measurements

The original implementation recalculated ten flexible wires' curve frames and bounds whenever explosion progress changed. The revised model prepares wire positions and normals at construction, interpolates those buffers during animation, and updates highlights only when selection changes.

The benchmark ran on this workspace's Intel Core i3-1005G1 host using Node.js v22.17.0. It uses real Three.js geometry with stubbed canvas and image loading. It measures model construction and `animate()` CPU work; it does **not** measure browser rendering, GPU cost, page frame rate, image loading, or mobile-device performance.

Each moving case performs 300 warm-up calls, followed by six batches of 600 changing explosion updates. The original source is read from commit `d819d56`. Complete results are in [model-benchmark-results.json](model-benchmark-results.json).

| Measurement | Original | Revised desktop | Revised mobile quality |
| --- | ---: | ---: | ---: |
| Median batch CPU time per moving update | 1.353 ms | 0.052 ms | 0.027 ms |
| Median individual update wall time | 1.219 ms | 0.043 ms | 0.020 ms |
| 95th-percentile update wall time | 2.169 ms | 0.097 ms | 0.045 ms |
| Median model construction wall time | 135.2 ms | 121.5 ms | 90.4 ms |
| Triangles, including repeated instances | 38,282 | 38,314 | 16,234 |
| Frenet-frame calculations in 120 moving updates | 1,200 | 0 | 0 |
| Bounds recalculations in 120 moving updates | 2,400 | 0 | 0 |

The desktop moving-update CPU result improved by approximately 26 times in this run. Mobile quality uses 57.6% fewer triangles than desktop while retaining all six selectable components and the wired construction. Construction timings are warmed local measurements, not a first-load guarantee.

An earlier run with other workspace activity showed much higher wall-clock timings. The final comparison includes process CPU time to reduce scheduler-wait effects; shared-host contention, JIT compilation, garbage collection and the coarse CPU timer still affect results. Stationary/highlight-only CPU batches sometimes fall below that timer's resolution; a reported zero in the raw JSON means unmeasurably small at this resolution, not literally zero CPU work.

Run the same comparison from the repository root:

```powershell
node --expose-gc scripts/benchmark-model.mjs --ref d819d56 --label before
node --expose-gc scripts/benchmark-model.mjs --label desktop
node --expose-gc scripts/benchmark-model.mjs --mobile --label mobile
```

Results and temporary transpiled modules are written to `.work/bench/`. The benchmark does not modify application source.
