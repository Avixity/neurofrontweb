import type { DeviceScene } from './scene';

export const VIEWER_ZOOM = Object.freeze({ min: .75, max: 1.85, initial: 1, step: .15 });

export function clampViewerZoom(value: number): number {
  return Math.min(VIEWER_ZOOM.max, Math.max(VIEWER_ZOOM.min, Number.isFinite(value) ? value : VIEWER_ZOOM.initial));
}

export function initViewerControls(getScene: () => DeviceScene | null | undefined, isExpanded: () => boolean) {
  const zoomIn = document.querySelector<HTMLButtonElement>('#viewer-zoom-in');
  const zoomOut = document.querySelector<HTMLButtonElement>('#viewer-zoom-out');
  const reset = document.querySelector<HTMLButtonElement>('#viewer-reset');
  const value = document.querySelector<HTMLElement>('#viewer-zoom-value');

  function sync() {
    const scene = getScene();
    const enabled = Boolean(scene && isExpanded());
    const zoom = scene?.getZoom() ?? VIEWER_ZOOM.initial;
    if (zoomIn) zoomIn.disabled = !enabled || zoom >= VIEWER_ZOOM.max - .001;
    if (zoomOut) zoomOut.disabled = !enabled || zoom <= VIEWER_ZOOM.min + .001;
    if (reset) reset.disabled = !enabled;
    if (value) {
      const text = `${Math.round(zoom * 100)}%`;
      if (value.textContent !== text) value.textContent = text;
    }
  }
  function change(direction: number) {
    const scene = getScene();
    if (!scene || !isExpanded()) return;
    scene.setZoom(clampViewerZoom(scene.getZoom() + direction * VIEWER_ZOOM.step));
    sync();
  }
  const onZoomIn = () => change(1);
  const onZoomOut = () => change(-1);
  const onReset = () => { if (isExpanded()) getScene()?.resetView(); sync(); };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isExpanded() || !getScene() || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); change(1); }
    else if (event.key === '-' || event.key === '_') { event.preventDefault(); change(-1); }
    else if (event.key === '0') { event.preventDefault(); onReset(); }
  };
  zoomIn?.addEventListener('click', onZoomIn);
  zoomOut?.addEventListener('click', onZoomOut);
  reset?.addEventListener('click', onReset);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('neurofront:viewerzoom', sync);
  sync();
  return {
    sync,
    dispose() {
      zoomIn?.removeEventListener('click', onZoomIn);
      zoomOut?.removeEventListener('click', onZoomOut);
      reset?.removeEventListener('click', onReset);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('neurofront:viewerzoom', sync);
    }
  };
}
