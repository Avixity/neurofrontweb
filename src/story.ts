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
  const reveal = clamp((y - layout.inside + layout.height * .60) / Math.max(600, layout.signals - layout.inside + layout.height * .05));
  const sensor = smooth((y - layout.signals + lead) / 250);
  const returnSpan = Math.max(360, layout.height * .48);
  const returning = smooth((y - layout.exit + lead) / returnSpan);
  const dock = smooth((y - layout.exit + lead - returnSpan - 60) / Math.max(240, layout.end - layout.exit - returnSpan - 60));
  return { reveal: reveal * (1 - returning), sensor: sensor * (1 - returning), dock };
}
