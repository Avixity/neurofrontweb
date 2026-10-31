export function activityScore(ratio: number) {
  return Math.max(0, Math.min(100, 50 + 38 * (ratio - 1)));
}

export function initBaseline() {
  const input = document.querySelector<HTMLInputElement>('#variation')!;
  const ratioOutput = document.querySelector<HTMLOutputElement>('#variation-value')!;
  const scoreOutput = document.querySelector<HTMLOutputElement>('#estimate')!;
  const description = document.querySelector('#estimate-description')!;
  const path = (ratio: number) => Array.from({ length: 281 }, (_, i) => {
    const x = i * 2;
    const sample = Math.sin(i * 0.13) * 10 + Math.sin(i * 0.41) * 4 + Math.sin(i * 0.71) * 2;
    const peak = i % 53;
    const transient = peak === 25 ? 21 : peak === 26 ? -29 : peak === 27 ? 14 : 0;
    return `${i ? 'L' : 'M'}${x},${(90 + (sample + transient) * ratio).toFixed(2)}`;
  }).join(' ');
  document.querySelector('#rest-trace')!.setAttribute('d', path(1));
  const update = () => {
    const ratio = Number(input.value) / 100;
    const score = Math.round(activityScore(ratio));
    ratioOutput.value = `${ratio.toFixed(2)}× baseline`;
    scoreOutput.value = String(score);
    input.setAttribute('aria-valuetext', `${ratio.toFixed(2)} times the resting signal variation`);
    description.textContent = ratio === 1 ? 'At the resting reference, the example score is 50.' : `${ratio < 1 ? 'Less' : 'More'} signal variation gives an example score of ${score}. That change alone does not establish stress.`;
    document.querySelector('#change-trace')!.setAttribute('d', path(ratio));
  };
  input.addEventListener('input', update);
  update();
}
