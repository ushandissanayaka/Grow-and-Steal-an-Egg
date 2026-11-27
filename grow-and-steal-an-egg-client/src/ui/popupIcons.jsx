// Icons for the side buttons and popups. Simple bold shapes with a dark outline, drawn here as SVG.

const OUT = '#14141a';

export function EggArt({ color = '#ffb27d', size = 60, spots = null }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 40 48" aria-hidden="true">
      <path d="M20 2C10 2 2 18 2 30a18 17 0 0 0 36 0C38 18 30 2 20 2z" fill={color} stroke={OUT} strokeWidth="2.6" />
      {spots && <>
        <circle cx="14" cy="30" r="3.4" fill={spots} />
        <circle cx="26" cy="22" r="2.6" fill={spots} />
        <circle cx="25" cy="36" r="2.2" fill={spots} />
      </>}
      <ellipse cx="13" cy="18" rx="3.6" ry="6.5" fill="#fff" opacity="0.6" transform="rotate(16 13 18)" />
    </svg>
  );
}

export function CrownArt({ size = 120 }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 64 52" aria-hidden="true">
      <path d="M6 18 L18 30 L32 8 L46 30 L58 18 L54 42 L10 42 Z" fill="#ffcf33" stroke={OUT} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="9" y="40" width="46" height="9" rx="2" fill="#e8a91a" stroke={OUT} strokeWidth="2.6" />
      <circle cx="32" cy="27" r="4.5" fill="#e8332f" stroke={OUT} strokeWidth="2" />
      {[6, 32, 58].map((x, i) => <circle key={i} cx={x} cy={i === 1 ? 7 : 17} r="3.6" fill="#ffe27a" stroke={OUT} strokeWidth="2" />)}
      <text x="32" y="47.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#5a3a00" fontFamily="Fredoka, sans-serif">VIP</text>
    </svg>
  );
}

export function CashArt({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {[30, 20, 10].map((y, i) => (
        <g key={y} transform={`translate(${6 + i * 2} ${y})`}>
          <rect width="48" height="20" rx="3" fill={i % 2 ? '#3fcf4b' : '#5ae065'} stroke={OUT} strokeWidth="2.4" />
          <rect x="20" width="8" height="20" fill="#ffd21f" stroke={OUT} strokeWidth="1.6" />
        </g>
      ))}
      <circle cx="50" cy="48" r="11" fill="#ffcf33" stroke={OUT} strokeWidth="2.4" />
      <text x="50" y="53" textAnchor="middle" fontSize="13" fontWeight="900" fill="#8a5a00" fontFamily="Fredoka, sans-serif">$</text>
    </svg>
  );
}

export function ClockArt({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="27" y="3" width="10" height="8" rx="2" fill="#ffcf33" stroke={OUT} strokeWidth="2.4" />
      <circle cx="32" cy="36" r="24" fill="url(#rainbow)" stroke={OUT} strokeWidth="2.6" />
      <circle cx="32" cy="36" r="18" fill="#fff" stroke={OUT} strokeWidth="2" />
      <path d="M32 36 L32 24 M32 36 L41 40" stroke={OUT} strokeWidth="3.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5fa8" /><stop offset="0.35" stopColor="#ffd21f" /><stop offset="0.7" stopColor="#3fcf4b" /><stop offset="1" stopColor="#35a8ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CrateArt({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="22" cy="20" rx="7" ry="9" fill="#c46bff" stroke={OUT} strokeWidth="2" />
      <ellipse cx="34" cy="17" rx="7" ry="9" fill="#9be8ff" stroke={OUT} strokeWidth="2" />
      <ellipse cx="45" cy="21" rx="7" ry="9" fill="#ffcf33" stroke={OUT} strokeWidth="2" />
      <rect x="6" y="24" width="52" height="34" rx="4" fill="#b8692e" stroke={OUT} strokeWidth="2.6" />
      <path d="M6 35 H58 M6 46 H58" stroke="#7d4419" strokeWidth="2.4" />
      <path d="M32 40 l7 3 v6 c0 4 -4 6 -7 7 c-3 -1 -7 -3 -7 -7 v-6 z" fill="#35a8ff" stroke={OUT} strokeWidth="2" />
    </svg>
  );
}

export function ScytheArt({ size = 80, head = '#ffcf33', handle = '#8a5a2b', spin = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {spin && <path d="M58 40 C60 20 46 6 26 6" fill="none" stroke="#fff3b0" strokeWidth="4" strokeLinecap="round" opacity="0.8" />}
      <path d="M14 60 L46 6" stroke={OUT} strokeWidth="9" strokeLinecap="round" />
      <path d="M14 60 L46 6" stroke={handle} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M22 47 l6 3.5 M25 42 l6 3.5" stroke={OUT} strokeWidth="2" strokeLinecap="round" />
      <path d="M46 7 C34 -1 14 2 4 18 C16 11 30 11 41 17 Z" fill={head} stroke={OUT} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M9 14 C18 7 30 6 39 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      <rect x="40.5" y="8.5" width="5" height="5" fill="#35d0ff" stroke={OUT} strokeWidth="1.4" transform="rotate(45 43 11)" />
    </svg>
  );
}

export function BoltArt({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M38 3 L12 36 H29 L22 61 L52 24 H34 Z" fill="#ffd21f" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 9 L19 31" stroke="#fff6a8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ShoeArt({ size = 70, count = 1 }) {
  const shoe = (dx, dy, k) => (
    <g key={`${dx}${dy}`} transform={`translate(${dx} ${dy}) scale(${k})`}>
      <path d="M3 22 L5 9 L14 11 L17 16 L29 18 C31 19 31 24 29 24 L4 24 Z" fill="#35a8ff" stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
      <rect x="4" y="22" width="26" height="4" rx="1" fill="#fff" stroke={OUT} strokeWidth="1.5" />
      <path d="M17 13 l-3 5 h3 l-2 4" stroke="#ffd21f" strokeWidth="1.8" fill="none" />
    </g>
  );
  const spots = [[16, 18, 1.15], [4, 8, 0.95], [28, 6, 0.9], [10, 30, 0.85], [32, 28, 0.85]].slice(0, Math.min(5, count));
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">{spots.map(([x, y, k]) => shoe(x, y, k))}</svg>;
}

export function PotionArt({ color = '#3fcf4b', size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="25" y="4" width="14" height="9" rx="2" fill="#c98a4a" stroke={OUT} strokeWidth="2.2" />
      <path d="M26 12 H38 V20 C50 24 56 32 56 41 A24 20 0 0 1 8 41 C8 32 14 24 26 20 Z" fill="#e8f6ff" stroke={OUT} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M10 40 C18 36 46 36 54 40 A22 18 0 0 1 10 40 Z" fill={color} />
      <circle cx="24" cy="46" r="3" fill="#fff" opacity="0.7" />
      <circle cx="38" cy="50" r="2" fill="#fff" opacity="0.6" />
      <path d="M17 28 C15 32 14 35 14 38" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

export function GiftArt({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="5" y="16" width="30" height="20" rx="2" fill="#c46bff" stroke={OUT} strokeWidth="2.2" />
      <rect x="3" y="11" width="34" height="7" rx="2" fill="#d98cff" stroke={OUT} strokeWidth="2.2" />
      <rect x="17" y="11" width="6" height="25" fill="#ffd21f" stroke={OUT} strokeWidth="1.8" />
      <path d="M20 11 C14 2 7 6 12 11 M20 11 C26 2 33 6 28 11" fill="#ffd21f" stroke={OUT} strokeWidth="2" />
    </svg>
  );
}

export function CartArt({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M2 5 H7 L11 22 H26 L29 10 H9" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="13" cy="27" r="2.6" fill="#fff" /><circle cx="24" cy="27" r="2.6" fill="#fff" />
    </svg>
  );
}

export function BookArt({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="6" y="3" width="21" height="26" rx="3" fill="#fff" stroke={OUT} strokeWidth="2" />
      <path d="M11 11 H22 M11 16 H22 M11 21 H18" stroke={OUT} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function RebirthArt({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 14 A10 10 0 0 1 25 10" fill="none" stroke="#ff4a5a" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 4 L27 11 L19 12 Z" fill="#ff4a5a" />
      <path d="M26 18 A10 10 0 0 1 7 22" fill="none" stroke="#4ab8ff" strokeWidth="4" strokeLinecap="round" />
      <path d="M10 28 L5 21 L13 20 Z" fill="#4ab8ff" />
    </svg>
  );
}

// The forest difficulty face (same faces as the badges above the forest animals).
const DIFF_FACE = {
  Easy: { color: '#ffd21f', expr: 'happy' },
  Medium: { color: '#ff9a1f', expr: 'grumpy' },
  Hard: { color: '#ffd21f', expr: 'sweat' },
  'Extra Hard': { color: '#ff3b3b', expr: 'furious' },
  'Super Hard': { color: '#4ab8ff', expr: 'furious', spikes: true },
  Insane: { color: '#f4f2ee', expr: 'skull' },
  Nightmare: { color: '#7de83a', expr: 'dizzy' },
  Impossible: { color: '#b84aff', expr: 'furious', spikes: true },
  Mythical: { color: '#2fe6b8', expr: 'sweat' },
  Godly: { color: '#ffd21f', expr: 'happy', halo: true },
};

export function DifficultyFace({ difficulty = 'Easy', size = 80 }) {
  const { color, expr, spikes, halo } = DIFF_FACE[difficulty] || DIFF_FACE.Easy;
  const id = `df-${difficulty.replace(/\s/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#14141a" />
      {halo && <ellipse cx="32" cy="5" rx="17" ry="3.6" fill="none" stroke="#ffe14a" strokeWidth="2.6" />}
      <rect x="7" y="7" width="50" height="50" rx="12" fill={`url(#${id})`} />
      {spikes && <path d="M12 16 L16 8 L20 16 L25 7 L30 16 L35 7 L40 16 L45 8 L49 16 L52 10 L52 18 L12 18 Z" fill="#e8f8ff" stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />}
      <rect x="13" y="10" width="38" height="9" rx="4.5" fill="#fff" opacity="0.4" />
      {expr === 'skull' && <>
        <ellipse cx="22" cy="30" rx="7" ry="7.5" fill={OUT} /><ellipse cx="42" cy="30" rx="7" ry="7.5" fill={OUT} />
        <circle cx="22" cy="30.5" r="2.6" fill="#ff8a1a" /><circle cx="42" cy="30.5" r="2.6" fill="#ff8a1a" />
        <path d="M32 36 L29 41 H35 Z" fill={OUT} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={21 + i * 6} y="45" width="4.5" height="7" rx="1" fill={OUT} />)}
      </>}
      {expr === 'dizzy' && <>
        <path d="M19 25 L27 33 M27 25 L19 33 M37 25 L45 33 M45 25 L37 33" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
        <path d="M24 42 Q32 54 40 42 Z" fill={OUT} /><ellipse cx="32" cy="47.5" rx="4" ry="2.6" fill="#ff6a8a" />
        <path d="M12 9 l1.5 3 3 .4 -2.2 2 .6 3 -2.9 -1.5 -2.9 1.5 .6 -3 -2.2 -2 3 -.4z" fill="#ffe14a" stroke={OUT} strokeWidth="0.8" />
        <path d="M53 10 l1.2 2.4 2.6 .3 -1.9 1.7 .5 2.5 -2.4 -1.3 -2.4 1.3 .5 -2.5 -1.9 -1.7 2.6 -.3z" fill="#ffe14a" stroke={OUT} strokeWidth="0.8" />
      </>}
      {expr !== 'skull' && <>
        <ellipse cx="18" cy="39" rx="5" ry="3" fill="#ff5a6e" opacity="0.45" />
        <ellipse cx="46" cy="39" rx="5" ry="3" fill="#ff5a6e" opacity="0.45" />
      </>}
      {expr !== 'skull' && expr !== 'dizzy' && <>
        {[24, 40].map((x) => <ellipse key={x} cx={x} cy="29" rx="3.6" ry={expr === 'happy' ? 6 : 4.2} fill={OUT} />)}
        {[24, 40].map((x) => <circle key={x} cx={x - 1} cy="26.5" r="1.2" fill="#fff" />)}
      </>}
      {expr === 'grumpy' && <path d="M15 19 L28 23 M49 19 L36 23 M25 46 Q32 40 39 46" stroke={OUT} strokeWidth="3" strokeLinecap="round" fill="none" />}
      {expr === 'sweat' && <>
        <path d="M16 22 L28 19 M48 22 L36 19 M25 45 q3.5 -3 7 0 t7 0" stroke={OUT} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M52 12 q4 7 0 9 q-4 -2 0 -9 z" fill="#4ac8ff" stroke={OUT} strokeWidth="1.2" />
      </>}
      {expr === 'happy' && <path d="M23 41 Q32 52 41 41 Z" fill="#c8203a" stroke={OUT} strokeWidth="2.6" strokeLinejoin="round" />}
      {expr === 'furious' && <>
        <path d="M14 18 L28 24 M50 18 L36 24" stroke={OUT} strokeWidth="3.2" strokeLinecap="round" />
        <rect x="21" y="40" width="22" height="9" rx="2.5" fill="#fff" stroke={OUT} strokeWidth="2.2" />
        <path d="M26.5 40 V49 M32 40 V49 M37.5 40 V49 M21 44.5 H43" stroke={OUT} strokeWidth="1.6" />
      </>}
    </svg>
  );
}

export function PawArt({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="27" rx="9" ry="8" fill="#7a3d1e" stroke={OUT} strokeWidth="2" />
      {[[8, 17], [15, 10], [25, 10], [32, 17]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="4" ry="5" fill="#7a3d1e" stroke={OUT} strokeWidth="2" />)}
    </svg>
  );
}
