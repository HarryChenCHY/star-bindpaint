'use client';

// ─── 星星角色 (黄色) ───────────────────────────────────────────
export function StarChar({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 120 150"
      fill="none"
      className={className}
    >
      {/* Star body */}
      <polygon
        points="60,6 73,38 108,38 81,59 91,91 60,71 29,91 39,59 12,38 47,38"
        fill="#F9B801"
        stroke="#1A1A1A"
        strokeWidth="2.5"
      />
      {/* Left cheek blush */}
      <ellipse cx="30" cy="55" rx="7" ry="5" fill="#F9B801" opacity="0.4" />
      {/* Right cheek blush */}
      <ellipse cx="90" cy="55" rx="7" ry="5" fill="#F9B801" opacity="0.4" />
      {/* Eyes */}
      <circle cx="50" cy="50" r="4.5" fill="#1A1A1A" />
      <circle cx="70" cy="50" r="4.5" fill="#1A1A1A" />
      <circle cx="51.5" cy="48.5" r="1.5" fill="white" />
      <circle cx="71.5" cy="48.5" r="1.5" fill="white" />
      {/* Smile */}
      <path d="M50 60 Q60 68 70 60" stroke="#1A1A1A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Left arm (raised) */}
      <line x1="20" y1="50" x2="5" y2="35" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="5" y1="35" x2="2" y2="28" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Right arm */}
      <line x1="100" y1="53" x2="117" y2="42" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Left leg */}
      <line x1="48" y1="86" x2="40" y2="118" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Right leg */}
      <line x1="72" y1="86" x2="80" y2="118" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Feet */}
      <line x1="40" y1="118" x2="30" y2="121" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="118" x2="90" y2="121" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── 花朵角色 (粉色/品红) ─────────────────────────────────────
export function FlowerChar({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 120 150"
      fill="none"
      className={className}
    >
      {/* 5 petals (overlapping circles create flower) */}
      <circle cx="60" cy="27" r="24" fill="#F302C9" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="84" cy="44" r="24" fill="#F302C9" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="76" cy="70" r="24" fill="#F302C9" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="44" cy="70" r="24" fill="#F302C9" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="36" cy="44" r="24" fill="#F302C9" stroke="#1A1A1A" strokeWidth="2" />
      {/* Center fill to smooth */}
      <circle cx="60" cy="52" r="26" fill="#F302C9" />
      {/* Eyes */}
      <circle cx="52" cy="48" r="4.5" fill="#1A1A1A" />
      <circle cx="68" cy="48" r="4.5" fill="#1A1A1A" />
      <circle cx="53.5" cy="46.5" r="1.5" fill="white" />
      <circle cx="69.5" cy="46.5" r="1.5" fill="white" />
      {/* Smile */}
      <path d="M52 58 Q60 66 68 58" stroke="#1A1A1A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Arms raised */}
      <line x1="35" y1="48" x2="18" y2="32" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="18" y1="32" x2="14" y2="24" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="85" y1="48" x2="102" y2="32" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="102" y1="32" x2="106" y2="24" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Legs */}
      <line x1="50" y1="87" x2="44" y2="118" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="70" y1="87" x2="76" y2="118" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Feet */}
      <line x1="44" y1="118" x2="34" y2="121" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="76" y1="118" x2="86" y2="121" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── 圆圆角色 (绿色) ──────────────────────────────────────────
export function BlobChar({ size = 110, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 110 140"
      fill="none"
      className={className}
    >
      {/* Rounded rect body — slightly tilted */}
      <rect x="15" y="10" width="80" height="95" rx="40" ry="40" fill="#7DC353" stroke="#1A1A1A" strokeWidth="2.5" transform="rotate(-3 55 57)" />
      {/* Belt / band detail */}
      <rect x="15" y="52" width="80" height="12" rx="6" fill="#6BB845" transform="rotate(-3 55 58)" />
      {/* Eyes */}
      <circle cx="43" cy="44" r="5" fill="#1A1A1A" />
      <circle cx="63" cy="43" r="5" fill="#1A1A1A" />
      <circle cx="44.5" cy="42.5" r="2" fill="white" />
      <circle cx="64.5" cy="41.5" r="2" fill="white" />
      {/* Smile */}
      <path d="M43 56 Q53 63 63 55" stroke="#1A1A1A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Arms */}
      <line x1="18" y1="62" x2="4" y2="52" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="92" y1="58" x2="108" y2="50" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Legs */}
      <line x1="44" y1="102" x2="38" y2="128" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="66" y1="102" x2="72" y2="128" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      {/* Feet */}
      <line x1="38" y1="128" x2="28" y2="131" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <line x1="72" y1="128" x2="82" y2="131" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── 迷你星星装饰 ──────────────────────────────────────────────
export function MiniStar({ color = '#F9B801', size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 14.5,9 22,9 16,13.5 18.5,21 12,16.5 5.5,21 8,13.5 2,9 9.5,9" fill={color} />
    </svg>
  );
}

// ─── 迷你圆圈装饰 ──────────────────────────────────────────────
export function MiniCircle({ color = '#7DC353', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill={color} />
    </svg>
  );
}
