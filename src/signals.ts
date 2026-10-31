import { createTraceFlow, electricalSample, initBaseline } from './baseline';
import type { TraceFlow } from './baseline';

export type GraphController = {
  setPaused: (value: boolean) => void;
  dispose: () => void;
};

type GraphTrack = {
  element: SVGSVGElement;
  visible: boolean;
  time: number;
  render: (time: number, delta: number, animate: boolean) => void;
};

// Slow rises and longer recoveries distinguish the skin response from a pulse.
export function conductanceSample(time: number) {
  const interval = 5.8;
  const nearestEvent = Math.floor(time / interval);
  let sample = Math.sin(time * 0.17) * 2;
  for (let event = nearestEvent - 8; event <= nearestEvent + 1; event++) {
    const onset = event * interval + Math.sin(event * 1.41) * 0.65;
    const age = time - onset;
    if (age < 0) continue;
    const strength = 80 + Math.sin(event * 0.91) * 12;
    const rise = 1 - Math.exp(-age / 0.55);
    sample += strength * rise * rise * Math.exp(-age / 2.4);
  }
  return sample;
}

// Broad changes keep this channel deliberately much quieter.
export function temperatureSample(time: number) {
  return 13 + Math.sin(time * 0.067) * 13
    + Math.sin(time * 0.139 + 1.4) * 5
    + Math.sin(time * 0.023 + 2.1) * 4;
}

export function initGraphs(): GraphController {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let disposed = false;
  let frame = 0;
  let previousFrame = 0;
  const tracks: GraphTrack[] = [];
  const flows: TraceFlow[] = [];

  function schedule() {
    if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function visible(element: Element) {
    if (element.closest('[hidden]')) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0
      && bounds.bottom > 0 && bounds.top < innerHeight;
  }

  function refreshVisibility() {
    tracks.forEach(track => { track.visible = visible(track.element); });
    schedule();
  }

  const baseline = initBaseline(schedule);
  tracks.push({
    element: baseline.element,
    visible: visible(baseline.element),
    time: 20,
    render: baseline.render,
  });

  const channels = [
    { id: 'electrical', sample: electricalSample, centre: 51, speed: 74, sampleRate: 240 },
    { id: 'eda', sample: conductanceSample, centre: 72, speed: 22, sampleRate: 40 },
    { id: 'thermal', sample: temperatureSample, centre: 67, speed: 13, sampleRate: 20 },
  ];

  channels.forEach(channel => {
    const element = document.querySelector<SVGSVGElement>(`#panel-${channel.id} .signal-trace`);
    const path = element?.querySelector<SVGPathElement>('.trace-line');
    if (!element || !path) return;
    const flow = createTraceFlow(path, channel.sample, {
      width: 500, height: 90, centre: channel.centre,
      speed: channel.speed, sampleRate: channel.sampleRate,
    });
    flows.push(flow);
    const render = (time: number) => flow.render(time);
    render(20);
    tracks.push({ element, render, visible: visible(element), time: 20 });
  });

  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden) { previousFrame = 0; return; }
    const animate = !paused && !motionPreference.matches
      && !document.body.classList.contains('motion-paused');
    const delta = previousFrame ? Math.min((now - previousFrame) / 1000, 0.05) : 1 / 60;
    let moving = false;

    tracks.forEach(track => {
      if (!track.visible || track.element.closest('[hidden]')) return;
      if (animate) track.time += delta;
      track.render(track.time, delta, animate);
      moving ||= animate;
    });

    previousFrame = moving ? now : 0;
    if (moving) schedule();
  }

  const intersection = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const track = tracks.find(item => item.element === entry.target);
      if (track) track.visible = entry.isIntersecting && !entry.target.closest('[hidden]');
    });
    schedule();
  });
  tracks.forEach(track => intersection.observe(track.element));

  const panels = new MutationObserver(refreshVisibility);
  document.querySelectorAll('.sensor-panel').forEach(panel => {
    panels.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  });
  const bodyState = new MutationObserver(() => {
    previousFrame = 0;
    schedule();
  });
  bodyState.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const visibilityChanged = () => {
    previousFrame = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else refreshVisibility();
  };
  const preferenceChanged = () => { previousFrame = 0; schedule(); };
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('resize', refreshVisibility);
  motionPreference.addEventListener('change', preferenceChanged);
  schedule();

  return {
    setPaused(value) {
      paused = value;
      previousFrame = 0;
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      intersection.disconnect();
      panels.disconnect();
      bodyState.disconnect();
      baseline.dispose();
      flows.forEach(flow => flow.dispose());
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('resize', refreshVisibility);
      motionPreference.removeEventListener('change', preferenceChanged);
    },
  };
}
