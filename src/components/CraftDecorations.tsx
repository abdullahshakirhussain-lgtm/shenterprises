/**
 * Hand-drawn-style SVG decorations used as scattered page accents.
 * One visual language: monoline, slight wobble, currentColor-driven.
 * Each is intentionally a bit imperfect — like a quick ink sketch.
 */

type Props = { className?: string; "aria-hidden"?: boolean };

const STROKE = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Loose thread loop — drawn slightly wonky, like a real sketch */
export function ThreadLoop({ className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...STROKE}
    >
      <path d="M10 40 C 10 18, 38 12, 50 28 S 72 60, 50 64 S 22 54, 28 42 S 50 28, 60 36" />
      <circle cx="60" cy="36" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Wooden thread spool with a few thread strands across it */
export function Spool({ className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...STROKE}
    >
      <ellipse cx="40" cy="18" rx="22" ry="5" />
      <ellipse cx="40" cy="62" rx="22" ry="5" />
      <line x1="18" y1="18" x2="18" y2="62" />
      <line x1="62" y1="18" x2="62" y2="62" />
      <path d="M22 26 L58 32 M58 34 L22 40 M22 44 L58 50 M58 52 L22 58" opacity="0.55" />
    </svg>
  );
}

/** Sewing needle with a single thread trailing */
export function Needle({ className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...STROKE}
    >
      <line x1="14" y1="64" x2="56" y2="22" />
      <ellipse cx="58" cy="20" rx="6" ry="3" transform="rotate(-45 58 20)" />
      <circle cx="58" cy="20" r="1" fill="currentColor" />
      {/* Trailing thread */}
      <path d="M14 64 C 4 60, 4 50, 12 48 S 22 56, 16 60" opacity="0.7" />
    </svg>
  );
}

/** Tape measure unfurled — a curling ribbon with tick marks */
export function TapeMeasure({ className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 120 60"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...STROKE}
    >
      <path d="M4 30 C 20 14, 40 14, 60 30 S 100 46, 116 30" />
      <path d="M4 36 C 20 20, 40 20, 60 36 S 100 52, 116 36" opacity="0.55" />
      <path d="M14 27 L14 33 M28 25 L28 35 M42 25 L42 35 M56 28 L56 32 M70 25 L70 35 M84 25 L84 35 M98 27 L98 33" opacity="0.7" />
    </svg>
  );
}

/** Two-hole button with cross-stitch */
export function Button4Hole({ className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...STROKE}
    >
      <circle cx="40" cy="40" r="26" />
      <circle cx="40" cy="40" r="18" />
      {/* Cross-stitch lines */}
      <line x1="34" y1="34" x2="46" y2="46" />
      <line x1="46" y1="34" x2="34" y2="46" />
      <circle cx="34" cy="34" r="2.2" fill="currentColor" />
      <circle cx="46" cy="34" r="2.2" fill="currentColor" />
      <circle cx="34" cy="46" r="2.2" fill="currentColor" />
      <circle cx="46" cy="46" r="2.2" fill="currentColor" />
    </svg>
  );
}

/** Short stitched line — used as a horizontal accent */
export function StitchLine({ className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 100 8"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...STROKE}
    >
      <line x1="2" y1="4" x2="98" y2="4" strokeDasharray="6 5" />
    </svg>
  );
}
