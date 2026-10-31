import type { DeviceScene } from './scene';
import { smooth } from './story';
type Rect = { x: number; y: number; width: number; height: number; scale: number };
type Point = { x: number; y: number };

function projectQuad(points: Point[]) {
  const [p0, p1, p2, p3] = points;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(denominator) < .00001 ? 0 : (dx3 * dy2 - dx2 * dy3) / denominator;
  const h = Math.abs(denominator) < .00001 ? 0 : (dx1 * dy3 - dx3 * dy1) / denominator;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y;
  return `matrix3d(${a / 1081},${d / 1081},0,${g / 1081},${b / 271},${e / 271},0,${h / 271},0,0,1,0,${p0.x},${p0.y},0,1)`;
}

export function initOpening(getRect: () => Rect, complete: () => void) {
  const mark = document.querySelector<HTMLElement>('#opening-mark')!;
  const veil = document.querySelector<HTMLElement>('#opening-veil')!;
  const host = document.querySelector<HTMLElement>('#scene')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const started = performance.now();
  let scene: DeviceScene | undefined, frame = 0, finished = false, transitionStart = 0;
  const stroke = mark.querySelector<SVGPathElement>('#logo-heartbeat-stroke')!;
  const letters = [...mark.querySelectorAll<SVGPathElement>('.logo-letter')];
  function centeredMark() {
    const w = Math.min(innerWidth * .74, 510), h = w * 271 / 1081;
    const x = (innerWidth - w) / 2, y = (innerHeight - h) / 2;
    return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  }
  let start = centeredMark();
  mark.style.transform = projectQuad(start);
  const animations: Animation[] = [];
  if (!reduced) {
    animations.push(stroke.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 550, fill: 'forwards', easing: 'ease-in-out' }));
    letters.forEach((letter, i) => animations.push(letter.animate([{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { delay: 480 + i * 16, duration: 250, fill: 'forwards', easing: 'ease-out' })));
  } else { stroke.style.strokeDashoffset = '0'; letters.forEach(letter => letter.style.opacity = '1'); }

  function finish() {
    if (finished) return;
    finished = true; cancelAnimationFrame(frame); clearTimeout(slowTimer);
    window.removeEventListener('resize', reposition);
    animations.forEach(a => a.cancel());
    mark.hidden = true; veil.hidden = true;
    host.style.opacity = ''; scene?.setIntro(1);
    document.body.classList.remove('opening'); complete();
  }
  const slowTimer = setTimeout(() => {
    if (!scene) finish();
  }, 2400);
  window.addEventListener('scroll', () => { if (scrollY > 40) finish(); }, { passive: true });
  function reposition() {
    start = centeredMark();
    if (!transitionStart) mark.style.transform = projectQuad(start);
  }
  window.addEventListener('resize', reposition);
  function tick(now: number) {
    if (finished || !scene) return;
    if (document.hidden) { finish(); return; }
    if (!transitionStart && now - started >= (reduced ? 150 : 850)) transitionStart = now;
    const t = transitionStart ? Math.min(1, (now - transitionStart) / (reduced ? 250 : 1050)) : 0;
    const progress = smooth(t);
    scene.setIntro(progress);
    const rect = getRect();
    const end = scene.projectLogo().map(p => ({ x: rect.x + p.x * rect.scale, y: rect.y + p.y * rect.scale }));
    mark.style.transform = projectQuad(start.map((p, i) => ({ x: p.x + (end[i].x - p.x) * progress, y: p.y + (end[i].y - p.y) * progress })));
    host.style.opacity = String(smooth((t - .12) / .65));
    veil.style.opacity = String(1 - smooth(t / .75));
    if (t >= 1) finish(); else frame = requestAnimationFrame(tick);
  }
  return {
    attach(value: DeviceScene) {
      scene = value;
      if (finished || scrollY > 40) { scene.setIntro(1); finish(); return; }
      host.style.opacity = '0'; scene.setIntro(0); frame = requestAnimationFrame(tick);
    },
    skip: finish,
    get active() { return !finished; }
  };
}
