// apps/webstore/components/Placeholder.tsx
// Pure-CSS/SVG advanced placeholders — no images needed.

type Kind = 'product' | 'blog' | 'category' | 'cart' | 'empty';

const ICONS: Record<Kind, string> = {
  product: '📚',
  blog: '✍️',
  category: '🗂️',
  cart: '🛒',
  empty: '✨',
};

// Tag/category → icon override
const TAG_ICON: Record<string, string> = {
  books: '📘', book: '📘',
  courses: '🎓', course: '🎓',
  bundles: '📦', bundle: '📦',
  dvds: '💿',
  'test-series': '📝', 'test series': '📝', tests: '📝',
  'video-series': '🎬', 'video series': '🎬', videos: '🎬',
  'live-classes': '📡', 'live classes': '📡', live: '📡',
  notes: '🗒️',
  saile0: '⚙️', sail: '⚙️',
  featured: '⭐', hot: '🔥', new: '🆕',
  aptitude: '🧮', quant: '🧮', maths: '🧮',
};

// Deterministic gradient from a seed string (title/id)
function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function pickIcon(kind: Kind, tags?: string[], label?: string): string {
  if (tags) {
    for (const t of tags) {
      const key = t.toLowerCase().trim();
      if (TAG_ICON[key]) return TAG_ICON[key];
    }
  }
  if (label) {
    const key = label.toLowerCase().trim();
    if (TAG_ICON[key]) return TAG_ICON[key];
  }
  return ICONS[kind];
}

export function Placeholder({
  kind = 'product',
  seed = 'lakshya',
  tags,
  label,
  size = 'md',
  className = '',
}: {
  kind?: Kind;
  seed?: string;
  tags?: string[];
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}) {
  const hue = hashHue(seed);
  const hue2 = (hue + 40) % 360;
  const icon = pickIcon(kind, tags, label);
  const initials = (label ?? seed)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className={`ph ph-${size} ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 42% 88%), hsl(${hue2} 48% 82%))`,
      }}
      aria-hidden="true"
    >
      <div className="ph-pattern" />
      <div className="ph-content">
        <span className="ph-icon">{icon}</span>
        {size !== 'sm' && initials ? <span className="ph-initials">{initials}</span> : null}
      </div>
    </div>
  );
}

export default Placeholder;
