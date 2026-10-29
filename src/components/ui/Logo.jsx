const OPACITY = [0.35, 0.6, 0.35, 0.6, 1, 0.6, 0.35, 0.6, 0.35];

export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#3b3ee0" />
      {OPACITY.map((opacity, i) => (
        <rect
          key={i}
          x={7 + (i % 3) * 6.5}
          y={7 + Math.floor(i / 3) * 6.5}
          width="5"
          height="5"
          rx="1.2"
          fill="#fff"
          opacity={opacity}
        />
      ))}
    </svg>
  );
}
