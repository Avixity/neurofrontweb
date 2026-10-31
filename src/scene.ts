import * as THREE from 'three';
import { buildDevice } from './model';
import type { ComponentKey } from './components';
import type { StoryState } from './story';

type Options = { mobile: boolean; reducedMotion: boolean; onFailure: () => void; onSelect: (part: ComponentKey) => void; onExpand: () => void };
export interface DeviceScene {
  setStory(state: StoryState, instant?: boolean): void;
  select(part: ComponentKey | null): void;
  setPaused(value: boolean): void;
  setVisible(value: boolean): void;
  setExpanded(value: boolean): void;
  resize(width: number, height: number, mobile: boolean): void;
  setIntro(progress: number): void;
  projectLogo(): { x: number; y: number }[];
  capturePart(part: ComponentKey): string;
  dispose(): void;
}

export async function createDeviceScene(host: HTMLElement, options: Options): Promise<DeviceScene> {
  let mobile = options.mobile;
  let pixelRatio = Math.min(devicePixelRatio, mobile ? .85 : 1.25);
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  host.dataset.quality = mobile ? 'mobile' : 'desktop';
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  world.add(new THREE.HemisphereLight('#ecf1e9', '#293b32', 1.7));
  const key = new THREE.DirectionalLight('#fff3dd', 3);
  key.position.set(-3, 7, 5); key.castShadow = !mobile;
  key.shadow.mapSize.setScalar(1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6 });
  key.shadow.normalBias = .035; key.shadow.bias = -.0002;
  world.add(key);
  const fill = new THREE.DirectionalLight('#c9e2d8', 2.2);
  fill.position.set(2, 3, 7); world.add(fill);
  const device = buildDevice({ mobile });
  world.add(device.group);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const context = shadowCanvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0,0,0,.5)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 4.5), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.04; world.add(ground);
  let logoTexture: THREE.Texture;
  try {
    logoTexture = await new THREE.TextureLoader().loadAsync('/assets/logo-traced.svg');
  } catch (error) {
    device.dispose(); ground.geometry.dispose(); (ground.material as THREE.Material).dispose(); shadowTexture.dispose(); key.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    throw error;
  }
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  const logoMaterial = device.logo.material as THREE.MeshBasicMaterial;
  logoMaterial.map = logoTexture; logoMaterial.needsUpdate = true;

  const current = { open: 0, explode: 0, sensor: 0, dock: 0, yaw: 0, pitch: 0, viewer: 0 };
  const target = { ...current };
  let selection: ComponentKey | null = null;
  let paused = options.reducedMotion, visible = true, expanded = false, disposed = false;
  let dirty = true, frame = 0, frames = 0, lastTime = 0, width = 1, height = 1, intro = 1, initialized = false;
  let selectionDirty = true;
  const labels = [...document.querySelectorAll<HTMLElement>('.model-label')];
  const point = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const orbitDirection = new THREE.Vector3();
  const samples: { gap: number; cost: number }[] = [];
  const inspection = new URLSearchParams(location.search).has('inspect');
  let qualityChanges = 0;
  const keys: ComponentKey[] = ['ad8232', 'esp32', 'gsr', 'temperature', 'battery', 'charger'];
  const proxies: THREE.Mesh[] = [];
  device.group.updateMatrixWorld(true);
  keys.forEach(part => {
    const group = device.parts[part];
    const box = new THREE.Box3().setFromObject(group);
    const center = group.worldToLocal(box.getCenter(new THREE.Vector3()));
    const size = box.getSize(new THREE.Vector3());
    size.set(Math.max(.2, size.x), Math.max(.16, size.y), Math.max(.2, size.z));
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(size.x * 1.12, size.y * 1.12, size.z * 1.12), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.copy(center); proxy.userData.partKey = part; group.add(proxy); proxies.push(proxy);
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function schedule() {
    if (initialized && !frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function invalidate() { dirty = true; schedule(); }
  function positionCamera() {
    cameraTarget.set(current.open * .22 + current.dock * .4, .3 + current.explode * .30, 0);
    cameraDirection.set(5.4, 7.3 + current.open * 1.2, 9.4 - current.sensor * .5);
    cameraDirection.multiplyScalar(Math.max(.92, 1.04 / camera.aspect));
    if (mobile) cameraDirection.multiplyScalar(.8 - current.viewer * .16 + current.explode * .08);
    cameraDirection.multiplyScalar(1 - current.dock * (mobile ? .25 : .30));
    cameraDirection.multiplyScalar(.78 + intro * .22);
    if (current.viewer > 0) {
      const radius = cameraDirection.length();
      const phi = THREE.MathUtils.clamp(.8 + current.pitch, .22, 1.42);
      orbitDirection.setFromSphericalCoords(radius, phi, .52 + current.yaw);
      cameraDirection.lerp(orbitDirection, current.viewer);
    }
    camera.position.copy(cameraTarget).add(cameraDirection); camera.lookAt(cameraTarget);
  }
  function updateLabels() {
    const showLabels = intro === 1 && current.explode > .6 && current.dock < .15 && !expanded;
    device.group.updateMatrixWorld(true);
    labels.forEach(label => {
      const name = label.dataset.part as ComponentKey;
      const show = showLabels && (selection ? selection === name : !mobile && !['gsr', 'temperature'].includes(name));
      label.style.opacity = show ? '1' : '0';
      if (!show) return;
      device.parts[name].getWorldPosition(point); point.y += .2; point.project(camera);
      const offset = name === 'battery' ? -50 : name === 'ad8232' ? -40 : 35;
      const x = THREE.MathUtils.clamp((point.x * .5 + .5) * width + (selection ? 0 : offset), 75, width - 75);
      const y = THREE.MathUtils.clamp((-point.y * .5 + .5) * height - (name === 'battery' ? 35 : 20), 45, height - 65);
      label.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
    });
  }
  function updateDevice() {
    device.animate(current.open, current.explode, selection || '');
    device.group.rotation.y = -.12 + current.open * .13 - current.sensor * .12;
    positionCamera(); updateLabels(); selectionDirty = false;
    host.dataset.open = current.open.toFixed(2); host.dataset.explode = current.explode.toFixed(2);
    host.dataset.sensor = selection || ''; host.dataset.dock = current.dock.toFixed(2);
  }
  function draw() {
    renderer.render(world, camera);
    host.dataset.frames = String(++frames);
    host.dataset.drawCalls = String(renderer.info.render.calls);
    host.dataset.triangles = String(renderer.info.render.triangles);
    host.dataset.pixelRatio = pixelRatio.toFixed(2);
    host.dataset.shadowMap = String(renderer.shadowMap.enabled);
    dirty = false;
  }
  function tick(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) { lastTime = 0; return; }
    const gap = lastTime ? time - lastTime : 16;
    const alpha = paused ? 1 : 1 - Math.exp(-Math.min(gap, 50) / 70);
    let moving = false, changed = false;
    for (const key of Object.keys(target) as (keyof typeof target)[]) {
      const delta = target[key] - current[key];
      changed ||= delta !== 0;
      if (Math.abs(delta) > .0008) { current[key] += delta * alpha; moving = true; }
      else current[key] = target[key];
    }
    if (changed || selectionDirty) { updateDevice(); dirty = true; }
    if (dirty) {
      const start = performance.now(); draw();
      if (mobile && moving && frames > 20 && gap < 150 && qualityChanges < 3) samples.push({ gap, cost: performance.now() - start });
      if (samples.length >= 60 && qualityChanges < 3) {
        const gaps = samples.map(s => s.gap).sort((a, b) => a - b);
        const meanCost = samples.reduce((sum, s) => sum + s.cost, 0) / samples.length;
        const next = gaps[45] > 26 || meanCost > 14 ? Math.max(.65, pixelRatio - .15) : gaps[45] < 19 && meanCost < 5 ? Math.min(1, devicePixelRatio, pixelRatio + .1) : pixelRatio;
        host.dataset.measuredFrameP75 = gaps[45].toFixed(1);
        host.dataset.measuredRenderMs = meanCost.toFixed(1);
        if (Math.abs(next - pixelRatio) > .01) { pixelRatio = next; renderer.setPixelRatio(pixelRatio); dirty = true; qualityChanges++; }
        samples.length = 0;
      }
    }
    lastTime = moving ? time : 0;
    if (inspection && !moving) {
      host.dataset.pickPoints = JSON.stringify(Object.fromEntries(proxies.map(proxy => {
        proxy.getWorldPosition(point); point.project(camera);
        return [proxy.userData.partKey, { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 }];
      })));
    }
    if (moving || dirty) schedule();
  }
  function resize(w: number, h: number, isMobile: boolean) {
    width = Math.round(w); height = Math.round(h); mobile = isMobile;
    renderer.shadowMap.enabled = !mobile; key.castShadow = !mobile;
    if (mobile && pixelRatio > 1) { pixelRatio = .85; renderer.setPixelRatio(pixelRatio); }
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    positionCamera(); updateLabels(); invalidate();
  }
  let down: { x: number; y: number; scroll: number; pointer: number; moved: boolean } | null = null;
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    down = { x: event.clientX, y: event.clientY, scroll: scrollY, pointer: event.pointerId, moved: false };
    if (expanded) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!down || down.pointer !== event.pointerId) return;
    const dx = event.clientX - down.x, dy = event.clientY - down.y;
    if (Math.hypot(dx, dy) > 9) down.moved = true;
    if (expanded && down.moved) {
      target.yaw += dx * .008; target.pitch = THREE.MathUtils.clamp(target.pitch + dy * .006, -.55, .6);
      down.x = event.clientX; down.y = event.clientY; invalidate();
    }
  });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointerup', event => {
    if (!down) return;
    const tap = !down.moved && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 9 && Math.abs(scrollY - down.scroll) < 8;
    down = null;
    if (!tap) return;
    if (current.dock > .95 && !expanded) { options.onExpand(); return; }
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    const allowed = proxies.filter(p => current.open > .55 || p.userData.partKey === 'temperature');
    const hit = raycaster.intersectObjects(allowed, false)[0];
    if (hit) options.onSelect(hit.object.userData.partKey as ComponentKey);
  });
  const onVisibility = () => {
    if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    else invalidate();
  };
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); dispose(); options.onFailure(); });

  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); frame = 0;
    document.removeEventListener('visibilitychange', onVisibility);
    proxies.forEach(p => { p.removeFromParent(); p.geometry.dispose(); (p.material as THREE.Material).dispose(); });
    device.dispose(); ground.geometry.dispose(); (ground.material as THREE.Material).dispose(); shadowTexture.dispose(); logoTexture.dispose(); key.shadow.dispose(); renderer.dispose();
  }
  resize(host.clientWidth, host.clientHeight, mobile); updateDevice();
  try {
    await renderer.compileAsync(world, camera);
    if (disposed) throw new Error('The graphics context was lost during preparation.');
    draw(); initialized = true;
  } catch (error) { dispose(); renderer.domElement.remove(); throw error; }
  host.dataset.ready = 'true';
  return {
    resize,
    setStory(next, instant = false) {
      if (Object.entries(next).every(([key, value]) => target[key as keyof StoryState] === value) && !instant) return;
      Object.assign(target, next);
      if (instant || paused) { Object.assign(current, target); updateDevice(); }
      invalidate();
    },
    select(part) { if (part === selection) return; selection = part; selectionDirty = true; invalidate(); },
    setPaused(value) { paused = value; if (value) { Object.assign(current, target); updateDevice(); } invalidate(); },
    setVisible(value) { visible = value; if (value) invalidate(); else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; } },
    setExpanded(value) { expanded = value; target.viewer = value ? 1 : 0; target.yaw = target.pitch = 0; canvas.style.touchAction = value ? 'none' : 'pan-y'; selectionDirty = true; invalidate(); },
    setIntro(value) { intro = value; device.logo.visible = value === 1; positionCamera(); dirty = true; schedule(); },
    projectLogo() {
      device.group.updateMatrixWorld(true); camera.updateMatrixWorld();
      const geometry = device.logo.geometry as THREE.PlaneGeometry;
      const w = geometry.parameters.width / 2, h = geometry.parameters.height / 2;
      return [[-w, h], [w, h], [w, -h], [-w, -h]].map(([x, y]) => {
        point.set(x, y, 0).applyMatrix4(device.logo.matrixWorld).project(camera);
        return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 };
      });
    },
    capturePart(part) {
      const priorPosition = camera.position.clone(), priorRotation = camera.quaternion.clone();
      const visibility = new Map<THREE.Object3D, boolean>();
      const selectedObjects = new Set<THREE.Object3D>();
      device.parts[part].traverse(object => selectedObjects.add(object));
      device.group.traverse(object => {
        if (object instanceof THREE.Mesh) { visibility.set(object, object.visible); object.visible = selectedObjects.has(object); }
      });
      ground.visible = false;
      const bounds = new THREE.Box3().setFromObject(device.parts[part]);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = Math.max(.7, bounds.getSize(new THREE.Vector3()).length());
      camera.position.copy(center).add(new THREE.Vector3(1.1, 1.8, 2).normalize().multiplyScalar(size * 2.4)); camera.lookAt(center);
      renderer.render(world, camera); const image = canvas.toDataURL('image/webp', .85);
      visibility.forEach((value, object) => object.visible = value); ground.visible = true;
      camera.position.copy(priorPosition); camera.quaternion.copy(priorRotation); draw(); return image;
    },
    dispose
  };
}
