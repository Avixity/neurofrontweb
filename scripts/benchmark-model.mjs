import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';

const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const reference = option('--ref');
const mobile = args.includes('--mobile');
const label = option('--label') || (reference ? 'before' : mobile ? 'mobile' : 'desktop');
const out = path.resolve('.work/bench');
fs.mkdirSync(out, { recursive: true });
const source = reference
  ? execFileSync('git', ['show', `${reference}:src/model.ts`], { encoding: 'utf8' })
  : fs.readFileSync('src/model.ts', 'utf8');
const modulePath = path.join(out, `${label}-module.mjs`);
fs.writeFileSync(modulePath, ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);

// Isolate construction/animation CPU work from browsers, fonts, image decoding and GPU work.
const context = {
  createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  putImageData() {}, clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {},
  moveTo() {}, lineTo() {}, stroke() {}, fillText() {},
};
globalThis.document = {
  createElement: () => ({ width: 128, height: 128, getContext: () => context }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(value) { this.url = value; } }),
};
const { buildDevice } = await import(pathToFileURL(modulePath).href);
const summarize = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.floor(sorted.length * 0.95)], mean: values.reduce((a, b) => a + b, 0) / values.length };
};
const cpuMilliseconds = start => {
  const elapsed = process.cpuUsage(start);
  return (elapsed.user + elapsed.system) / 1000;
};
const buildWall = [], buildCpu = [];
let device;
for (let i = 0; i < 6; i++) {
  globalThis.gc?.();
  const wall = performance.now(), cpu = process.cpuUsage();
  const candidate = buildDevice({ mobile });
  buildCpu.push(cpuMilliseconds(cpu));
  buildWall.push(performance.now() - wall);
  if (i === 5) device = candidate;
  else candidate.dispose();
}
const geometry = { meshes: 0, triangles: 0, instances: 0, vertices: 0 };
device.group.traverse(object => {
  if (!object.isMesh) return;
  geometry.meshes++;
  geometry.vertices += object.geometry.attributes.position.count;
  if (object.isInstancedMesh) geometry.instances += object.count;
  geometry.triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1);
});
const cases = {};
for (const name of ['moving', 'stationary', 'highlight']) {
  const count = name === 'moving' ? 600 : 5000;
  const update = i => {
    const progress = name === 'moving' ? ((i % 599) + 0.5) / 600 : 0.43;
    const highlight = name === 'highlight' ? ['ad8232', 'esp32', 'gsr', 'temperature', 'battery', 'charger'][i % 6] : 'electrical';
    device.animate(progress, progress, highlight);
  };
  for (let i = 0; i < 300; i++) update(i);
  globalThis.gc?.();
  const wallBatches = [], cpuBatches = [], samples = [];
  for (let batch = 0; batch < 6; batch++) {
    const start = performance.now(), cpu = process.cpuUsage();
    for (let i = 0; i < count; i++) {
      const before = performance.now();
      update(i + batch * count);
      samples.push(performance.now() - before);
    }
    cpuBatches.push(cpuMilliseconds(cpu) / count);
    wallBatches.push((performance.now() - start) / count);
  }
  cases[name] = { updates: count * 6, callWallMs: summarize(samples), batchWallMsPerUpdate: summarize(wallBatches), batchCpuMsPerUpdate: summarize(cpuBatches) };
}
const runtimeCalls = { frenet: 0, bounds: 0, normals: 0 };
const originals = [];
for (const [object, method, key] of [
  [THREE.Curve.prototype, 'computeFrenetFrames', 'frenet'],
  [THREE.BufferGeometry.prototype, 'computeBoundingSphere', 'bounds'],
  [THREE.BufferGeometry.prototype, 'computeBoundingBox', 'bounds'],
  [THREE.BufferGeometry.prototype, 'computeVertexNormals', 'normals'],
]) {
  const original = object[method];
  originals.push([object, method, original]);
  object[method] = function (...values) { runtimeCalls[key]++; return original.apply(this, values); };
}
for (let i = 0; i < 120; i++) device.animate(i / 120, i / 120, 'electrical');
originals.forEach(([object, method, original]) => { object[method] = original; });
device.dispose();
const result = {
  label, reference: reference || 'working-tree', mobile, node: process.version, cpu: os.cpus()[0].model,
  method: 'CPU-only Node test; stubbed canvas/image loading; 300 warm-up updates then six timed batches. CPU time excludes scheduler waiting. No rendering or FPS measurement.',
  buildWallMs: summarize(buildWall.slice(1)), buildCpuMs: summarize(buildCpu.slice(1)),
  geometry, cases, runtimeCallsIn120MovingUpdates: runtimeCalls,
};
fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
