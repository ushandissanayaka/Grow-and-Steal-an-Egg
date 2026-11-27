// Cartoon icons for the HUD buttons and the shop's items: thick dark outlines, bright fills and a
// white shine, like the rest of the popups. All drawn as SVG, so they are sharp at any size and
// cost nothing to load.

const K = '#14141a'; // outline
const W = 2.6;       // outline width (in a 64 x 64 box)

function Svg({ size, children, box = 64 }) {
  return <svg width={size} height={size} viewBox={`0 0 ${box} ${box}`} aria-hidden="true">{children}</svg>;
}

// a "x2" (or any text) sticker, bottom right
export function Badge({ text = 'x2', x = 44, y = 54, size = 16, color = '#ffd21f' }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="800" fontSize={size} fill={color} stroke={K} strokeWidth="3.4" paintOrder="stroke" fontStyle="italic">{text}</text>
  );
}

const Shine = ({ d }) => <path d={d} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />;

// ------------------------------------------------------------------ potions (power-ups)

const SYMBOLS = {
  cash: <g><rect x="22" y="36" width="20" height="11" rx="1.5" fill="#3fcf4b" stroke={K} strokeWidth="1.8" transform="rotate(-12 32 41)" /><text x="32" y="45" textAnchor="middle" fontSize="9" fontWeight="800" fill="#14541a" transform="rotate(-12 32 41)">$</text></g>,
  treadmill: <g><path d="M20 46 L42 46 L44 42 L24 42 Z" fill="#e4e6ea" stroke={K} strokeWidth="1.8" /><path d="M38 42 L40 32 L44 32" fill="none" stroke="#e4e6ea" strokeWidth="2.6" /><path d="M38 42 L40 32 L44 32" fill="none" stroke={K} strokeWidth="0.8" /></g>,
  shoe: <path d="M20 46 L22 36 L29 37 L31 41 L42 42 C44 43 44 47 42 47 L21 47 Z" fill="#fff" stroke={K} strokeWidth="1.8" />,
  scythe: <g><path d="M24 48 L38 30" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" /><path d="M38 30 C33 26 26 27 22 32 C28 30 33 31 37 33 Z" fill="#e4e6ea" stroke={K} strokeWidth="1.6" /></g>,
  egg: <g><ellipse cx="32" cy="41" rx="7" ry="8.5" fill="#fff" stroke={K} strokeWidth="1.8" /><path d="M32 45 V37 M28.5 40 L32 36.5 L35.5 40" stroke="#ffb21f" strokeWidth="2.4" fill="none" strokeLinecap="round" /></g>,
  clover: <g fill="#5fd63a" stroke={K} strokeWidth="1.6"><circle cx="29" cy="38" r="4" /><circle cx="35" cy="38" r="4" /><circle cx="32" cy="43" r="4" /></g>,
};

export function PotionArt({ color = '#3fcf4b', symbol = 'cash', size = 64 }) {
  return (
    <Svg size={size}>
      <rect x="25" y="4" width="14" height="9" rx="2" fill="#c8915a" stroke={K} strokeWidth={W} />
      <path d="M27 13 H37 V19 C48 22 54 31 54 40 C54 52 44 60 32 60 C20 60 10 52 10 40 C10 31 16 22 27 19 Z" fill={color} stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <ellipse cx="32" cy="23" rx="10" ry="2.5" fill="#fff" opacity="0.35" />
      <circle cx="20" cy="34" r="3" fill="#fff" opacity="0.5" /><circle cx="44" cy="50" r="2" fill="#fff" opacity="0.4" />
      {SYMBOLS[symbol]}
      <Shine d="M17 40 C17 33 20 28 25 25" />
    </Svg>
  );
}

// ------------------------------------------------------------------ lucky dust bags

export function DustBagArt({ color = '#5fd0ff', size = 64, count = null }) {
  return (
    <Svg size={size}>
      <path d="M22 18 C14 24 8 34 9 44 C10 56 20 60 32 60 C44 60 54 56 55 44 C56 34 50 24 42 18 Z" fill={color} stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M22 18 L20 8 L28 12 L32 6 L36 12 L44 8 L42 18 Z" fill={color} stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M21 19 C28 22 36 22 43 19" stroke="#8a5a2b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="40" r="11" fill="#fff" stroke={K} strokeWidth="2" />
      <g fill="#3fbf2c" stroke={K} strokeWidth="1.2"><circle cx="29" cy="37" r="3.4" /><circle cx="35" cy="37" r="3.4" /><circle cx="29" cy="43" r="3.4" /><circle cx="35" cy="43" r="3.4" /></g>
      <Shine d="M15 40 C15 33 18 28 22 25" />
      {count && <Badge text={`x${count}`} x={52} y={58} size={17} />}
    </Svg>
  );
}

// ------------------------------------------------------------------ snowflakes

export function SnowflakeArt({ size = 64, count = 1 }) {
  const flake = (cx, cy, r, key) => (
    <g key={key} transform={`translate(${cx} ${cy})`}>
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d={`M0 ${-r} V${r} M${-r * 0.35} ${-r * 0.75} L0 ${-r * 0.45} L${r * 0.35} ${-r * 0.75} M${-r * 0.35} ${r * 0.75} L0 ${r * 0.45} L${r * 0.35} ${r * 0.75}`} stroke="#1f6ad6" strokeWidth={r * 0.36} strokeLinecap="round" fill="none" />
          <path d={`M0 ${-r} V${r} M${-r * 0.35} ${-r * 0.75} L0 ${-r * 0.45} L${r * 0.35} ${-r * 0.75} M${-r * 0.35} ${r * 0.75} L0 ${r * 0.45} L${r * 0.35} ${r * 0.75}`} stroke="#e8fbff" strokeWidth={r * 0.18} strokeLinecap="round" fill="none" />
        </g>
      ))}
    </g>
  );
  const spots = [[[32, 32, 26]], [[24, 34, 20], [42, 28, 18]], [[18, 36, 16], [34, 26, 17], [46, 40, 15]]][Math.min(2, count - 1)];
  const extra = count > 3 ? [[10, 48, 9], [54, 20, 9], [30, 52, 9], [52, 52, 8]].slice(0, count - 3) : [];
  return <Svg size={size}>{[...spots, ...extra].map(([x, y, r], i) => flake(x, y, r, i))}</Svg>;
}

// ------------------------------------------------------------------ cash

function Bill({ x, y, r = 0, w = 34, h = 18 }) {
  return (
    <g transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y + 4} width={w} height={h} rx="2" fill="#2f9a2f" stroke={K} strokeWidth="2" />
      <rect x={x} y={y} width={w} height={h} rx="2" fill="#5fd63a" stroke={K} strokeWidth="2.2" />
      <circle cx={x + w / 2} cy={y + h / 2} r={h * 0.3} fill="#b8f59a" stroke={K} strokeWidth="1.2" />
      <rect x={x + w * 0.42} y={y - 1} width={w * 0.16} height={h + 6} fill="#ffcf33" stroke={K} strokeWidth="1.4" />
    </g>
  );
}

export function CashStackArt({ size = 64, count = 1 }) {
  const stacks = [[[15, 26, -14]], [[8, 30, -14], [22, 20, 8]], [[5, 34, -12], [24, 32, 10], [14, 16, -4]]][Math.min(2, count - 1)];
  return <Svg size={size}>{stacks.map(([x, y, r], i) => <Bill key={i} x={x} y={y} r={r} />)}</Svg>;
}

export function MoneyBagArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M22 20 C10 28 6 40 10 50 C13 58 22 60 32 60 C42 60 51 58 54 50 C58 40 54 28 42 20 Z" fill="#f2ecdc" stroke={K} strokeWidth={W} />
      <path d="M22 20 L18 8 L28 12 L32 6 L36 12 L46 8 L42 20 Z" fill="#f2ecdc" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <text x="32" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="#3fbf2c" stroke={K} strokeWidth="1.6" paintOrder="stroke">$</text>
      <Bill x={34} y={44} r={-10} w={26} h={13} />
    </Svg>
  );
}

export function VaultArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <rect x="10" y="12" width="44" height="44" rx="4" fill="#3a3d45" stroke={K} strokeWidth={W} />
      <rect x="15" y="17" width="34" height="34" rx="3" fill="#2a2c33" stroke={K} strokeWidth="1.6" />
      <circle cx="36" cy="34" r="8" fill="#ffcf33" stroke={K} strokeWidth="2" />
      <path d="M36 26 V42 M28 34 H44" stroke={K} strokeWidth="1.6" />
      <Bill x={4} y={40} r={-18} w={24} h={12} /><Bill x={38} y={46} r={14} w={24} h={12} />
    </Svg>
  );
}

// ------------------------------------------------------------------ chests and crates

export function ChestArt({ size = 64, fill = 'gold' }) {
  const loot = { gold: ['#ffcf33', '#ff4a8a', '#3fcf4b'], shoes: ['#35a8ff', '#ffffff', '#1f6ad6'], cash: ['#5fd63a', '#ffcf33', '#3fbf2c'] }[fill];
  return (
    <Svg size={size}>
      <path d="M8 30 L12 14 C14 10 50 10 52 14 L56 30 Z" fill="#8a4a1f" stroke={K} strokeWidth={W} transform="rotate(-8 32 22)" />
      {[[18, 28], [28, 24], [38, 27], [46, 30], [24, 32], [36, 32]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={loot[i % 3]} stroke={K} strokeWidth="1.6" />)}
      <rect x="8" y="32" width="48" height="26" rx="3" fill="#b8622a" stroke={K} strokeWidth={W} />
      <path d="M8 40 H56 M20 32 V58 M44 32 V58" stroke="#ffcf33" strokeWidth="3" />
      <rect x="28" y="36" width="8" height="9" rx="1.5" fill="#ffcf33" stroke={K} strokeWidth="1.6" />
    </Svg>
  );
}

export function CrateArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <ellipse cx="32" cy="58" rx="22" ry="4" fill="#c86aff" opacity="0.6" />
      <path d="M10 18 L32 8 L54 18 L54 46 L32 56 L10 46 Z" fill="#2a2234" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M10 18 L32 28 L54 18 M32 28 V56" stroke={K} strokeWidth="2" fill="none" />
      <path d="M14 30 L22 34 L18 40 L28 44 M36 40 L44 36 L40 30 L50 26 M20 22 L30 20 L36 23 L44 20" stroke="#d07aff" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

// ------------------------------------------------------------------ mystery eggs (Secret / Celestial / Godly)

export function MysteryEggArt({ color = '#3a3a44', size = 120, label = 'EGG' }) {
  return (
    <Svg size={size}>
      <path d="M18 12 H46 L52 20 V50 L44 60 H20 L12 50 V20 Z" fill={color} stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M22 6 H42 L46 12 H18 Z" fill={color} stroke={K} strokeWidth="2" />
      <path d="M16 22 V48" stroke="#fff" strokeWidth="2.4" opacity="0.5" strokeLinecap="round" />
      <text x="32" y="20" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" stroke={K} strokeWidth="1.6" paintOrder="stroke">{label}</text>
      <text x="32" y="50" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff" stroke={K} strokeWidth="2.4" paintOrder="stroke">?</text>
    </Svg>
  );
}

// ------------------------------------------------------------------ passes

export function CrownArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M8 46 L6 18 L20 30 L32 10 L44 30 L58 18 L56 46 Z" fill="#ffcf33" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <rect x="8" y="44" width="48" height="10" rx="2" fill="#e8a81f" stroke={K} strokeWidth={W} />
      <circle cx="32" cy="34" r="5" fill="#c84aff" stroke={K} strokeWidth="1.8" />
      <circle cx="18" cy="38" r="3.4" fill="#ff3a4a" stroke={K} strokeWidth="1.6" /><circle cx="46" cy="38" r="3.4" fill="#35a8ff" stroke={K} strokeWidth="1.6" />
      <text x="32" y="53" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" stroke={K} strokeWidth="1.6" paintOrder="stroke">VIP</text>
    </Svg>
  );
}

export function ScytheArt({ size = 64, head = '#e4e6ea', handle = '#8a5a2b', spin = false, badge = null }) {
  return (
    <Svg size={size}>
      {spin && <path d="M10 46 C6 30 14 14 30 8" stroke="#7fe8ff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />}
      <path d="M16 58 L46 8" stroke={K} strokeWidth="8" strokeLinecap="round" />
      <path d="M16 58 L46 8" stroke={handle} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M46 9 C34 0 14 3 4 19 C16 12 30 12 41 18 Z" fill={head} stroke={K} strokeWidth="2.4" strokeLinejoin="round" />
      <Shine d="M10 15 C18 8 30 7 38 10" />
      {badge && <Badge text={badge} x={46} y={56} size={18} />}
    </Svg>
  );
}

export function ClockUpArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <circle cx="28" cy="34" r="22" fill="#35a8ff" stroke={K} strokeWidth={W} />
      <circle cx="28" cy="34" r="16" fill="#fff" stroke={K} strokeWidth="2" />
      <path d="M28 22 V34 L36 38" stroke={K} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M38 30 L52 14 M46 13 H53 V20" stroke="#3fbf2c" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 30 L52 14 M46 13 H53 V20" stroke={K} strokeWidth="1.2" fill="none" />
      <Badge text="x2" x={22} y={60} size={18} />
    </Svg>
  );
}

export function CanArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M16 26 H42 L44 54 C44 57 14 57 14 54 Z" fill="#ffcf33" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M42 34 L58 22 L60 26 L44 42" fill="#ffcf33" stroke={K} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M20 26 C20 12 38 12 38 26" fill="none" stroke={K} strokeWidth="6" /><path d="M20 26 C20 12 38 12 38 26" fill="none" stroke="#ffcf33" strokeWidth="3" />
      <ellipse cx="60" cy="23" rx="2.6" ry="4" fill="#e8a81f" stroke={K} strokeWidth="1.6" transform="rotate(-40 60 23)" />
      <Shine d="M19 32 V50" />
    </Svg>
  );
}

export function CloverArt({ size = 64, gold = true, badge = null }) {
  const fill = gold ? '#ffcf33' : '#5fd63a';
  return (
    <Svg size={size}>
      <path d="M32 34 C34 46 36 52 42 60" stroke="#3a8a2a" strokeWidth="4" fill="none" strokeLinecap="round" />
      {[[-11, -9], [11, -9], [-11, 11], [11, 11]].map(([dx, dy], i) => (
        <path key={i} d={`M32 32 C${32 + dx * 2} ${32 + dy * 0.2} ${32 + dx * 1.6} ${32 + dy * 2} ${32 + dx * 0.2} ${32 + dy * 1.8} Z`} fill={fill} stroke={K} strokeWidth="2.2" strokeLinejoin="round" />
      ))}
      <circle cx="32" cy="32" r="3" fill={gold ? '#e8a81f' : '#3a8a2a'} />
      {badge && <Badge text={badge} x={46} y={58} size={18} />}
    </Svg>
  );
}

export function MoonArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M36 6 C22 8 14 20 16 32 C18 44 30 50 42 46 C30 44 24 34 26 24 C28 16 32 10 36 6 Z" fill="#ffcf33" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M20 12 C24 4 36 2 40 8" fill="#35a8ff" stroke={K} strokeWidth="2" />
      <text x="46" y="20" fontSize="10" fontWeight="800" fill="#fff" stroke={K} strokeWidth="1.6" paintOrder="stroke">z</text>
      <text x="52" y="12" fontSize="8" fontWeight="800" fill="#fff" stroke={K} strokeWidth="1.4" paintOrder="stroke">z</text>
      <Bill x={22} y={44} r={-6} w={30} h={13} />
      <Badge text="x2" x={50} y={62} size={16} />
    </Svg>
  );
}

export function AlarmArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="12" r="7" fill="#ffcf33" stroke={K} strokeWidth="2.2" /><circle cx="48" cy="12" r="7" fill="#ffcf33" stroke={K} strokeWidth="2.2" />
      <circle cx="32" cy="34" r="22" fill="#1f6ad6" stroke={K} strokeWidth={W} />
      <circle cx="32" cy="34" r="16" fill="#fff" stroke={K} strokeWidth="2" />
      <path d="M32 24 V34" stroke={K} strokeWidth="3" strokeLinecap="round" />
      <rect x="20" y="40" width="24" height="11" rx="3" fill="#ffcf33" stroke={K} strokeWidth="1.8" />
      <text x="32" y="49" textAnchor="middle" fontSize="9" fontWeight="800" fill={K}>72H</text>
    </Svg>
  );
}

export function CrystalsArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M8 56 H56 L50 48 H14 Z" fill="#8a5a2b" stroke={K} strokeWidth="2" />
      <path d="M16 50 L12 24 L20 12 L28 24 L26 50 Z" fill="#a84aff" stroke={K} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M28 50 L28 18 L36 6 L44 18 L42 50 Z" fill="#c86aff" stroke={K} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M40 50 L42 30 L48 22 L54 30 L50 50 Z" fill="#8a2ae0" stroke={K} strokeWidth="2.2" strokeLinejoin="round" />
      <Shine d="M33 14 V40" />
      <Badge text="x2" x={50} y={62} size={16} />
    </Svg>
  );
}

export function RainbowEggArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id="rbw" x1="0" y1="0" x2="1" y2="1">
          {['#ff4a4a', '#ffcf33', '#5fd63a', '#35a8ff', '#c84aff'].map((c, i) => <stop key={c} offset={i / 4} stopColor={c} />)}
        </linearGradient>
      </defs>
      <path d="M32 4 C18 4 8 26 8 40 A24 22 0 0 0 56 40 C56 26 46 4 32 4 Z" fill="url(#rbw)" stroke={K} strokeWidth={W} />
      <path d="M20 22 L28 26 L24 32 L34 30" stroke={K} strokeWidth="1.8" fill="none" />
      <Shine d="M16 36 C16 26 20 18 25 12" />
      <path d="M44 6 L56 0 L52 10 Z" fill="#ff3a3a" stroke={K} strokeWidth="1.6" />
      <circle cx="46" cy="52" r="10" fill="#c84aff" stroke={K} strokeWidth="2" />
      <text x="46" y="56" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" stroke={K} strokeWidth="1.4" paintOrder="stroke">2%</text>
    </Svg>
  );
}

export function FlaskArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <rect x="26" y="4" width="12" height="8" rx="2" fill="#c8915a" stroke={K} strokeWidth="2.2" />
      <path d="M27 12 H37 V22 C48 26 54 34 54 42 C54 54 44 60 32 60 C20 60 10 54 10 42 C10 34 16 26 27 22 Z" fill="#c84aff" stroke={K} strokeWidth={W} />
      <path d="M11 42 C20 36 30 48 53 40 C54 54 44 60 32 60 C20 60 10 54 11 42 Z" fill="#ff3a6a" stroke={K} strokeWidth="1.6" />
      <Shine d="M17 38 C17 32 20 28 25 26" />
      <Badge text="x2" x={48} y={60} size={18} />
    </Svg>
  );
}

// ------------------------------------------------------------------ server boosts

export function GoldEggArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M32 4 C18 4 8 26 8 40 A24 22 0 0 0 56 40 C56 26 46 4 32 4 Z" fill="#ffcf33" stroke={K} strokeWidth={W} />
      {[16, 26, 36, 46].map((y) => <path key={y} d={`M${12 + (y < 20 ? 8 : 0)} ${y} H${52 - (y < 20 ? 8 : 0)}`} stroke="#e8a81f" strokeWidth="2.4" />)}
      <Shine d="M16 36 C16 26 20 18 25 12" />
      <Badge text="x2" x={44} y={58} size={18} />
    </Svg>
  );
}

export function GlobeArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <circle cx="30" cy="26" r="20" fill="#35a8ff" stroke={K} strokeWidth={W} />
      <path d="M18 16 C24 14 26 22 22 26 C18 30 24 36 20 40 M34 10 C40 14 36 20 42 24 C46 26 44 34 48 34" fill="#5fd63a" stroke={K} strokeWidth="1.6" />
      <Bill x={8} y={40} r={-10} w={30} h={13} />
      <circle cx="46" cy="48" r="9" fill="#ffcf33" stroke={K} strokeWidth="2" /><text x="46" y="52" textAnchor="middle" fontSize="11" fontWeight="800" fill="#b8781f">$</text>
      <Badge text="x2" x={52} y={62} size={15} />
    </Svg>
  );
}

export function CloudEggsArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M12 30 C4 30 4 18 12 18 C12 8 26 6 30 14 C34 6 50 8 48 20 C58 20 58 30 50 30 Z" fill="#fff" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      {[[18, 44], [32, 50], [46, 42]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} 30 V${y - 8}`} stroke="#8a8e98" strokeWidth="1.4" />
          <ellipse cx={x} cy={y} rx="6" ry="7.5" fill="#8cf55a" stroke={K} strokeWidth="2" />
        </g>
      ))}
      <Badge text="x2" x={50} y={62} size={15} />
    </Svg>
  );
}

export function StormArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M12 32 C2 32 2 18 12 18 C12 6 28 4 32 12 C36 4 54 6 52 20 C62 20 62 32 52 32 Z" fill="#4a3a6a" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M18 34 L14 46 L20 46 L16 58" stroke="#7fe8ff" strokeWidth="3.2" fill="none" strokeLinejoin="round" />
      <path d="M32 34 L28 46 L34 46 L30 58" stroke="#c84aff" strokeWidth="3.2" fill="none" strokeLinejoin="round" />
      <path d="M46 34 L42 46 L48 46 L44 58" stroke="#ff3a3a" strokeWidth="3.2" fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

// ------------------------------------------------------------------ speed

export function BoltArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <path d="M36 2 L12 36 H28 L22 62 L52 24 H34 Z" fill="#ffcf33" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <Shine d="M33 10 L20 32" />
    </Svg>
  );
}

export function ShoeArt({ size = 64, count = 1, color = '#35a8ff' }) {
  const shoe = (dx, dy, key) => (
    <g key={key} transform={`translate(${dx} ${dy})`}>
      <path d="M4 40 L8 22 L22 24 L26 32 L50 36 C56 38 56 46 50 46 L4 46 Z" fill={color} stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <rect x="4" y="44" width="50" height="6" rx="2" fill="#fff" stroke={K} strokeWidth="2" />
      <path d="M14 28 L22 30 M16 33 L24 35" stroke="#fff" strokeWidth="2" />
    </g>
  );
  const spots = [[[4, 4]], [[-2, 0], [8, 8]], [[-4, -4], [4, 4], [12, 10]]][Math.min(2, count - 1)];
  return <Svg size={size}>{spots.map(([x, y], i) => shoe(x, y, i))}</Svg>;
}

export function TreadmillArt({ size = 120, gold = false }) {
  const c = gold ? ['#ffcf33', '#e8a81f'] : ['#e4e6ea', '#9aa0a8'];
  return (
    <Svg size={size}>
      <path d="M6 50 L40 58 L60 44 L28 38 Z" fill="#2a2c33" stroke={K} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M6 50 L6 54 L40 62 L40 58 M40 62 L60 48 L60 44" fill="none" stroke={c[1]} strokeWidth="3" />
      <path d="M12 46 L12 22 M22 42 L22 20" stroke={c[0]} strokeWidth="4" />
      <path d="M12 46 L12 22 M22 42 L22 20" stroke={K} strokeWidth="1" />
      <rect x="6" y="12" width="22" height="12" rx="2" fill={c[0]} stroke={K} strokeWidth="2.2" />
      <rect x="9" y="15" width="5" height="4" fill="#ff3a3a" /><rect x="20" y="15" width="5" height="4" fill="#3fcf4b" />
      {gold && [[30, 44], [44, 50], [52, 42]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#5fd63a" stroke={K} strokeWidth="1.2" />)}
    </Svg>
  );
}

// ------------------------------------------------------------------ HUD and misc

export function BasketArt({ size = 48 }) {
  return (
    <Svg size={size}>
      <path d="M18 24 C18 8 46 8 46 24" stroke={K} strokeWidth="7" fill="none" /><path d="M18 24 C18 8 46 8 46 24" stroke="#c8ccd4" strokeWidth="3.6" fill="none" />
      <path d="M6 24 H58 L52 54 H12 Z" fill="#ff3a4a" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M8 32 H56 M20 24 L22 54 M32 24 V54 M44 24 L42 54" stroke="#c81f2c" strokeWidth="2.4" />
      <Shine d="M12 28 H24" />
    </Svg>
  );
}

export function BookArt({ size = 48 }) {
  return (
    <Svg size={size}>
      <path d="M8 12 C16 8 26 8 32 14 C38 8 48 8 56 12 V54 C48 50 38 50 32 56 C26 50 16 50 8 54 Z" fill="#35a8ff" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M12 14 C18 11 26 12 30 16 V50 C26 47 18 46 12 48 Z" fill="#fff" stroke={K} strokeWidth="1.6" />
      <path d="M32 14 V56" stroke={K} strokeWidth="2" />
      <path d="M36 20 H50 M36 26 H50 M36 32 H46" stroke="#e8fbff" strokeWidth="2.4" strokeLinecap="round" />
    </Svg>
  );
}

export function GiftArt({ size = 40 }) {
  return (
    <Svg size={size}>
      <rect x="10" y="26" width="44" height="30" rx="3" fill="#fff" stroke={K} strokeWidth={W} />
      <rect x="6" y="18" width="52" height="10" rx="2" fill="#fff" stroke={K} strokeWidth={W} />
      <path d="M32 18 V56" stroke={K} strokeWidth="6" />
      <path d="M32 18 C24 4 12 10 20 18 M32 18 C40 4 52 10 44 18" fill="none" stroke={K} strokeWidth="3" />
    </Svg>
  );
}

export function EggIconArt({ size = 48, color = '#ffb21f', color2 = '#ff6a1a' }) {
  return (
    <Svg size={size}>
      <defs><linearGradient id={`egg-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} /><stop offset="1" stopColor={color2} /></linearGradient></defs>
      <path d="M32 4 C18 4 8 26 8 40 A24 22 0 0 0 56 40 C56 26 46 4 32 4 Z" fill={`url(#egg-${color})`} stroke={K} strokeWidth={W} />
      <Shine d="M16 36 C16 26 20 18 25 12" />
    </Svg>
  );
}

export function PawArt({ size = 48, color = '#c8753a' }) {
  return (
    <Svg size={size}>
      <ellipse cx="32" cy="42" rx="14" ry="12" fill={color} stroke={K} strokeWidth={W} />
      {[[14, 26], [24, 16], [40, 16], [50, 26]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="6" ry="7.5" fill={color} stroke={K} strokeWidth={W} />)}
    </Svg>
  );
}

export function LimitedArt({ size = 48 }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? 18 : 30, a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    return `${32 + Math.cos(a) * r},${32 + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <Svg size={size}>
      <polygon points={pts} fill="#ff3a3a" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <rect x="28" y="14" width="8" height="22" rx="3" fill="#fff" stroke={K} strokeWidth="2" />
      <circle cx="32" cy="44" r="4.6" fill="#fff" stroke={K} strokeWidth="2" />
    </Svg>
  );
}

export function ClapperArt({ size = 64 }) {
  return (
    <Svg size={size}>
      <rect x="8" y="24" width="48" height="32" rx="4" fill="#35a8ff" stroke={K} strokeWidth={W} />
      <path d="M8 24 L52 12 L54 20 L10 32 Z" fill="#fff" stroke={K} strokeWidth="2.2" />
      <path d="M18 21 L24 28 M30 18 L36 25 M42 15 L48 22" stroke={K} strokeWidth="3" />
      <path d="M28 34 L40 40 L28 46 Z" fill="#fff" stroke={K} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

export function BatArt({ size = 48 }) {
  return (
    <Svg size={size}>
      <path d="M14 56 L50 10" stroke={K} strokeWidth="14" strokeLinecap="round" />
      <path d="M14 56 L50 10" stroke="#e8c48a" strokeWidth="10" strokeLinecap="round" />
      <path d="M10 60 L22 46" stroke={K} strokeWidth="7" strokeLinecap="round" />
      <path d="M10 60 L22 46" stroke="#8a5a2b" strokeWidth="4" strokeLinecap="round" />
      <Shine d="M40 18 L48 9" />
    </Svg>
  );
}

export function CashIconArt({ size = 48 }) {
  return <CashStackArt size={size} count={2} />;
}

// which icon a pass / potion / boost uses
export function PassIcon({ icon, size = 90 }) {
  switch (icon) {
    case 'vip': return <CrownArt size={size} />;
    case 'damage': return <ScytheArt size={size} head="#ff3a3a" handle="#ffcf33" badge="x2" />;
    case 'money': return <CashStackArt size={size} count={3} />;
    case 'swing': return <ScytheArt size={size} head="#7fe8ff" spin />;
    case 'growth': return <ClockUpArt size={size} />;
    case 'can': return <CanArt size={size} />;
    case 'clover': return <CloverArt size={size} badge="x2" />;
    case 'moon': return <MoonArt size={size} />;
    case 'alarm': return <AlarmArt size={size} />;
    case 'crystals': return <CrystalsArt size={size} />;
    case 'rainbowEgg': return <RainbowEggArt size={size} />;
    case 'flask': return <FlaskArt size={size} />;
    case 'goldEgg': return <GoldEggArt size={size} />;
    case 'globe': return <GlobeArt size={size} />;
    case 'cloud': return <CloudEggsArt size={size} />;
    case 'storm': return <StormArt size={size} />;
    default: return null;
  }
}
