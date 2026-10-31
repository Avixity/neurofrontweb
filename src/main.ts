import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initBaseline } from './baseline';
import type { DeviceScene } from './scene';

gsap.registerPlugin(ScrollTrigger);
initBaseline();

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionPreference.matches;
let scene: DeviceScene | undefined;
let activeSensor = 'electrical';
let manualView = '';
let lastScroll = scrollY;
document.querySelector('#skip-intro')!.addEventListener('click', () => {
  document.documentElement.classList.remove('intro-pending');
});
window.addEventListener('scroll', () => {
  if (scrollY > 15) document.documentElement.classList.remove('intro-pending');
}, { passive: true });
const motionButton = document.querySelector<HTMLButtonElement>('.motion-toggle')!;
const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle')!;
const mobileNav = document.querySelector<HTMLElement>('#mobile-nav')!;

function closeMenu() {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}
menuButton.addEventListener('click', () => {
  const opened = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !opened;
  menuButton.setAttribute('aria-expanded', String(opened));
  menuButton.setAttribute('aria-label', opened ? 'Close navigation' : 'Open navigation');
});
mobileNav.addEventListener('click', e => { if ((e.target as HTMLElement).closest('a')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });
document.addEventListener('click', e => { if (!mobileNav.hidden && !(e.target as Element).closest('.site-header')) closeMenu(); });
window.addEventListener('resize', () => { if (innerWidth > 760) closeMenu(); });

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-sensor]'));
function selectSensor(tab: HTMLButtonElement) {
  activeSensor = tab.dataset.sensor!;
  tabs.forEach(button => {
    const active = button === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')!)!.hidden = !active;
  });
  scene?.setSensor(activeSensor);
  if (!paused) gsap.fromTo(`#panel-${activeSensor} .trace-line`, { strokeDasharray: 700, strokeDashoffset: 700 }, { strokeDashoffset: 0, duration: .65, ease: 'power2.out' });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSensor(tab));
  tab.addEventListener('keydown', e => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault(); selectSensor(tabs[next]); tabs[next].focus();
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
  manualView = button.dataset.view!;
  document.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  scene?.setView(manualView, paused);
}));

function setPaused(value: boolean) {
  paused = value;
  document.body.classList.toggle('motion-paused', value);
  motionButton.setAttribute('aria-pressed', String(value));
  motionButton.innerHTML = value ? 'Resume motion <span aria-hidden="true">▷</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
  scene?.setPaused(value);
  if (!value) updateStory();
}
motionButton.addEventListener('click', () => setPaused(!paused));
motionPreference.addEventListener('change', e => setPaused(e.matches));

const hero = document.querySelector<HTMLElement>('#top')!;
const inside = document.querySelector<HTMLElement>('#inside')!;
const signals = document.querySelector<HTMLElement>('#signals')!;
const story = document.querySelector<HTMLElement>('#device-story')!;
const wrap = document.querySelector<HTMLElement>('.scene-wrap')!;
const clamp = gsap.utils.clamp(0, 1);
let viewportHeight = innerHeight;

function updateMobileStage() {
  if (document.body.classList.contains('intro-active')) return;
  if (innerWidth <= 760) {
    const section = [hero, inside, signals].find(s => s.getBoundingClientRect().bottom > viewportHeight * .52) || signals;
    const copy = section.querySelector<HTMLElement>('.hero-copy, .section-copy')!;
    const top = Math.max(80, copy.getBoundingClientRect().bottom + 15);
    wrap.style.top = `${top}px`;
    wrap.style.height = '390px';
  } else { wrap.style.top = ''; wrap.style.height = ''; }
}

function updateStory() {
  updateMobileStage();
  if (!scene || paused || manualView) return;
  const open = clamp((scrollY - inside.offsetTop + viewportHeight * .48) / (inside.offsetHeight * .32));
  const explode = clamp((scrollY - inside.offsetTop - inside.offsetHeight * .04) / (inside.offsetHeight * .32));
  const sensor = clamp((scrollY - signals.offsetTop + viewportHeight * .65) / (viewportHeight * .6));
  scene.setStory({ open, explode, sensor });
  const selected = explode > .55 ? 'exploded' : open > .5 ? 'open' : 'assembled';
  document.querySelectorAll<HTMLElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === selected)));
}

ScrollTrigger.create({ trigger: story, start: 'top top', end: 'bottom bottom', onUpdate: () => {
  if (Math.abs(scrollY - lastScroll) > 3) manualView = '';
  lastScroll = scrollY;
  updateStory();
}});
window.addEventListener('scroll', updateMobileStage, { passive: true });
window.addEventListener('resize', () => { viewportHeight = innerHeight; updateStory(); });

function useFallback() {
  document.documentElement.classList.remove('intro-pending');
  document.body.classList.add('no-3d');
  document.body.classList.remove('has-3d', 'intro-active');
  document.querySelector<HTMLButtonElement>('#skip-intro')!.hidden = true;
  const fallback = document.querySelector<HTMLImageElement>('.scene-fallback img')!;
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    fallback.src = `/assets/prototype-${id === 'inside' ? 1 : id === 'signals' ? 2 : 4}.webp`;
    fallback.alt = id === 'inside' ? 'Open controller with the real boards, battery and wiring' : id === 'signals' ? 'The real fabric headband, contact connectors and leads' : 'The current NeuroFront controller with its printed logo';
  }), { rootMargin: '-30% 0px -30% 0px' });
  [hero, inside, signals].forEach(section => observer.observe(section));
  updateMobileStage();
}

async function startScene() {
  if (new URLSearchParams(location.search).get('view') === 'static') { useFallback(); return; }
  try {
    const { createDeviceScene } = await import('./scene');
    let replay = true;
    try { replay = sessionStorage.getItem('neurofront-intro-v2') !== 'seen'; } catch { /* Storage is optional. */ }
    const intro = replay && !paused && scrollY < 15 && !location.hash && document.documentElement.classList.contains('intro-pending');
    scene = await createDeviceScene(document.querySelector<HTMLElement>('#scene')!, {
      intro, reducedMotion: paused, onFailure: useFallback,
      onIntroComplete() { try { sessionStorage.setItem('neurofront-intro-v2', 'seen'); } catch { /* Private browsing can restrict storage. */ } updateStory(); }
    });
    scene.setSensor(activeSensor);
    if (!intro) updateStory();
  } catch (error) {
    console.warn('3D view unavailable; showing prototype photography.', error);
    useFallback();
  }
}
requestAnimationFrame(() => { void startScene(); });
setPaused(paused);

const motionMedia = gsap.matchMedia();
motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
  const trace = document.querySelector<SVGPathElement>('#change-trace')!;
  const length = trace.getTotalLength();
  gsap.fromTo(trace, { strokeDasharray: length, strokeDashoffset: length }, {
    strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '#baseline', start: 'top 80%', end: 'center 65%', scrub: .5 }
  });
  gsap.fromTo('.dashboard-frame', { y: 32 }, {
    y: 0, ease: 'none', scrollTrigger: { trigger: '#dashboard', start: 'top 85%', end: 'top 20%', scrub: .6 }
  });
});
