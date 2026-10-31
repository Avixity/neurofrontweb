import { initGraphs } from './signals';
import { components, type ComponentKey } from './components';
import { initOpening } from './opening';
import { storyAt, poseAt, smooth, type StoryLayout, type StoryState } from './story';
import type { DeviceScene } from './scene';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const graphs = initGraphs();
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const stage = $('#product-stage'), wrap = $('.scene-wrap'), host = $('#scene');
document.body.append(stage);
const story = $('#device-story'), inside = $('#inside'), signals = $('#signals'), exit = $('#story-exit');
const heroFooter = $('.hero-bottom');
const motionButton = $<HTMLButtonElement>('.motion-toggle');
const graphMotionButton = $<HTMLButtonElement>('.graph-motion-toggle');
const menuButton = $<HTMLButtonElement>('.menu-toggle'), mobileNav = $('#mobile-nav');
const dockButton = $<HTMLButtonElement>('#dock-toggle'), viewer = $('#device-viewer');
const panel = $('#component-panel');
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
const partButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-component]')];
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-sensor]')];
let scene: DeviceScene | undefined;
let paused = motionPreference.matches, expanded = false, mobile = innerWidth <= 760;
let manualView = '', selected: ComponentKey | null = null, lastScroll = scrollY;
let activeSensor = 'electrical';
let panelOrigin: HTMLElement | null = null, viewerOrigin: HTMLElement | null = null;
let frame = 0, needsMeasure = true, stateDirty = true, lastTime = 0;
let sceneVisible = true, sceneResized = false;
let viewport = { width: innerWidth, height: innerHeight };
let layout: StoryLayout = { inside: 0, signals: 0, exit: 0, end: 1, height: innerHeight };
let base = { width: 1, height: 1 };
let panelBounds = { left: innerWidth, top: innerHeight, side: false };
let copyBounds: { top: number; bottom: number; right: number }[] = [];
let stageRect = { x: 0, y: 80, width: 1, height: 1, scale: 1 };
let targetRect = { ...stageRect };
let currentState: StoryState = { reveal: 0, sensor: 0, dock: 0 };
const opening = initOpening(() => stageRect, () => { stateDirty = true; schedule(); });

function closeMenu() {
  mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation');
}
menuButton.addEventListener('click', () => {
  mobileNav.hidden = !mobileNav.hidden;
  menuButton.setAttribute('aria-expanded', String(!mobileNav.hidden));
  menuButton.setAttribute('aria-label', mobileNav.hidden ? 'Open navigation' : 'Close navigation');
});
mobileNav.addEventListener('click', e => { if ((e.target as HTMLElement).closest('a')) closeMenu(); });
document.addEventListener('click', e => { if (!mobileNav.hidden && !(e.target as Element).closest('.site-header')) closeMenu(); });

function setPaused(value: boolean) {
  paused = value; document.body.classList.toggle('motion-paused', value);
  motionButton.setAttribute('aria-pressed', String(value)); motionButton.textContent = value ? 'Resume motion' : 'Pause motion';
  graphMotionButton.setAttribute('aria-pressed', String(value)); graphMotionButton.textContent = motionButton.textContent;
  if (value) opening.skip();
  graphs.setPaused(value || expanded || !panel.hidden); scene?.setPaused(value); stateDirty = true; schedule();
}
motionButton.addEventListener('click', () => setPaused(!paused));
graphMotionButton.addEventListener('click', () => setPaused(!paused));
motionPreference.addEventListener('change', e => setPaused(e.matches));

function syncSensor(sensor: string) {
  activeSensor = sensor;
  tabs.forEach(tab => {
    const active = tab.dataset.sensor === sensor;
    tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')!)!.hidden = !active;
  });
}
function selectSensor(sensor: string) {
  syncSensor(sensor);
  const part: ComponentKey = sensor === 'thermal' ? 'temperature' : sensor === 'eda' ? 'gsr' : 'ad8232';
  scene?.select(part); selected = part;
  if (!panel.hidden) showComponent(part, false);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSensor(tab.dataset.sensor!));
  tab.addEventListener('keydown', e => {
    const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault(); selectSensor(tabs[next].dataset.sensor!); tabs[next].focus();
  });
});

function showComponent(part: ComponentKey, focus = true) {
  opening.skip();
  if (panel.hidden) panelOrigin = document.activeElement as HTMLElement;
  selected = part;
  const data = components[part];
  if (data.sensor) syncSensor(data.sensor);
  scene?.select(part);
  manualView = 'exploded'; stateDirty = true; schedule();
  $('#component-name').textContent = data.name;
  $('#component-description').textContent = data.description;
  const image = $<HTMLImageElement>('#component-image');
  if (data.image) {
    image.src = `/assets/components/${data.image}`; image.alt = `Reference photograph of ${data.name}`;
    $('#component-image-caption').textContent = 'Component reference photograph';
  } else if (scene) {
    image.src = scene.capturePart(part); image.alt = `Illustrative model close-up of ${data.name}`;
    $('#component-image-caption').textContent = 'Illustrative model close-up, not a photograph';
  } else {
    image.src = '/assets/prototype-1.webp'; image.alt = 'The real controller enclosure with its battery and charging electronics';
    $('#component-image-caption').textContent = 'The actual controller interior';
  }
  panel.hidden = false;
  document.body.classList.add('component-open');
  graphs.setPaused(true);
  needsMeasure = true; schedule();
  partButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.component === part)));
  if (focus) $('#close-component').focus({ preventScroll: true });
}
function closeComponent(restore = true) {
  panel.hidden = true; selected = null; scene?.select(null);
  document.body.classList.remove('component-open');
  graphs.setPaused(paused || expanded);
  needsMeasure = true; stateDirty = true; schedule();
  partButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  if (restore && panelOrigin?.isConnected && !panelOrigin.closest('[hidden]')) panelOrigin.focus({ preventScroll: true });
}
partButtons.forEach(button => button.addEventListener('click', () => showComponent(button.dataset.component as ComponentKey)));
$('#close-component').addEventListener('click', () => closeComponent());
viewButtons.forEach(button => button.addEventListener('click', () => {
  opening.skip(); manualView = button.dataset.view!; stateDirty = true; schedule();
}));

function openViewer() {
  if (!scene || expanded) return;
  opening.skip(); viewerOrigin = document.activeElement as HTMLElement; expanded = true;
  closeMenu(); closeComponent(false); manualView = 'open'; viewer.hidden = false;
  viewer.append(stage);
  document.body.classList.add('viewer-open'); document.body.style.overflow = 'hidden';
  ['main', '.site-header', 'footer'].forEach(selector => $(selector).inert = true);
  scene.setExpanded(true); stateDirty = true; schedule(); $('#close-viewer').focus({ preventScroll: true });
  graphs.setPaused(true);
  dockButton.setAttribute('aria-expanded', 'true');
}
function closeViewer() {
  if (!expanded) return;
  expanded = false; document.body.append(stage); viewer.hidden = true; closeComponent(false); manualView = '';
  document.body.classList.remove('viewer-open'); document.body.style.overflow = '';
  ['main', '.site-header', 'footer'].forEach(selector => $(selector).inert = false);
  scene?.setExpanded(false); stateDirty = true; schedule();
  graphs.setPaused(paused);
  dockButton.setAttribute('aria-expanded', 'false');
  requestAnimationFrame(() => (viewerOrigin?.isConnected ? viewerOrigin : dockButton).focus({ preventScroll: true }));
}
dockButton.addEventListener('click', openViewer);
$('#close-viewer').addEventListener('click', closeViewer);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!panel.hidden) closeComponent(); else if (expanded) closeViewer(); else if (!mobileNav.hidden) { closeMenu(); menuButton.focus(); }
  }
  if (expanded && event.key === 'Tab') {
    const controls = [...document.querySelectorAll<HTMLButtonElement>('#device-viewer button, #component-panel button')].filter(el => !el.disabled && !el.closest('[hidden]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible');
    const first = controls[0], last = controls.at(-1)!;
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLButtonElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(update); }
function measure() {
  const y = scrollY;
  viewport = { width: innerWidth, height: innerHeight };
  mobile = innerWidth <= 760 || matchMedia('(pointer: coarse)').matches;
  const insideRect = inside.getBoundingClientRect(), signalRect = signals.getBoundingClientRect();
  const exitRect = exit.getBoundingClientRect(), storyRect = story.getBoundingClientRect();
  layout = { inside: insideRect.top + y, signals: signalRect.top + y, exit: exitRect.top + y, end: storyRect.bottom + y, height: innerHeight };
  const height = mobile ? Math.min(280, innerHeight * .36) : Math.min(innerHeight * .86, 850);
  const nextBase = { width: mobile ? Math.min(innerWidth, height * 2.2) : Math.min(innerWidth * .64, 1100), height };
  const bounds = panel.hidden ? null : panel.getBoundingClientRect();
  panelBounds = bounds ? { left: bounds.left, top: bounds.top, side: bounds.width < innerWidth * .8 } : { left: innerWidth, top: innerHeight, side: false };
  copyBounds = [...story.querySelectorAll<HTMLElement>('.hero-copy, .section-copy')].map(element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + y, bottom: rect.bottom + y, right: rect.right };
  });
  needsMeasure = false;
  sceneResized = base.width !== nextBase.width || base.height !== nextBase.height;
  base = nextBase;
  if (sceneResized) {
    document.documentElement.style.setProperty('--stage-height', `${base.height}px`);
    wrap.style.width = `${base.width}px`; wrap.style.height = `${base.height}px`;
    scene?.resize(base.width, base.height, mobile);
  }
  if (!mobile) closeMenu();
  host.dataset.layoutReads = String(Number(host.dataset.layoutReads || 0) + 1);
}
function update(time: number) {
  frame = 0;
  if (document.hidden) return;
  if (needsMeasure) { measure(); stateDirty = true; }
  const y = scrollY;
  currentState = storyAt(y, layout);
  if (expanded) currentState = { reveal: .59, sensor: 0, dock: 0 };
  if (manualView) {
    currentState.reveal = manualView === 'assembled' ? .26 : manualView === 'exploded' ? 1 : .59;
    currentState.sensor = 0;
  }
  const dock = expanded ? 0 : currentState.dock;
  const dockWidth = mobile ? 104 : 166, scale = 1 + (dockWidth / base.width - 1) * dock;
  const dockActionWidth = mobile ? 128 : 144;
  const dockCanvasHeight = base.height * dockWidth / base.width;
  const x = mobile ? (viewport.width - base.width) / 2 : viewport.width - base.width;
  const top = mobile ? Math.max(76, 100 - y) : (viewport.height - base.height) / 2;
  const dockX = viewport.width - 16 - (dockActionWidth + dockWidth) / 2;
  const dockY = viewport.height - 66 - dockCanvasHeight / 2 - dockWidth * .25;
  targetRect = { x: x + (dockX - x) * dock, y: top + (dockY - top) * dock, scale, width: base.width, height: base.height };
  if (expanded) {
    const viewerScale = mobile ? .98 : Math.min(1, viewport.width * .68 / base.width);
    const viewerTop = mobile ? viewport.height < 500 ? 120 : Math.max(180, (viewport.height - base.height) / 2 - 20) : 110;
    targetRect = { x: (viewport.width - base.width * viewerScale) / 2, y: viewerTop, width: base.width, height: base.height, scale: viewerScale };
  }
  if (!panel.hidden && dock < .05) {
    if (panelBounds.side) {
      const copyRight = expanded || viewport.width <= 760 || viewport.height <= 500 ? 0 : Math.max(0, ...copyBounds.filter(bounds => bounds.top < y + viewport.height && bounds.bottom > y + 80).map(bounds => bounds.right));
      const availableLeft = copyRight + 24;
      const availableWidth = Math.max(120, panelBounds.left - availableLeft - 16);
      targetRect.scale = Math.min(targetRect.scale, availableWidth / base.width, (viewport.height - 116) / base.height);
      targetRect.x = availableLeft + (availableWidth - base.width * targetRect.scale) / 2;
      targetRect.y = Math.max(76, (viewport.height - base.height * targetRect.scale) / 2);
    } else {
      const minimumTop = expanded ? 180 : 76;
      const availableHeight = Math.max(90, panelBounds.top - minimumTop - 12);
      targetRect.scale = Math.min(targetRect.scale, availableHeight / base.height);
      targetRect.y = Math.min(targetRect.y, panelBounds.top - base.height * targetRect.scale - 12);
      targetRect.x = mobile || expanded ? (viewport.width - base.width * targetRect.scale) / 2 : viewport.width - base.width * targetRect.scale - 24;
    }
  }
  const alpha = paused || sceneResized ? 1 : 1 - Math.exp(-Math.min(lastTime ? time - lastTime : 16, 50) / 70);
  let moving = false;
  (['x', 'y', 'scale'] as const).forEach(key => {
    const diff = targetRect[key] - stageRect[key];
    if (Math.abs(diff) > (key === 'scale' ? .0002 : .15)) { stageRect[key] += diff * alpha; moving = true; }
    else stageRect[key] = targetRect[key];
  });
  stageRect.width = base.width; stageRect.height = base.height;
  wrap.style.transform = `translate3d(${stageRect.x.toFixed(2)}px,${stageRect.y.toFixed(2)}px,0) scale(${stageRect.scale.toFixed(5)})`;
  wrap.style.setProperty('--scene-scale', String(stageRect.scale));
  const footerOpacity = 1 - smooth(y / (viewport.height * .23));
  heroFooter.style.opacity = String(footerOpacity);
  heroFooter.style.visibility = footerOpacity < .01 ? 'hidden' : '';
  const docked = !expanded && dock > .98;
  document.body.classList.toggle('model-docked', docked);
  document.body.classList.toggle('model-docking', dock > .05 && !expanded);
  dockButton.hidden = !docked || document.body.dataset.sceneState !== 'ready';
  dockButton.style.width = `${dockActionWidth}px`;
  const visible = expanded || currentState.dock > 0 || y < layout.end;
  if (visible !== sceneVisible) { sceneVisible = visible; scene?.setVisible(visible); }
  if (stateDirty && !opening.active) {
    if (currentState.dock > .05 && !expanded && !panel.hidden) closeComponent(false);
    scene?.select(selected || (currentState.sensor > .5 ? activeSensor === 'thermal' ? 'temperature' : activeSensor === 'eda' ? 'gsr' : 'ad8232' : null));
    scene?.setStory(currentState, paused);
    const pose = poseAt(currentState.reveal);
    const view = pose.explode > .5 ? 'exploded' : pose.open > .5 ? 'open' : 'assembled';
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    if (document.body.dataset.sceneState === 'failed' || document.body.dataset.sceneState === 'static') {
      const image = $<HTMLImageElement>('.scene-fallback img');
      const file = y > layout.signals - 200 ? 2 : y > layout.inside - 200 ? 1 : 4;
      if (!image.src.endsWith(`prototype-${file}.webp`)) image.src = `/assets/prototype-${file}.webp`;
      wrap.style.opacity = currentState.dock > 0 ? String(1 - currentState.dock) : '1';
    }
    stateDirty = false;
  }
  sceneResized = false; lastTime = moving ? time : 0;
  host.dataset.scrollUpdates = String(Number(host.dataset.scrollUpdates || 0) + 1);
  if (moving) schedule();
}
window.addEventListener('scroll', () => {
  if (!expanded && Math.abs(scrollY - lastScroll) > 4) manualView = '';
  lastScroll = scrollY; stateDirty = true; schedule();
}, { passive: true });
window.addEventListener('resize', () => { needsMeasure = true; schedule(); });
window.visualViewport?.addEventListener('resize', () => { needsMeasure = true; schedule(); });
const layoutObserver = new ResizeObserver(() => { needsMeasure = true; schedule(); });
[story, inside, signals, exit, panel, $('.hero-copy')].forEach(element => layoutObserver.observe(element));
document.fonts.ready.then(() => { needsMeasure = true; schedule(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; } else { stateDirty = true; schedule(); } });

function useFallback(state: 'failed' | 'static' = 'failed') {
  opening.skip(); closeViewer();
  scene = undefined;
  $('.scene-fallback').hidden = false;
  document.body.dataset.sceneState = state; document.body.classList.add('no-3d'); document.body.classList.remove('has-3d');
  stateDirty = true; schedule();
}
async function startScene() {
  if (new URLSearchParams(location.search).get('view') === 'static') { useFallback('static'); return; }
  try {
    const { createDeviceScene } = await import('./scene');
    scene = await createDeviceScene(host, { mobile, reducedMotion: paused, onFailure: () => useFallback(), onSelect: part => showComponent(part), onExpand: openViewer });
    document.body.dataset.sceneState = 'ready'; document.body.classList.add('has-3d');
    opening.attach(scene); stateDirty = true; schedule();
  } catch (error) {
    console.warn('The 3D view could not initialise. Prototype photographs are available instead.', error); useFallback();
  }
}
graphs.setPaused(paused);
document.body.classList.toggle('motion-paused', paused);
motionButton.setAttribute('aria-pressed', String(paused)); motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
graphMotionButton.setAttribute('aria-pressed', String(paused)); graphMotionButton.textContent = motionButton.textContent;
schedule();
requestAnimationFrame(() => { void startScene(); });
window.addEventListener('pagehide', event => { if (!event.persisted) { scene?.dispose(); graphs.dispose(); layoutObserver.disconnect(); } });
