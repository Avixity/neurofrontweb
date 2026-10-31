export type StoryState = { open: number; explode: number; sensor: number; dock: number };
export type StoryLayout = { inside: number; signals: number; exit: number; end: number; height: number };
export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function storyAt(y: number, layout: StoryLayout): StoryState {
  const lead = layout.height * .45;
  const opening = smooth((y - layout.inside + lead) / Math.max(200, (layout.signals - layout.inside) * .28));
  const separation = smooth((y - layout.inside + lead - 180) / Math.max(240, (layout.signals - layout.inside) * .35));
  const sensor = smooth((y - layout.signals + lead) / 250);
  const returning = smooth((y - layout.exit + lead) / 280);
  const dock = smooth((y - layout.exit + lead - 300) / Math.max(240, layout.end - layout.exit - 300));
  return { open: opening * (1 - returning), explode: separation * (1 - returning), sensor: sensor * (1 - returning), dock };
}
