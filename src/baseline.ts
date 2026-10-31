export function activityScore(ratio: number) {
  return Math.max(0, Math.min(100, 50 + 38 * (ratio - 1)));
}

function pulse(position: number, width: number) {
  return Math.exp(-0.5 * (position / width) ** 2);
}

// A continuous illustrative signal, with slightly different timing on each beat.
export function electricalSample(time: number) {
  const interval = 1.16;
  const nearestBeat = Math.floor(time / interval);
  let sample = Math.sin(time * 1.37) * 1.3 + Math.sin(time * 17.3) * 0.35;

  for (let beat = nearestBeat - 1; beat <= nearestBeat + 1; beat++) {
    const centre = beat * interval + 0.34 + Math.sin(beat * 1.73) * 0.045;
    const position = time - centre;
    const strength = 1 + Math.sin(beat * 0.83) * 0.09;
    sample += strength * (
      3.5 * pulse(position + 0.2, 0.043)
      - 6 * pulse(position + 0.043, 0.016)
      + 29 * pulse(position, 0.018)
      - 13 * pulse(position - 0.044, 0.021)
      + 5 * pulse(position - 0.25, 0.07)
    );
  }
  return sample;
}

export function samplePath(
  sample: (time: number) => number,
  time: number,
  width: number,
  centre: number,
  speed: number,
  amplitude = 1,
) {
  const segments = Math.ceil(width / 0.35);
  const points = new Array<string>(segments + 1);
  for (let index = 0; index <= segments; index++) {
    const x = index * width / segments;
    const signalTime = time - (width - x) / speed;
    const y = centre - sample(signalTime) * amplitude;
    points[index] = `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`;
  }
  return points.join(' ');
}

export type TraceFlow = {
  render: (time: number, amplitude?: number) => void;
  dispose: () => void;
};

type TraceOptions = {
  width: number;
  height: number;
  centre: number;
  speed: number;
  sampleRate?: number;
};

let traceId = 0;

export function fixedTraceGeometry(
  sample: (time: number) => number,
  anchor: number,
  { width, centre, speed, sampleRate = 240 }: TraceOptions,
  padding = 0.52,
) {
  const first = Math.floor((anchor - width / speed - padding) * sampleRate);
  const last = Math.ceil((anchor + padding) * sampleRate);
  const points = new Array<string>(last - first + 1);
  for (let index = first; index <= last; index++) {
    const sampleTime = index / sampleRate;
    const x = (anchor - sampleTime) * speed;
    const y = centre - sample(sampleTime);
    points[index - first] = `${index === first ? 'M' : 'L'}${x.toFixed(4)},${y.toFixed(4)}`;
  }
  return points.join(' ');
}

export function createTraceFlow(
  path: SVGPathElement,
  sample: (time: number) => number,
  options: TraceOptions,
): TraceFlow {
  const svg = path.ownerSVGElement!;
  const namespace = 'http://www.w3.org/2000/svg';
  const id = `trace-window-${++traceId}`;
  const definitions = document.createElementNS(namespace, 'defs');
  const clip = document.createElementNS(namespace, 'clipPath');
  const rectangle = document.createElementNS(namespace, 'rect');
  const window = document.createElementNS(namespace, 'g');
  clip.id = id;
  rectangle.setAttribute('width', String(options.width));
  rectangle.setAttribute('height', String(options.height));
  clip.append(rectangle);
  definitions.append(clip);
  window.setAttribute('clip-path', `url(#${id})`);
  svg.prepend(definitions);
  path.before(window);
  window.append(path);
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  let previousBucket = NaN;
  let previousTransform = '';

  return {
    render(time, amplitude = 1) {
      const bucket = Math.floor(time * 2);
      const anchor = bucket / 2;
      if (bucket !== previousBucket) {
        // New samples enter at the left; retained samples keep moving right.
        path.setAttribute('d', fixedTraceGeometry(sample, anchor, options));
        previousBucket = bucket;
      }
      const x = (time - anchor) * options.speed;
      const y = options.centre * (1 - amplitude);
      const transform = `matrix(1 0 0 ${amplitude.toFixed(5)} ${x.toFixed(4)} ${y.toFixed(4)})`;
      if (transform !== previousTransform) {
        path.setAttribute('transform', transform);
        previousTransform = transform;
      }
    },
    dispose() {
      window.before(path);
      window.remove();
      definitions.remove();
      path.removeAttribute('transform');
    },
  };
}

export type BaselineController = {
  element: SVGSVGElement;
  render: (time: number, delta: number, animate: boolean) => void;
  dispose: () => void;
};

export function initBaseline(invalidate?: () => void): BaselineController {
  const input = document.querySelector<HTMLInputElement>('#variation')!;
  const ratioOutput = document.querySelector<HTMLOutputElement>('#variation-value')!;
  const scoreOutput = document.querySelector<HTMLOutputElement>('#estimate')!;
  const description = document.querySelector('#estimate-description')!;
  const element = document.querySelector<SVGSVGElement>('#baseline-chart')!;
  const restingTrace = document.querySelector<SVGPathElement>('#rest-trace')!;
  const comparisonTrace = document.querySelector<SVGPathElement>('#change-trace')!;
  let targetRatio = Number(input.value) / 100;
  let displayedRatio = targetRatio;
  let currentTime = 20;
  restingTrace.setAttribute('d', samplePath(electricalSample, currentTime, 560, 100, 58));
  const comparison = createTraceFlow(comparisonTrace, electricalSample, {
    width: 560, height: 180, centre: 100, speed: 58,
  });

  const render = (time: number, delta: number, animate: boolean) => {
    currentTime = time;
    displayedRatio = animate
      ? displayedRatio + (targetRatio - displayedRatio) * (1 - Math.exp(-delta * 11))
      : targetRatio;
    if (Math.abs(targetRatio - displayedRatio) < 0.0005) displayedRatio = targetRatio;
    comparison.render(time, displayedRatio);
  };

  const update = () => {
    targetRatio = Number(input.value) / 100;
    const score = Math.round(activityScore(targetRatio));
    ratioOutput.value = `${targetRatio.toFixed(2)}\u00d7 baseline`;
    scoreOutput.value = String(score);
    input.setAttribute('aria-valuetext', `${targetRatio.toFixed(2)} times the resting signal variation`);
    description.textContent = targetRatio === 1
      ? 'At the resting reference, the example score is 50.'
      : `${targetRatio < 1 ? 'Less' : 'More'} signal variation gives an example score of ${score}. That change alone does not establish stress.`;
    if (invalidate) invalidate();
    else render(currentTime, 0, false);
  };

  input.addEventListener('input', update);
  update();
  render(currentTime, 0, false);

  return {
    element,
    render,
    dispose() {
      input.removeEventListener('input', update);
      comparison.dispose();
    },
  };
}
