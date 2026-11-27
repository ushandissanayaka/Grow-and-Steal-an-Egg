import './hud.css';
import { useUi, uiStore } from './store.js';
import { DifficultyFace } from './popupIcons.jsx';
import { useEffect, useState } from 'react';
import { AxeShopPopup, CratePopup, DragonPopup, FeedbackPopup, FusionPopup, EggsPanel, GiftPicker, IndexPopup, InvitePopup, OfflinePopup, SellShopPopup, TrailsShopPopup, OpenedReveal, PetsPanel, RebirthPopup, ShopPopup, SideMenu } from './Popups.jsx';
import { BatArt, SnowflakeArt } from './shopArt.jsx';
import { AXES, DIFFICULTY_COLOR, RARITY_COLOR, RULES, formatNumber } from '../shared/gameData.js';
import { FRIEND_BOOST, FRIEND_MAX, SNOWFLAKE_CATCH } from '../shared/progression.js';

function EggIcon({ size = 44 }) {
  return (
    <svg width={size} height={size * 1.22} viewBox="0 0 40 49" aria-hidden="true">
      <path d="M20 2C10 2 2 18 2 30a18 17 0 0 0 36 0C38 18 30 2 20 2z" fill="#ffb27d" stroke="#14141a" strokeWidth="3" />
      <ellipse cx="13" cy="19" rx="4" ry="7" fill="#fff" opacity="0.65" transform="rotate(16 13 19)" />
    </svg>
  );
}

function ScytheIcon({ head = '#a8743f', handle = '#6e4322', size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 60 L46 6" stroke="#14141a" strokeWidth="8.5" strokeLinecap="round" />
      <path d="M14 60 L46 6" stroke={handle} strokeWidth="5" strokeLinecap="round" />
      <path d="M22 47 l6 3.5 M25 42 l6 3.5" stroke="#14141a" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 7 C34 -1 14 2 4 18 C16 11 30 11 41 17 Z" fill={head} stroke="#14141a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M9 14 C18 7 30 6 39 9" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function ShoeIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 22 L5 10 L13 12 L16 17 L28 19 C30 20 30 25 28 25 L4 25 Z" fill="#35a8ff" stroke="#14141a" strokeWidth="2" />
      <rect x="4" y="23" width="25" height="3" fill="#ffffff" stroke="#14141a" strokeWidth="1.5" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="9" width="28" height="15" rx="3" fill="#3fcf4b" stroke="#14141a" strokeWidth="2" />
      <circle cx="16" cy="16.5" r="4.2" fill="#a5f59c" stroke="#14141a" strokeWidth="1.6" />
    </svg>
  );
}

function Prompt({ prompt }) {
  return (
    <div className={`prompt${prompt.fill !== null && prompt.fill !== undefined ? ' hold' : ''}`} style={{ left: prompt.x, top: prompt.y }}>
      <span className="prompt-key">
        {prompt.fill > 0 && <i className="prompt-key-fill" style={{ height: `${prompt.fill * 100}%` }} />}
        <em>E</em>
      </span>
      <span className="prompt-text">
        <small>{prompt.title}</small>
        <b>{prompt.verb}</b>
        {prompt.fill !== null && prompt.fill !== undefined && (
          <span className="prompt-bar"><i style={{ width: `${prompt.fill * 100}%` }} /></span>
        )}
      </span>
    </div>
  );
}

function TreeBar({ bar, autoSwing, onAutoSwing }) {
  // how far the giant egg has grown: it fills up with every hit and hatches when full
  const grown = 1 - bar.hp / bar.max;
  const color = grown < 0.5 ? 'linear-gradient(#ffd85c, #f2b31f)' : grown < 0.85 ? 'linear-gradient(#a8e85c, #6fca2c)' : 'linear-gradient(#7fe8ff, #35a8ff)';
  return (
    <div className="tree-bar" style={{ left: bar.x, top: bar.y }}>
      <div className="tree-name">{bar.name}</div>
      <div className="tree-track">
        <div className="tree-fill" style={{ width: `${grown * 100}%`, background: color }} />
        <span>{Math.floor(grown * 100)}% GROWN</span>
      </div>
      <div className={`tree-hits${bar.hits > 60 ? ' hard' : ''}`}>
        <b key={bar.hits}>{formatNumber(bar.hits)}</b>
        <span>{bar.hits === 1 ? 'HIT TO HATCH IT!' : 'HITS TO HATCH IT'}</span>
        {bar.hits > 60 && <small>Get a better scythe!</small>}
      </div>
      {bar.inReach && <ChopPrompt autoSwing={autoSwing} onAutoSwing={onAutoSwing} />}
    </div>
  );
}

// Next to a giant egg you can hit: a button (or F) to swing at it automatically, or click to swing yourself.
function ChopPrompt({ autoSwing, onAutoSwing }) {
  return (
    <div className="chop-prompt">
      <button
        type="button"
        className={`chop-auto${autoSwing ? ' on' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onAutoSwing}
      >
        <kbd>F</kbd>
        <span>{autoSwing ? 'AUTO SWINGING…' : 'AUTO SWING'}</span>
        <small>{autoSwing ? 'tap or press F to stop' : 'tap or press F'}</small>
      </button>
      {!autoSwing && <div className="chop-click">or <b>CLICK</b> to swing yourself</div>}
    </div>
  );
}

// Along the bottom: 1 = your scythe (change it at the Scythe Shop), 2 = the bat. Click or press 1 / 2.
function Hotbar({ stats, tool, onTool }) {
  const axe = AXES.find((a) => a.id === stats.axe) || AXES[0];
  return (
    <div className="hotbar">
      <button type="button" className={`hot-slot${tool !== 'bat' ? ' on' : ''}`} onClick={() => onTool('scythe')}>
        <i>1</i>
        <ScytheIcon head={axe.head || '#6e3c24'} handle={axe.handle || '#5a301c'} size={58} />
        <span>Scythe</span>
      </button>
      <button type="button" className={`hot-slot${tool === 'bat' ? ' on' : ''}`} onClick={() => onTool('bat')}>
        <i>2</i>
        <BatArt size={54} />
        <span>Bat</span>
      </button>
    </div>
  );
}

// What the weather is, and how long until it changes (snow and rain take turns every 5 minutes).
const WEATHER_LABEL = {
  snow: { now: 'Snowing', next: 'DAY' },
  day: { now: 'Sunny', next: 'RAIN' },
  rain: { now: 'Raining', next: 'SNOW' },
};
function WeatherChip({ weather }) {
  const label = WEATHER_LABEL[weather.kind] || WEATHER_LABEL.day;
  const m = Math.floor(weather.left / 60), sec = String(weather.left % 60).padStart(2, '0');
  return (
    <div className={`weather-chip ${weather.kind}`}>
      {weather.kind === 'rain' ? <RainIcon /> : weather.kind === 'snow' ? <SnowflakeArt size={34} /> : <SunIcon />}
      <div className="weather-text">
        <small>{label.now}</small>
        <b>{label.next} IN {m}:{sec}</b>
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="29" y="2" width="6" height="12" rx="3" fill="#ffb21f" stroke="#14141a" strokeWidth="2" transform={`rotate(${i * 45} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="15" fill="#ffd84a" stroke="#14141a" strokeWidth="3" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 32 C2 32 2 18 12 18 C12 6 28 4 32 12 C36 4 54 6 52 20 C62 20 62 32 52 32 Z" fill="#4a5260" stroke="#14141a" strokeWidth="3" />
      <path d="M34 34 L28 46 L34 46 L30 58" stroke="#ffe14a" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <path d="M16 38 L13 48 M46 38 L43 48" stroke="#7fb8ff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// Now and then a big snowflake drifts down the screen: click it for Snowflakes.
function FallingSnowflake({ onCatch }) {
  const [flake, setFlake] = useState(null);
  useEffect(() => {
    let timer;
    const next = () => {
      timer = setTimeout(() => {
        setFlake({ key: Date.now(), left: 10 + Math.random() * 75 });
        timer = setTimeout(() => { setFlake(null); next(); }, 9000);
      }, SNOWFLAKE_CATCH.everyMs + Math.random() * 20_000);
    };
    next();
    return () => clearTimeout(timer);
  }, []);
  if (!flake) return null;
  return (
    <button
      key={flake.key} type="button" className="falling-flake" style={{ left: `${flake.left}%` }} aria-label="Catch the snowflake"
      onPointerDown={(e) => { e.stopPropagation(); onCatch(); setFlake(null); }}
    >
      <SnowflakeArt size={92} />
    </button>
  );
}

function FistIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="8" y="12" width="25" height="20" rx="5" fill="#f4f6f8" stroke="#14141a" strokeWidth="2.4" />
      <path d="M14 12 V20 M20 12 V20 M26 12 V20" stroke="#14141a" strokeWidth="2" />
      <rect x="4" y="18" width="9" height="9" rx="3" fill="#f4f6f8" stroke="#14141a" strokeWidth="2.2" />
    </svg>
  );
}

function Reveal({ reveal }) {
  return (
    <div className="reveal">
      <small>{reveal.egg} hatched!</small>
      <b style={{ color: RARITY_COLOR[reveal.rarity] }}>{reveal.name}</b>
      <span style={{ color: RARITY_COLOR[reveal.rarity] }}>{reveal.rarity}</span>
      <em>${formatNumber(reveal.cash)}/s</em>
    </div>
  );
}

// Top right: who you are playing as (your Boxity account, or your Boxity guest name and picture),
// the sound on/off (Boxity's synced master volume) and your Gems. The game draws no Log in / Log out:
// Boxity's toolbar does that.
function ProfileCard({ profile, onMute }) {
  if (!profile) return null;
  return (
    <div className="profile-card">
      <img className="profile-pfp" src={profile.pfp} alt="" width="44" height="44" />
      <b className="profile-name">{profile.name}</b>
      <button type="button" className="profile-sound" aria-label={profile.muted ? "Sound on" : "Sound off"} onClick={() => onMute(!profile.muted)}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 9h4l5-4v14l-5-4H3z" fill="#c8ccd4" />
          {profile.muted
            ? <path d="M16 9l6 6M22 9l-6 6" stroke="#ff6a6a" strokeWidth="2.4" strokeLinecap="round" />
            : <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#c8ccd4" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
        </svg>
      </button>
      <i className="profile-split" />
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" fill="#35a8ff" stroke="#1f6ad6" strokeWidth="1.5" />
        <path d="M12 6l5.2 3v6L12 18l-5.2-3V9z" fill="#7fd0ff" />
      </svg>
      <b className="profile-gems">{formatNumber(profile.gems || 0)}</b>
    </div>
  );
}

export default function Hud({ onDrop, onAutoSwing, onBuy, onEquip, onAction, onMute, onTool }) {
  const store = useUi();
  const ui = { ...store, act: (type, payload = {}) => onAction?.(type, payload) };

  if (ui.phase !== 'playing') return null; // loading, reconnecting or retrying: the loading page shows

  const { stats } = ui;
  return (
    <div className="hud">
      {ui.objective && (
        <div className="objective">
          <EggIcon />
          <span>{ui.objective}</span>
        </div>
      )}

      {/* the messages at the top, stacked so they never overlap (and kept clear of the corners) */}
      <div className="top-stack">
        {ui.zone && (
          <div className="zone-banner" key={ui.zone.name}>
            <div className="zone-title" style={{ '--zc': DIFFICULTY_COLOR[ui.zone.difficulty] }}>
              <b>{ui.zone.name}</b>
              <DifficultyFace difficulty={ui.zone.difficulty} size={92} />
            </div>
            <div className="zone-rec">
              <span>Recommended:</span>
              <ShoeIcon />
              <em>{formatNumber(ui.zone.speed)} Speed</em>
            </div>
          </div>
        )}
        {ui.chased && <div className="run-banner">RUN!</div>}
        {ui.reveal && <Reveal reveal={ui.reveal} />}
        {ui.toast && <div className="toast" style={{ color: ui.toast.color }} key={ui.toast.at}>{ui.toast.text}</div>}
      </div>

      {ui.treeBar && <TreeBar bar={ui.treeBar} autoSwing={ui.autoSwing} onAutoSwing={onAutoSwing} />}
      {ui.prompt && <Prompt prompt={ui.prompt} />}

      <div className="stats">
        <div className="friend-boost">
          <button type="button" className="fb-plus" aria-label="Invite friends" onClick={() => uiStore.set({ popup: 'invite' })}>+</button>
          <span>{Math.round(FRIEND_BOOST * 100 * Math.min(FRIEND_MAX, ui.meta?.friendsHere || 0))}% Friend Boost</span>
        </div>
        <div className="stat speed">
          <span className="stat-icon">
            <ShoeIcon />
            <button type="button" className="stat-plus" aria-label="Buy speed" onClick={() => uiStore.set({ popup: 'shop', shopSection: 'speed' })}>+</button>
          </span>
          <span>{formatNumber(stats.speed)}</span>
          {(ui.meta?.runMult || 1) > 1 && <small className="mult">(x{formatNumber(ui.meta.runMult)})</small>}
        </div>
        <div className="stat cash"><CashIcon /><span>${formatNumber(stats.cash)}</span><small>+${formatNumber(stats.income)}/s</small></div>
      </div>

      {ui.perf.tier && (
        <div className={`perf perf-${ui.perf.network}`} title="Graphics quality adjusts automatically to keep the game smooth">
          <b>{ui.perf.tier}</b>
          <span>{ui.perf.fps} FPS</span>
          <span>{ui.perf.ping === null ? '-- ms' : `${ui.perf.ping} ms`}</span>
        </div>
      )}

      <Hotbar stats={stats} tool={ui.tool} onTool={onTool} />
      {ui.weather?.kind === 'snow' && <FallingSnowflake onCatch={() => ui.act('snowflake')} />}
      {ui.weather && <WeatherChip weather={ui.weather} />}
      <button type="button" className={`slow-mode${ui.slowMode ? ' on' : ''}`} onClick={() => uiStore.set({ slowMode: !ui.slowMode })}>
        <i /><span>Slow Mode</span>
      </button>

      <button type="button" className={`auto-swing${ui.autoSwing ? ' on' : ''}`} onClick={onAutoSwing}>
        <ScytheIcon head="#7fe8ff" handle="#ff5a3a" size={50} />
        <span>{ui.autoSwing ? 'Growing...' : 'Auto Grow'}</span>
        <kbd>F</kbd>
      </button>

      {ui.carried > 0 && (
        <div className="carry">
          <div className="carry-count">
            <EggIcon size={38} />
            <span>{ui.carried}/{RULES.carryCap}</span>
          </div>
          <button type="button" className="carry-drop" onClick={onDrop} aria-label="Drop eggs">
            <svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true"><path d="M8 3h8v9h5l-9 10L3 12h5z" fill="#e8173e" stroke="#fff" strokeWidth="1.4" /></svg>
            <kbd>Q</kbd>
          </button>
        </div>
      )}


      <SideMenu ui={ui} />
      {ui.panel === 'eggs' && <EggsPanel ui={ui} />}
      {ui.panel === 'pets' && <PetsPanel ui={ui} />}
      {ui.popup === 'shop' && <ShopPopup ui={ui} />}
      {ui.popup === 'index' && <IndexPopup ui={ui} />}
      {ui.popup === 'rebirth' && <RebirthPopup ui={ui} />}
      {ui.popup === 'axe' && <AxeShopPopup ui={ui} onBuy={onBuy} onEquip={onEquip} />}
      {ui.popup === 'trails' && <TrailsShopPopup ui={ui} />}
      {ui.popup === 'sell' && <SellShopPopup ui={ui} />}
      {ui.popup === 'invite' && <InvitePopup ui={ui} />}
      {ui.popup === 'fusion' && <FusionPopup ui={ui} winter />}
      {ui.popup === 'fuse' && <FusionPopup ui={ui} />}
      {ui.popup === 'dragon' && <DragonPopup ui={ui} />}
      {ui.popup === 'feedback' && <FeedbackPopup ui={ui} />}
      {ui.popup === 'crate' && <CratePopup ui={ui} />}
      {ui.opened && <OpenedReveal opened={ui.opened} />}
      {ui.giftFor && <GiftPicker ui={ui} />}
      {ui.offline && <OfflinePopup ui={ui} />}
      <ProfileCard profile={ui.profile} onMute={onMute} />
    </div>
  );
}
