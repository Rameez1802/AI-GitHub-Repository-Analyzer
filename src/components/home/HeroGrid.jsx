// A decorative commit grid. It is the one animated moment on the page.
const ROWS = 7;
const COLS = 26;
const RAMP = ['#e4e7fb', '#c2c8ff', '#9aa2ff', '#6c72fb', '#3b3ee0'];

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

const rand = seeded(7);
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = Math.floor(i / ROWS);
  // Activity swells toward the right edge, like a project picking up speed.
  const bias = 0.25 + (col / COLS) * 0.75;
  const level = Math.floor(Math.pow(rand(), 1.6 / bias) * RAMP.length);
  return { level: Math.min(RAMP.length - 1, level), col };
});

export default function HeroGrid() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-flow-col gap-1.5"
      style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
    >
      {CELLS.map((cell, i) => (
        <span
          key={i}
          className="cell-in aspect-square rounded-[4px]"
          style={{ background: RAMP[cell.level], animationDelay: `${cell.col * 28}ms` }}
        />
      ))}
    </div>
  );
}
