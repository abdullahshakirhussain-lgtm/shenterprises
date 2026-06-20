/**
 * Unified monoline SVG icon set for product categories.
 * One visual language replaces the generic emoji soup.
 * Slugs match Category.slug values in the DB.
 */

const COMMON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 48 48",
};

type IconProps = { className?: string };

function Threads({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <rect x="14" y="10" width="20" height="28" rx="2" />
      <line x1="14" y1="14" x2="34" y2="14" />
      <line x1="14" y1="34" x2="34" y2="34" />
      <path d="M18 18 L30 30 M30 18 L18 30" opacity="0.5" />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
    </svg>
  );
}

function Zippers({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <line x1="24" y1="6" x2="24" y2="42" />
      <line x1="20" y1="10" x2="24" y2="10" />
      <line x1="24" y1="10" x2="28" y2="10" />
      <line x1="20" y1="14" x2="24" y2="14" />
      <line x1="24" y1="14" x2="28" y2="14" />
      <line x1="20" y1="18" x2="24" y2="18" />
      <line x1="24" y1="18" x2="28" y2="18" />
      <path d="M19 22 L24 26 L29 22 L29 32 L19 32 Z" />
      <circle cx="24" cy="36" r="1.5" fill="currentColor" />
    </svg>
  );
}

function Buttons({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <circle cx="24" cy="24" r="12" />
      <circle cx="24" cy="24" r="8" />
      <circle cx="21" cy="22" r="1" fill="currentColor" />
      <circle cx="27" cy="22" r="1" fill="currentColor" />
      <circle cx="21" cy="26" r="1" fill="currentColor" />
      <circle cx="27" cy="26" r="1" fill="currentColor" />
    </svg>
  );
}

function Ribbons({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <path d="M24 22 C 18 14, 12 16, 14 22 C 16 26, 22 24, 24 22 Z" />
      <path d="M24 22 C 30 14, 36 16, 34 22 C 32 26, 26 24, 24 22 Z" />
      <path d="M22 22 L18 38 L24 34 L30 38 L26 22" />
      <circle cx="24" cy="22" r="2" />
    </svg>
  );
}

function Scissors({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <circle cx="14" cy="34" r="5" />
      <circle cx="34" cy="34" r="5" />
      <line x1="18" y1="30" x2="38" y2="10" />
      <line x1="30" y1="30" x2="10" y2="10" />
    </svg>
  );
}

function Elastics({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <path d="M8 24 Q 14 14, 20 24 T 32 24 T 44 24" />
      <path d="M8 30 Q 14 20, 20 30 T 32 30 T 44 30" opacity="0.6" />
    </svg>
  );
}

function LaceTrims({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <line x1="6" y1="20" x2="42" y2="20" />
      <line x1="6" y1="32" x2="42" y2="32" />
      <circle cx="12" cy="26" r="3" />
      <circle cx="24" cy="26" r="3" />
      <circle cx="36" cy="26" r="3" />
      <path d="M9 26 Q 12 22, 15 26 M21 26 Q 24 22, 27 26 M33 26 Q 36 22, 39 26" />
    </svg>
  );
}

function NeedlesPins({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <line x1="10" y1="36" x2="38" y2="14" />
      <ellipse cx="40" cy="12" rx="4" ry="2" transform="rotate(-45 40 12)" />
      <circle cx="40" cy="12" r="1" fill="currentColor" />
      <line x1="36" y1="14" x2="34" y2="12" />
      <line x1="32" y1="18" x2="30" y2="16" />
    </svg>
  );
}

function FabricMarkers({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <path d="M30 8 L40 18 L18 40 L8 40 L8 30 Z" />
      <line x1="28" y1="10" x2="38" y2="20" />
      <line x1="8" y1="40" x2="14" y2="34" />
    </svg>
  );
}

function ToolsAccessories({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <path d="M14 8 L14 18 L8 24 L8 38 L20 38 L20 24 L14 18" />
      <line x1="20" y1="14" x2="40" y2="14" />
      <line x1="20" y1="20" x2="36" y2="20" />
      <line x1="24" y1="26" x2="40" y2="26" />
      <line x1="24" y1="32" x2="36" y2="32" />
    </svg>
  );
}

const ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  threads: Threads,
  zippers: Zippers,
  buttons: Buttons,
  ribbons: Ribbons,
  scissors: Scissors,
  elastics: Elastics,
  "lace-trims": LaceTrims,
  "needles-pins": NeedlesPins,
  "fabric-markers": FabricMarkers,
  "tools-accessories": ToolsAccessories,
};

function GenericSpool({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className}>
      <ellipse cx="24" cy="14" rx="10" ry="3" />
      <ellipse cx="24" cy="34" rx="10" ry="3" />
      <line x1="14" y1="14" x2="14" y2="34" />
      <line x1="34" y1="14" x2="34" y2="34" />
      <path d="M16 18 L32 22 M32 24 L16 28 M16 30 L32 32" opacity="0.6" />
    </svg>
  );
}

export default function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] || GenericSpool;
  return <Icon className={className} />;
}
