import * as THREE from 'three';
import gsap from 'gsap';
import { buildDevice } from './model';

type StoryState = { open: number; explode: number; sensor: number };
type SceneOptions = { intro: boolean; reducedMotion: boolean; onIntroComplete: () => void; onFailure: () => void };
export interface DeviceScene {
  setStory: (state: StoryState) => void;
  setSensor: (sensor: string) => void;
  setView: (view: string, instant: boolean) => void;
  setPaused: (paused: boolean) => void;
}

export async function createDeviceScene(host: HTMLElement, options: SceneOptions): Promise<DeviceScene> {
  const image = new Image();
  image.src = '/assets/logo-white.png';
  await image.decode();
  const mobile = () => innerWidth <= 760;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.35 : 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  world.add(new THREE.HemisphereLight('#ecf1e9', '#293b32', 1.55));
  const key = new THREE.DirectionalLight('#fff3dd', 2.8);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(mobile() ? 512 : 1024);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.normalBias = .035; key.shadow.bias = -.0002;
  key.shadow.radius = 4;
  world.add(key);
  const rim = new THREE.DirectionalLight('#aed8cc', 2.4);
  rim.position.set(2, 4, -5); world.add(rim);
  const fill = new THREE.DirectionalLight('#dce3df', 2.1);
  fill.position.set(2, 3, 7); world.add(fill);

  const device = buildDevice();
  world.add(device.group);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .20 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.055; ground.receiveShadow = true;
  world.add(ground);

  const state = { open: 0, explode: 0, sensor: 0, focusX: .25, focusZoom: 1, pointerX: 0, pointerY: 0 };
  let selectedSensor = 'electrical';
  let paused = options.reducedMotion;
  let introActive = options.intro && scrollY < 15 && document.documentElement.classList.contains('intro-pending')
    && performance.now() < Number(document.documentElement.dataset.introDeadline || 0);
  let dirty = true;
  let visible = true;
  let disposed = false;
  let frames = 0;
  const target = new THREE.Vector3(0, .3, 0);
  const point = new THREE.Vector3();
  const labels = Array.from(document.querySelectorAll<HTMLElement>('.model-label'));
  const sceneWrap = host.parentElement!;
  const heroPosition = new THREE.Vector3(5.4, 7.3, 9.4);
  const openPosition = new THREE.Vector3(4.6, 8.4, 8.9);
  const sensorPosition = new THREE.Vector3(3.3, 7.3, 8.5);
  const smooth = (n: number) => n * n * (3 - 2 * n);
  const clamp = THREE.MathUtils.clamp;

  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.35 : 1.65));
    if (!introActive) { positionCamera(); updateLabels(); }
    dirty = true;
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  function positionCamera() {
    camera.position.copy(heroPosition).lerp(openPosition, state.open).lerp(sensorPosition, state.sensor);
    // A wider framing keeps the whole wired assembly visible on a portrait screen.
    const aspectScale = Math.max(1, 1.04 / camera.aspect);
    camera.position.multiplyScalar(mobile() ? Math.max(.88, aspectScale * .87) : aspectScale);
    camera.position.multiplyScalar(THREE.MathUtils.lerp(1, state.focusZoom, state.sensor));
    target.set(state.sensor * state.focusX + state.open * .22, .3 + state.explode * .30, 0);
    camera.position.x += state.pointerX * .35;
    camera.position.z += state.pointerY * .25;
    camera.lookAt(target);
  }
  function updateLabels() {
    if (introActive) { labels.forEach(label => label.style.opacity = '0'); return; }
    device.group.updateMatrixWorld(true);
    const width = host.clientWidth, height = host.clientHeight;
    labels.forEach(label => {
      const part = device.parts[label.dataset.part!];
      if (!part) return;
      const isSignal = state.sensor > .5;
      const show = state.explode > .25 && state.open > .75 && (isSignal
        ? label.dataset.part === (selectedSensor === 'electrical' ? 'ad8232' : selectedSensor === 'eda' ? 'gsr' : 'temperature')
        : !['gsr', 'temperature'].includes(label.dataset.part!));
      part.getWorldPosition(point);
      point.y += .22;
      point.project(camera);
      const x = (point.x * .5 + .5) * width;
      const y = (-point.y * .5 + .5) * height - 28;
      const offset = label.dataset.part === 'ad8232' ? -30 : label.dataset.part === 'esp32' ? 34 : label.dataset.part === 'battery' ? -27 : 25;
      const safeX = clamp(x + offset, 65, width - 65);
      label.style.transform = `translate(${safeX.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      label.style.opacity = show && point.z < 1 && y > 20 && y < height - 50 ? '1' : '0';
    });
  }
  function updateDevice() {
    device.animate(state.open, state.explode, state.sensor > .3 ? selectedSensor : '');
    device.group.rotation.y = -.12 + state.open * .13 - state.sensor * .18;
    positionCamera();
    updateLabels();
    host.dataset.open = state.open.toFixed(2);
    host.dataset.explode = state.explode.toFixed(2);
    host.dataset.sensor = selectedSensor;
    dirty = true;
  }
  function render() {
    if (!visible || document.hidden || !dirty || disposed) return;
    renderer.render(world, camera);
    host.dataset.drawCalls = String(renderer.info.render.calls);
    host.dataset.triangles = String(renderer.info.render.triangles);
    host.dataset.frames = String(++frames);
    dirty = false;
  }
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !document.hidden) { dirty = true; renderer.setAnimationLoop(render); }
    else renderer.setAnimationLoop(null);
  });
  visibilityObserver.observe(document.querySelector('#device-story')!);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else if (visible) { dirty = true; renderer.setAnimationLoop(render); }
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    introTween?.kill();
    gsap.killTweensOf(state);
    finishIntro();
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    options.onFailure();
  });
  document.querySelector('#device-story')!.addEventListener('pointermove', event => {
    if (paused || introActive || mobile() || (event as PointerEvent).pointerType === 'touch') return;
    const mouse = event as PointerEvent;
    gsap.to(state, { pointerX: (mouse.clientX / innerWidth - .5), pointerY: (mouse.clientY / innerHeight - .5), duration: .75, overwrite: 'auto', onUpdate: updateDevice });
  });
  document.querySelector('#device-story')!.addEventListener('pointerleave', () => {
    if (!paused && !introActive) gsap.to(state, { pointerX: 0, pointerY: 0, duration: .8, overwrite: 'auto', onUpdate: updateDevice });
  });

  let introTween: gsap.core.Tween | undefined;
  let finishIntro = () => {};
  if (introActive) {
    document.body.classList.add('intro-active');
    document.documentElement.classList.remove('intro-pending');
    const skip = document.querySelector<HTMLButtonElement>('#skip-intro')!;
    skip.hidden = false;
    const drawCanvas = document.createElement('canvas');
    drawCanvas.width = image.naturalWidth; drawCanvas.height = image.naturalHeight;
    const ctx = drawCanvas.getContext('2d')!;
    const introTexture = new THREE.CanvasTexture(drawCanvas);
    introTexture.colorSpace = THREE.SRGBColorSpace;
    const logoWidth = 2.05;
    const introLogo = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, logoWidth * image.naturalHeight / image.naturalWidth), new THREE.MeshBasicMaterial({ map: introTexture, transparent: true, depthTest: false, toneMapped: false }));
    introLogo.renderOrder = 10;
    world.add(introLogo);
    device.logo.visible = false;
    const originalMaterials = new Map<THREE.Material, { opacity: number; transparent: boolean }>();
    device.group.traverse(object => {
      if (object instanceof THREE.Mesh) {
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
          if (!originalMaterials.has(material)) originalMaterials.set(material, { opacity: material.opacity, transparent: material.transparent });
          material.transparent = true; material.opacity = 0;
        });
      }
    });
    const startRotation = new THREE.Quaternion();
    const finalRotation = new THREE.Quaternion();
    const finalPosition = new THREE.Vector3();
    const finalScale = new THREE.Vector3();
    device.group.rotation.y = -.12;
    device.group.updateMatrixWorld(true);
    device.logo.matrixWorld.decompose(finalPosition, finalRotation, finalScale);
    const localWidth = (device.logo.geometry as THREE.PlaneGeometry).parameters.width;
    const finalLogoScale = localWidth / logoWidth;
    const counter = { value: .25 };
    const introStarted = performance.now();
    let introDeadline: ReturnType<typeof setTimeout>;
    finishIntro = () => {
      if (!introActive) return;
      introTween?.kill();
      clearTimeout(introDeadline);
      originalMaterials.forEach((original, material) => { material.opacity = original.opacity; material.transparent = original.transparent; material.needsUpdate = true; });
      device.logo.visible = true;
      world.remove(introLogo); introLogo.geometry.dispose(); introLogo.material.dispose(); introTexture.dispose();
      document.body.classList.remove('intro-active');
      sceneWrap.style.left = ''; sceneWrap.style.width = ''; sceneWrap.style.top = ''; sceneWrap.style.height = '';
      skip.hidden = true; introActive = false;
      camera.clearViewOffset();
      resize(); updateDevice();
      if (!options.reducedMotion) gsap.fromTo(['.hero-copy', '.hero-bottom', '.site-header'], { opacity: .1, y: 7 }, { opacity: 1, y: 0, duration: .45, clearProps: 'opacity,transform', stagger: .05 });
      options.onIntroComplete();
    };
    skip.addEventListener('click', finishIntro, { once: true });
    const stopOnScroll = () => { if (scrollY > 30) finishIntro(); };
    window.addEventListener('scroll', stopOnScroll, { passive: true });
    introTween = gsap.to(counter, {
      value: 1, duration: 1.8, ease: 'none',
      onUpdate() {
        const t = .25 + .75 * Math.min(1, (performance.now() - introStarted) / 1800);
        const progress = smooth(clamp((t - .22) / .78, 0, 1));
        const stroke = clamp(t / .25, 0, 1);
        const letters = clamp((t - .08) / .2, 0, 1);
        const width = drawCanvas.width, height = drawCanvas.height, divide = Math.round(height * .69);
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        const revealWidth = Math.max(1, width * stroke);
        ctx.drawImage(image, 0, divide, revealWidth, height - divide, 0, divide, revealWidth, height - divide);
        ctx.globalAlpha = letters;
        ctx.drawImage(image, 0, 0, width, divide, 0, 0, width, divide);
        introTexture.needsUpdate = true;
        const surface = smooth(clamp((t - .3) / .43, 0, 1));
        originalMaterials.forEach((original, material) => material.opacity = original.opacity * surface);
        const layout = smooth(clamp((t - .34) / .66, 0, 1));
        const copyBottom = document.querySelector('.hero-copy')!.getBoundingClientRect().bottom;
        const viewportWidth = mobile() ? innerWidth : innerWidth * (1 - layout * .36);
        const viewportHeight = mobile() ? THREE.MathUtils.lerp(innerHeight, 390, layout) : innerHeight;
        const viewportLeft = mobile() ? 0 : innerWidth * layout * .36;
        const viewportTop = mobile() ? layout * Math.max(80, copyBottom + 15) : 0;
        // Shift the projection inside one full-size canvas; resizing the drawing buffer each frame is expensive.
        camera.setViewOffset(viewportWidth, viewportHeight, -viewportLeft, -viewportTop, host.clientWidth, host.clientHeight);
        const finalCamera = heroPosition.clone();
        const aspectScale = Math.max(1, 1.04 / camera.aspect);
        finalCamera.multiplyScalar(mobile() ? Math.max(.88, aspectScale * .87) : aspectScale);
        camera.position.set(0, 0, 9).lerp(finalCamera, progress);
        target.set(0, .3 * progress, 0);
        camera.lookAt(target);
        introLogo.position.set(0, 0, 0).lerp(finalPosition, progress);
        introLogo.quaternion.copy(startRotation).slerp(finalRotation, progress);
        const initialScale = (2 * 9 * Math.tan(THREE.MathUtils.degToRad(34 / 2)) * (innerWidth / innerHeight) * (mobile() ? .7 : .36)) / logoWidth;
        introLogo.scale.setScalar(THREE.MathUtils.lerp(initialScale, finalLogoScale, progress));
        dirty = true;
        if (t >= 1) finishIntro();
      },
      onComplete: finishIntro
    });
    introDeadline = setTimeout(finishIntro, 1900);
  } else { document.documentElement.classList.remove('intro-pending'); updateDevice(); options.onIntroComplete(); }

  document.body.classList.add('has-3d');
  renderer.setAnimationLoop(render);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true; renderer.setAnimationLoop(null); resizeObserver.disconnect(); visibilityObserver.disconnect();
    device.dispose(); ground.geometry.dispose(); (ground.material as THREE.Material).dispose(); renderer.dispose();
  });
  return {
    setStory(next) {
      if (introActive || paused) return;
      gsap.to(state, { ...next, duration: .35, ease: 'power2.out', overwrite: 'auto', onUpdate: updateDevice });
    },
    setSensor(sensor) {
      selectedSensor = sensor === 'thermal' ? 'temperature' : sensor;
      const focus = { focusX: sensor === 'thermal' ? -1.35 : sensor === 'eda' ? .9 : .25, focusZoom: sensor === 'thermal' ? .9 : 1 };
      if (!introActive) {
        if (paused) { state.sensor = 1; Object.assign(state, focus); updateDevice(); }
        else gsap.to(state, { ...focus, duration: .65, ease: 'power2.inOut', overwrite: 'auto', onUpdate: updateDevice });
      }
    },
    setView(view, instant) {
      finishIntro();
      const next = { open: view === 'assembled' ? 0 : 1, explode: view === 'exploded' ? 1 : 0, sensor: 0 };
      gsap.killTweensOf(state);
      if (instant) { Object.assign(state, next); updateDevice(); }
      else gsap.to(state, { ...next, duration: .85, ease: 'power2.inOut', onUpdate: updateDevice });
    },
    setPaused(value) {
      paused = value;
      if (value) { finishIntro(); gsap.killTweensOf(state); state.pointerX = state.pointerY = 0; updateDevice(); }
    }
  };
}
