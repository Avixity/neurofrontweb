export type StoryState = { reveal: number; sensor: number; dock: number };
export type StoryLayout = { inside: number; signals: number; exit: number; end: number; height: number };
export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function poseAt(reveal: number) {
  return {
    handoff: smooth(reveal / .22),
    open: smooth((reveal - .30) / .26),
    explode: smooth((reveal - .62) / .28),
  };
}

export function storyAt(y: number, layout: StoryLayout): StoryState {
  const lead = layout.height * .45;
  const revealStart = Math.max(80, layout.inside - layout.height * .60);
  const reveal = clamp((y - revealStart) / Math.max(600, layout.signals - layout.inside + layout.height * .05));
  const sensor = smooth((y - layout.signals + lead) / 250);
  const exitSpan = Math.max(1, layout.end - layout.exit + lead - 64);
  const returnSpan = Math.min(Math.max(360, layout.height * .48), exitSpan * .62);
  const returnPause = Math.min(60, exitSpan * .08);
  const returning = smooth((y - layout.exit + lead) / returnSpan);
  const dock = smooth((y - layout.exit + lead - returnSpan - returnPause) / (exitSpan - returnSpan - returnPause));
  return { reveal: reveal * (1 - returning), sensor: sensor * (1 - returning), dock };
}
