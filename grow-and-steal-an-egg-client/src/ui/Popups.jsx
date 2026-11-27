// The side buttons, popups (Shop, Index, Rebirth) and side panels (Eggs, Pets).
// Everything here is live: it reads the player's cash, pets and meta from the store, and every
// button sends an action to the server (act), which checks the price and answers. Everything is
// paid with in-game cash (Money packs with Snowflakes). The purple gift buttons buy an item for
// another player in this server.

import { useEffect, useRef, useState } from 'react';
import './popups.css';
import './shop.css';
import { uiStore } from './store.js';
import { AXES, EGGS, MUTATIONS, PETS, RARITIES, RARITY_COLOR, formatNumber, petLabel, treeHp, treeReward } from '../shared/gameData.js';
import {
  EXTRA_RARITY_COLOR, FRIEND_BOOST, FRIEND_MAX, MAX_PETS, TRAILS, friendCashMult, petSellValue,
  BUNDLE, CRATE_LUCK, FEEDBACK, FUSION, fusedCash, DUST, DUST_ORDER, DUST_PACKS, FEATURED, FREE_BOOST, FREE_GIFT, GROW_ALL_MULT, INDEX_AREAS, LIMITED, LIMITED_ORDER,
  MEGA_DEAL, MONEY_PACKS, MYSTERY_EGGS, MYSTERY_ORDER, PASSES, PASS_ORDER, POTIONS, POTION_ORDER, SERVER_BOOSTS,
  SERVER_BOOST_ORDER, SLOTS, SNOWFLAKE_PACKS, SPEED_PACKS, TREADMILL,
  areaPets, mysteryEgg, bundleFullPrice, bundlePrice, doubleSpeedPrice, dustPackPrice, dustPackWas, dustPrice, eggRates,
  featuredEndsAt, limitedPrice, moneyPackCash, mysteryPrice, potionPrice, rebirthCashMult, rebirthNeed, rebirthPadBonus,
  scaledPrice, serverBoostPrice, slotPrice, snowflakePrice, treadStep, treadmillPrice, areaById, petFromArea,
} from '../shared/progression.js';
import { onThumbReady, petThumb } from '../game/util/petArt.js';
import { bloxity } from '../bloxity/bloxity.js';
import { CashArt, EggArt, RebirthArt, ScytheArt } from './popupIcons.jsx';
import {
  BasketArt, BoltArt, BookArt, CashStackArt, ChestArt, ClapperArt, CrateArt, DustBagArt, EggIconArt, GiftArt, LimitedArt,
  MoneyBagArt, MysteryEggArt, PassIcon, PawArt, PotionArt, ShoeArt, SnowflakeArt, TreadmillArt, VaultArt,
} from './shopArt.jsx';

// ------------------------------------------------------------------ helpers

// re-render every `ms` (for countdowns)
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// meta times are "ms left when it arrived"
const left = (meta, ms, now) => Math.max(0, (ms || 0) - (now - (meta?.at || now)));

function clock(ms) {
  const s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  if (d) return `${d}d ${two(h)}:${two(m)}:${two(sec)}`;
  if (h) return `${h}h ${two(m)}m ${two(sec)}s`;
  return `${m}m ${two(sec)}s`;
}

const close = () => uiStore.set({ popup: null });
const baseIncome = (ui) => ui.meta?.income ?? (ui.stats.income || 0) / (ui.meta?.cashMult || 1);
const money = (n) => `$${formatNumber(n)}`;

// A green price button (grey when you cannot afford it).
function Price({ price, cash, onClick, label = null, wide = false, currency = 'cash' }) {
  const poor = cash < price;
  return (
    <button type="button" className={`buy${poor ? ' poor' : ''}${wide ? ' wide' : ''}`} disabled={poor} onClick={onClick}>
      {label || (currency === 'snow' ? <><SnowflakeArt size={22} /> {formatNumber(price)}</> : money(price))}
    </button>
  );
}

// The purple gift button and the green price button side by side. gift: { kind, id } to buy it
// for another player instead.
function BuyRow({ price, cash, onBuy, gift = null, currency = 'cash', was = null }) {
  return (
    <div className="buy-row">
      {gift && (
        <button type="button" className="gift" aria-label="Buy as a gift" onClick={() => uiStore.set({ giftFor: { ...gift, price } })}>
          <GiftArt size={30} />
        </button>
      )}
      {was !== null && <s className="was">{money(was)}</s>}
      <Price price={price} cash={cash} onClick={onBuy} wide currency={currency} />
    </div>
  );
}

// A pet's picture; a paw placeholder until it has been drawn (pictures are drawn in idle time, so
// opening a popup never stalls the game), then it redraws itself.
function PetPic({ id, hidden = false, size = 72 }) {
  const [, redraw] = useState(0);
  const url = petThumb(id);
  useEffect(() => (url ? undefined : onThumbReady((ready) => { if (ready === id) redraw((n) => n + 1); })), [id, url]);
  return url
    ? <img className={`pet-pic${hidden ? ' hidden' : ''}`} src={url} width={size} height={size} alt="" draggable="false" />
    : <PawArt size={size * 0.7} />;
}

function Popup({ title, theme = 'green', children, wide = false, side = null, extra = null }) {
  return (
    <div className="pop-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="pop-wrap">
        <div className={`pop pop-${theme}${wide ? ' wide' : ''}`}>
          <div className="pop-head">
            <h2>{title}</h2>
            {extra}
            <button type="button" className="pop-x" onClick={close} aria-label="Close">X</button>
          </div>
          <div className="pop-body">{children}</div>
        </div>
        {side}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ side buttons (left) and tabs (right)

export function SideMenu({ ui }) {
  const now = useNow(1000);
  const meta = ui.meta;
  const indexReady = meta && INDEX_AREAS.some((a) => !meta.claimed.includes(a.id) && areaPets(a).every((id) => meta.discovered.includes(id)));
  const need = meta && rebirthNeed(meta.rebirths);
  const rebirthReady = meta && ui.stats.cash >= need.cash && ui.allPets.some((p) => petFromArea(p, areaById(need.area)));
  const freeReady = meta && (left(meta, meta.giftIn, now) <= 0 || left(meta, meta.freeBoostIn, now) <= 0);
  const open = (popup) => uiStore.set({ popup });
  const panel = (name) => uiStore.set({ panel: ui.panel === name ? null : name });
  return (
    <>
      <div className="side-menu">
        <button type="button" className="tile-btn shop" onClick={() => open('shop')}><BasketArt size={56} /><span>SHOP</span>{freeReady && <i className="dot">!</i>}</button>
        <button type="button" className="tile-btn index-btn" onClick={() => open('index')}><BookArt size={56} /><span>INDEX</span>{indexReady && <i className="dot">!</i>}</button>
        <button type="button" className="tile-btn rebirth" onClick={() => open('rebirth')}><RebirthArt size={50} /><span>REBIRTH</span>{rebirthReady && <i className="dot">!</i>}</button>
      </div>
      <div className="side-tabs">
        <button type="button" className={`tan-tab${ui.panel === 'eggs' ? ' on' : ''}`} onClick={() => panel('eggs')}>
          <EggIconArt size={54} /><span>EGGS</span>
          {ui.growing?.length > 0 && <i className="dot">{ui.growing.length}</i>}
        </button>
        <button type="button" className={`tan-tab pets${ui.panel === 'pets' ? ' on' : ''}`} onClick={() => panel('pets')}>
          <PawArt size={54} /><span>PETS</span>
        </button>
      </div>
      {meta && <BoostBar meta={meta} now={now} />}
    </>
  );
}

const BOOST_SYMBOL = { cash: 'cash', treadmill: 'treadmill', walk: 'shoe', swing: 'scythe', growth: 'egg', luck: 'clover' };

function BoostBar({ meta, now }) {
  const active = [...POTION_ORDER, 'luck'].filter((id) => left(meta, meta.boosts[id], now) > 0);
  const server = SERVER_BOOST_ORDER.filter((id) => left(meta, meta.server?.[id], now) > 0);
  if (!active.length && !server.length && !meta.rebirths && !meta.luckBank) return null;
  return (
    <div className="boost-bar">
      {meta.rebirths > 0 && <div className="boost rebirth-chip" title="Rebirth cash bonus"><RebirthArt size={22} /><b>x{rebirthCashMult(meta.rebirths)}</b></div>}
      {meta.luckBank > 0 && <div className="boost" title="Lucky Dust luck for your next eggs"><DustBagArt size={30} color="#ffcf33" /><span>+{formatNumber(meta.luckBank)} Luck</span></div>}
      {active.map((id) => (
        <div key={id} className="boost" title={id === 'luck' ? 'x2 Luck' : POTIONS[id].name}>
          <PotionArt color={id === 'luck' ? '#5fd63a' : POTIONS[id].color} symbol={BOOST_SYMBOL[id]} size={30} />
          <span>{clock(left(meta, meta.boosts[id], now))}</span>
        </div>
      ))}
      {server.map((id) => (
        <div key={id} className="boost server" title={`${SERVER_BOOSTS[id].name} (everyone)`}>
          <PassIcon icon={SERVER_BOOSTS[id].icon} size={30} />
          <span>{clock(left(meta, meta.server[id], now))}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ gifting: pick a player

export function GiftPicker({ ui }) {
  const { giftFor, players, act } = ui;
  const others = (players || []).filter((p) => !p.me);
  const send = (to) => {
    act('buy', { kind: giftFor.kind, id: giftFor.id, to });
    uiStore.set({ giftFor: null });
  };
  return (
    <div className="pop-backdrop top" onPointerDown={(e) => e.target === e.currentTarget && uiStore.set({ giftFor: null })}>
      <div className="gift-pick">
        <h3><GiftArt size={34} /> Send as a gift</h3>
        <p>{money(giftFor.price)} from your cash</p>
        {!others.length && <p className="empty small">Nobody else is in this server yet.</p>}
        {others.map((p) => (
          <button key={p.id} type="button" className="gift-player" onClick={() => send(p.id)}>
            {p.pfp ? <img src={p.pfp} alt="" width="40" height="40" /> : <i>{p.name[0]?.toUpperCase()}</i>}
            <b>{p.name}</b>
          </button>
        ))}
        <button type="button" className="buy wide cancel" onClick={() => uiStore.set({ giftFor: null })}>Cancel</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ the shop

const SHOP_NAV = [
  ['limited', 'Limited', <LimitedArt key="l" size={44} />],
  ['passes', 'Passes', <PassIcon key="p" icon="growth" size={44} />],
  ['powerups', 'Power-Ups', <PotionArt key="u" color="#35a8ff" symbol="shoe" size={44} />],
  ['speed', 'Speed', <ShoeArt key="s" size={44} />],
  ['money', 'Cash', <CashStackArt key="c" size={44} count={3} />],
];
const SECTION_OF = { speed: 'speed' };

export function ShopPopup({ ui }) {
  const now = useNow(1000);
  const body = useRef(null);
  const jump = (id) => {
    const el = body.current?.closest('.pop')?.querySelector(`#shop-${id}`);
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  // opened from the speed "+": jump to that section
  useEffect(() => {
    if (!ui.shopSection) return;
    const id = SECTION_OF[ui.shopSection] || ui.shopSection;
    requestAnimationFrame(() => jump(id));
    uiStore.set({ shopSection: null });
  }, [ui.shopSection]);
  const { meta, stats, act } = ui;
  if (!meta) return null;
  const income = baseIncome(ui);
  const cash = stats.cash;
  const buy = (kind, id = '') => act('buy', { kind, id });
  const side = (
    <div className="shop-nav">
      {SHOP_NAV.map(([id, label, art]) => (
        <button key={id} type="button" onClick={() => jump(id)}>{art}<span>{label}</span></button>
      ))}
    </div>
  );
  const giftIn = left(meta, meta.giftIn, now);
  const boostIn = left(meta, meta.freeBoostIn, now);
  const treadPrice = treadmillPrice(meta.treadLevel || 0);
  return (
    <Popup title="Shop" wide side={side}>
      <div ref={body} />
      {/* ---------------- featured */}
      <div className="featured-alien" id="shop-featured">
        <div className="fa-top">
          <span className="tag red">New!</span>
          <div className="fa-title"><b>{FEATURED.name}</b><small>{FEATURED.sub}</small></div>
          <div className="fa-time"><small>Ends in</small><b>{clock(featuredEndsAt(Date.now()) - Date.now())}</b></div>
        </div>
        <div className="fa-rates">
          {eggRates(FEATURED.egg).map(([id, pct]) => {
            const value = FEATURED.pets[id];
            const xeno = value === 'x3';
            return (
              <div key={id} className={`fa-pet${xeno ? ' xeno' : ''}`}>
                {xeno && <i className="xeno-name">XENO</i>}
                <b>{pct}%</b>
                <PetPic id={id} size={xeno ? 96 : 80} hidden={!meta.discovered.includes(id)} />
                <small>{xeno ? 'x3 Money' : `+${formatNumber(value)}/s`}</small>
              </div>
            );
          })}
        </div>
        <div className="fa-packs">
          {[...FEATURED.packs].reverse().map((pack) => (
            <div key={pack.count} className="fa-pack">
              {pack.was && <s className="was">{money(pack.was)}</s>}
              <BuyRow price={pack.price} cash={cash} onBuy={() => buy('featured', pack.count)} gift={{ kind: 'featured', id: pack.count }} />
              <small>{pack.count} Egg{pack.count > 1 ? 's' : ''}</small>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- limited items */}
      <h3 className="section orange" id="shop-limited">LIMITED ITEMS</h3>
      <div className="grid3">
        {MYSTERY_ORDER.map((id) => {
          const egg = MYSTERY_EGGS[id];
          return (
            <div key={id} className={`card mystery theme-${egg.theme}`}>
              <b className="mystery-name" style={{ color: egg.color }}>{egg.name}</b>
              <MysteryEggArt color={egg.color} size={130} />
              <div className="mystery-rates">
                {eggRates(mysteryEgg(id, meta.discovered), egg.luck).slice(-4).map(([pid, pct]) => (
                  <span key={pid}><PetPic id={pid} size={34} hidden={!meta.discovered.includes(pid)} />{pct}%</span>
                ))}
              </div>
              <BuyRow price={mysteryPrice(id, income)} cash={cash} onBuy={() => buy('mystery', id)} gift={{ kind: 'mystery', id }} />
            </div>
          );
        })}
      </div>
      <div className="grid2 limited">
        {LIMITED_ORDER.map((id) => {
          const item = LIMITED[id];
          const leftN = Math.max(0, item.stock - (meta.bought?.[id] || 0));
          const best = Math.max(0, ...ui.allPets.map((p) => p.cash || 0));
          return (
            <div key={id} className={`card limited-card theme-${item.theme}`}>
              <div className="lim-tag"><b>{item.tag}</b>{item.stock > 1 && <span>{leftN} Left</span>}</div>
              <div className="lim-body">
                <div className="lim-art">
                  {item.pet ? <PetPic id={item.pet} size={120} /> : id === 'alienCrate' ? <CrateArt size={110} /> : <ChestArt size={110} />}
                </div>
                <div className="lim-info">
                  <b className="lim-name">{item.name}</b>
                  {item.pet && <small className="lim-line">{money(Math.max(100, best * item.best))}/s · {item.line}</small>}
                  {item.info && <small className="lim-info-text">{item.info}</small>}
                  {item.was && <span className="off">-{Math.round((1 - item.rs / item.was) * 100)}% OFF</span>}
                  {leftN > 0
                    ? <BuyRow price={limitedPrice(id, income)} cash={cash} onBuy={() => buy('limited', id)} gift={{ kind: 'limited', id }} was={item.was ? scaledPrice(item.was, income) : null} />
                    : <div className="owned">SOLD OUT</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------- passes */}
      <h3 className="section gold" id="shop-passes">PASSES</h3>
      <div className="grid2">
        {PASS_ORDER.map((id) => {
          const pass = PASSES[id];
          const owned = meta.passes.includes(id);
          return (
            <div key={id} className={`card pass theme-${pass.theme}`}>
              {pass.isNew !== false && <span className="new-tag">NEW!</span>}
              <div className="pass-top">
                <div className="card-art"><PassIcon icon={pass.icon} size={96} /></div>
                <div className="pass-text">
                  <b className="card-name">{pass.name}</b>
                  {pass.lines.map((line) => <span key={line}>{line}</span>)}
                </div>
              </div>
              {owned ? <div className="owned">OWNED</div> : <BuyRow price={pass.price} cash={cash} onBuy={() => buy('pass', id)} gift={{ kind: 'pass', id }} />}
            </div>
          );
        })}
      </div>

      {/* ---------------- server boosts */}
      <h3 className="section green" id="shop-server">SERVER BOOSTS</h3>
      <p className="note top">Everyone in this server gets them!</p>
      <div className="rows">
        {SERVER_BOOST_ORDER.map((id) => {
          const boost = SERVER_BOOSTS[id];
          const running = left(meta, meta.server?.[id], now);
          return (
            <div key={id} className={`card wide-row theme-${boost.theme}`}>
              <div className="card-art"><PassIcon icon={boost.icon} size={84} /></div>
              <div className="row-text">
                <b className="card-name">{boost.name}</b>
                {id === 'mutationStorm'
                  ? <span className="storm-line"><em className="c-winter">Winter</em>, <em className="c-blood">Blood Moon</em> or <em className="c-alien">Alien</em>!</span>
                  : boost.line.length === 2 ? <span>{boost.line[0]} ▸ <em>{boost.line[1]}</em>{boost.note ? <small> ({boost.note})</small> : null}</span> : <span>{boost.line[0]}</span>}
                <small>{running > 0 ? <>Running: <b>{clock(running)}</b> · +15 Minutes</> : '+15 Minutes'}</small>
              </div>
              <div className="row-buy"><Price price={serverBoostPrice(id, income)} cash={cash} onClick={() => act('serverBoost', { id })} wide /></div>
            </div>
          );
        })}
      </div>

      {/* ---------------- free gift and mega deal */}
      <div className="grid2 free-row">
        <div className="card free theme-lime">
          <b className="card-name">FREE GIFT</b>
          <PotionArt color={POTIONS[FREE_GIFT.potion].color} symbol="egg" size={86} />
          <span className="free-line"><em>x1.5</em> Growing Speed <em className="y">5m</em></span>
          <button type="button" className={`buy wide${giftIn > 0 ? ' poor' : ''}`} disabled={giftIn > 0} onClick={() => act('claimFree', { which: 'gift' })}>
            {giftIn > 0 ? clock(giftIn) : 'CLAIM'}
          </button>
        </div>
        <div className={`card free mega theme-${meta.giftClaimed ? 'purple' : 'grey'}`}>
          <b className="card-name">MEGA DEAL</b>
          <div className="mega-art"><CrateArt size={70} /><i>x1</i><DustBagArt size={70} color="#ffcf33" /><i>x2</i></div>
          <span className="free-line">{meta.megaDeal ? 'Bought!' : meta.giftClaimed ? <>Alien Crate + 2 Mega Lucky Dust</> : <>Claim <em>FREE</em> first</>}</span>
          {!meta.megaDeal && (
            <BuyRow price={scaledPrice(MEGA_DEAL.rs, income)} cash={meta.giftClaimed ? cash : -1} onBuy={() => buy('megaDeal')} was={scaledPrice(MEGA_DEAL.was, income)} />
          )}
        </div>
      </div>

      {/* ---------------- snowflakes */}
      <h3 className="section blue" id="shop-snowflakes">SNOWFLAKES <small>You have <SnowflakeArt size={22} /> {formatNumber(meta.snowflakes || 0)}</small></h3>
      <div className="grid3">
        {SNOWFLAKE_PACKS.map((pack, i) => (
          <div key={pack.id} className="card small theme-blue">
            {pack.best && <span className="best">BEST DEAL!</span>}
            <SnowflakeArt size={84} count={i + 1} />
            <b className="amount">{pack.amount.toLocaleString('en-US')} Snowflakes</b>
            <BuyRow price={snowflakePrice(pack.id, income)} cash={cash} onBuy={() => buy('snowflakes', pack.id)} gift={{ kind: 'snowflakes', id: pack.id }} />
          </div>
        ))}
      </div>
      <p className="note">Hatching eggs and catching falling snowflakes earns them too. Spend them on Money below!</p>

      {/* ---------------- power-ups */}
      <h3 className="section purple" id="shop-powerups">POWER-UPS</h3>
      <div className="grid3">
        {POTION_ORDER.map((id) => {
          const potion = POTIONS[id];
          const ms = left(meta, meta.boosts[id], now);
          return (
            <div key={id} className={`card small theme-${potion.theme}`}>
              <small className="lasts">{ms > 0 ? <>Active <b>{clock(ms)}</b></> : <>Lasts <b>15m</b></>}</small>
              <PotionArt color={potion.color} symbol={BOOST_SYMBOL[id]} size={84} />
              <b className="card-name potion-name">{potion.name.replace(/^(x[\d.]+)/, '')}<em>{potion.name.match(/^x[\d.]+/)?.[0]}</em></b>
              <BuyRow price={potionPrice(id, income)} cash={cash} onBuy={() => buy('potion', id)} gift={{ kind: 'potion', id }} />
            </div>
          );
        })}
        <div className="card small theme-rainbow">
          <span className="save">-{Math.round(BUNDLE.save * 100)}% OFF</span>
          <b className="card-name"><em>x10</em> All Potions</b>
          <div className="bundle-art">{POTION_ORDER.map((id) => <PotionArt key={id} color={POTIONS[id].color} symbol={BOOST_SYMBOL[id]} size={36} />)}</div>
          <b className="card-name small-name">Potion Bundle</b>
          <BuyRow price={bundlePrice(income)} cash={cash} onBuy={() => buy('bundle')} gift={{ kind: 'bundle', id: '' }} was={bundleFullPrice(income)} />
        </div>
      </div>

      {/* ---------------- free boost */}
      <div className="card free-boost theme-purple">
        <div className="fb-art"><PotionArt color={POTIONS.swing.color} symbol="scythe" size={86} /><small><em>x1.5</em> Swing Speed</small></div>
        <div className="fb-mid">
          <b className="card-name"><em>FREE</em> Boost! <i>(5 Mins)</i></b>
          <small className="y">[Every 30 minutes]</small>
          <button type="button" className={`buy wide${boostIn > 0 ? ' poor' : ''}`} disabled={boostIn > 0} onClick={() => act('claimFree', { which: 'boost' })}>
            {boostIn > 0 ? clock(boostIn) : 'PLAY'}
          </button>
        </div>
        <ClapperArt size={86} />
      </div>

      {/* ---------------- lucky dust */}
      <h3 className="section purple" id="shop-dust">LUCKY DUST</h3>
      <p className="note top">Luck makes your next eggs hatch rarer pets that earn more. You have <b>+{formatNumber(meta.luckBank || 0)}</b> Luck saved.</p>
      <div className="grid3">
        {DUST_ORDER.map((id) => {
          const dust = DUST[id];
          return (
            <div key={id} className={`card small theme-${dust.theme}`}>
              <b className="card-name small-name">{dust.name}</b>
              <DustBagArt size={90} color={dust.color} count={dust.count} />
              <b className="amount"><em>+{dust.luck[0]}-{dust.luck[1]}</em> Luck</b>
              <BuyRow price={dustPrice(id, income)} cash={cash} onBuy={() => buy('dust', id)} gift={{ kind: 'dust', id }} />
            </div>
          );
        })}
      </div>
      <div className="grid2 dust-packs">
        {Object.entries(DUST_PACKS).map(([id, pack]) => (
          <div key={id} className={`card small theme-${pack.theme}`}>
            <span className="save">-{Math.round((1 - pack.rs / pack.was) * 100)}% OFF</span>
            <b className="card-name">{pack.name}</b>
            <div className="bundle-art">
              <DustBagArt size={60} color="#ffcf33" /><DustBagArt size={60} color="#a84aff" />{pack.luckMs && <PassIcon icon="clover" size={48} />}
            </div>
            <b className="amount"><em>x{pack.mega}</em> Mega <em>x{pack.big}</em> Big{pack.luckMs ? <> + <em>x2</em> Luck 10m</> : null}</b>
            <BuyRow price={dustPackPrice(id, income)} cash={cash} onBuy={() => buy('dustPack', id)} gift={{ kind: 'dustPack', id }} was={dustPackWas(id, income)} />
          </div>
        ))}
      </div>

      {/* ---------------- speed */}
      <h3 className="section blue" id="shop-speed">SPEED</h3>
      <div className="card double theme-blue">
        <b className="card-name dbl-title"><em>DOUBLE</em> Your SPEED</b>
        <div className="dbl-row">
          <BoltArt size={90} />
          <span className="speed-change">x1 ▸ <em>x2</em></span>
          <div className="dbl-buy">
            <small>{formatNumber(stats.speed)} ▸ {formatNumber(stats.speed * 2)}</small>
            <Price price={doubleSpeedPrice(stats.speed)} cash={cash} onClick={() => buy('doubleSpeed')} wide />
          </div>
        </div>
      </div>
      <div className="card treadmill theme-blue">
        <b className="card-name rainbow-text"><span>U</span><span>P</span><span>G</span><span>R</span><span>A</span><span>D</span><span>E</span> TREADMILL!</b>
        <div className="tm-row">
          <TreadmillArt size={150} />
          <span className="tm-arrow">➜</span>
          <TreadmillArt size={150} gold />
        </div>
        <small className="tm-line">Level {(meta.treadLevel || 0) + 1}/{TREADMILL.maxLevel + 1}: <em>+{treadStep((meta.treadLevel || 0) + 1, 0)}</em> speed per step{treadPrice !== null && <> ▸ <em>+{treadStep((meta.treadLevel || 0) + 2, 0)}</em></>} (your frame upgrades too!)</small>
        {treadPrice !== null ? <Price price={treadPrice} cash={cash} onClick={() => buy('treadmill')} /> : <div className="owned">MAX LEVEL</div>}
      </div>
      <div className="grid3">
        {SPEED_PACKS.map((pack, i) => (
          <div key={pack.id} className="card small theme-blue">
            {pack.best && <span className="best">BEST DEAL!</span>}
            {i < 3 ? <ShoeArt size={84} count={i + 1} /> : <ChestArt size={84} fill="shoes" />}
            <b className="amount"><em>+{formatNumber(pack.amount)}</em> SPEED</b>
            <BuyRow price={pack.price} cash={cash} onBuy={() => buy('speed', pack.id)} gift={{ kind: 'speed', id: pack.id }} />
          </div>
        ))}
      </div>

      {/* ---------------- money (paid with snowflakes) */}
      <h3 className="section green" id="shop-money">MONEY <small>You have <SnowflakeArt size={22} /> {formatNumber(meta.snowflakes || 0)}</small></h3>
      <div className="grid-money">
        {MONEY_PACKS.map((pack, i) => (
          <div key={pack.id} className={`card small theme-green${pack.wide ? ' wide-cell' : ''}`}>
            {i < 3 ? <CashStackArt size={84} count={i + 1} /> : i === 3 ? <MoneyBagArt size={84} /> : <VaultArt size={84} />}
            <b className="amount">{money(moneyPackCash(pack.id, income))}</b>
            <Price price={pack.snowflakes} cash={meta.snowflakes || 0} onClick={() => buy('money', pack.id)} wide currency="snow" />
          </div>
        ))}
      </div>
    </Popup>
  );
}

// ------------------------------------------------------------------ index

export function IndexPopup({ ui }) {
  const { meta, act } = ui;
  const [tab, setTab] = useState('normal');
  const [picked, setPicked] = useState(null); // { pet, area }
  if (!meta) return null;
  const areas = INDEX_AREAS.filter((a) => (tab === 'normal' ? !a.limited : a.limited));
  const allIds = [...new Set(INDEX_AREAS.flatMap(areaPets))];
  const found = allIds.filter((id) => meta.discovered.includes(id)).length;
  const sel = picked && areas.some((a) => a.id === picked.area.id) ? picked : { pet: areaPets(areas[0])[0], area: areas[0] };
  const known = meta.discovered.includes(sel.pet);
  const areaIds = areaPets(sel.area);
  const complete = areaIds.every((id) => meta.discovered.includes(id));
  const claimed = meta.claimed.includes(sel.area.id);
  const ready = INDEX_AREAS.filter((a) => !meta.claimed.includes(a.id) && areaPets(a).every((id) => meta.discovered.includes(id))).length;
  const rarity = PETS[sel.pet].rarity;
  const owned = ui.allPets.filter((p) => p.id === sel.pet).sort((a, b) => b.cash - a.cash)[0];
  const tabs = (
    <div className="index-tabs">
      <button type="button" className={tab === 'normal' ? 'on' : ''} onClick={() => setTab('normal')}>Normal</button>
      <button type="button" className={tab === 'limited' ? 'on' : ''} onClick={() => setTab('limited')}>Limited</button>
    </div>
  );
  return (
    <Popup title="Index" theme="cyan" wide side={tabs} extra={<span className="index-count">{found}/{allIds.length}</span>}>
      <div className="index">
        <div className="index-main">
          <div className="index-list">
            {areas.map((area) => {
              const ids = areaPets(area);
              const n = ids.filter((id) => meta.discovered.includes(id)).length;
              return (
                <div key={area.id} className="index-area">
                  <div className="area-tile" style={{ background: `linear-gradient(170deg, ${area.colors[0]}, ${area.colors[1]})` }}>
                    <b>{area.name}</b><small>{n}/{ids.length}{meta.claimed.includes(area.id) ? ' ✓' : ''}</small>
                  </div>
                  <div className="area-pets">
                    {ids.map((id) => {
                      const has = meta.discovered.includes(id);
                      return (
                        <button
                          key={id} type="button"
                          className={`index-pet${sel.pet === id && sel.area.id === area.id ? ' sel' : ''}`}
                          style={{ '--rar': RARITY_COLOR[PETS[id].rarity] }}
                          onClick={() => setPicked({ pet: id, area })}
                        >
                          <small>{has ? PETS[id].name : '???'}</small>
                          <PetPic id={id} size={58} hidden={!has} />
                          {has && !meta.claimed.includes(area.id) && <i className="new-dot">!</i>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className={`claim-all${ready ? '' : ' poor'}`} disabled={!ready} onClick={() => act('claimAllIndex')}>
            <BookArt size={56} /><span>Claim!({ready})</span>
          </button>
        </div>
        <div className="index-side">
          <div className="index-detail">
            <div className="detail-pic"><PetPic id={sel.pet} size={120} hidden={!known} /></div>
            <b>{known ? PETS[sel.pet].name : '???'}</b>
            <span style={{ color: RARITY_COLOR[rarity] }}>{rarity}</span>
            <em>{owned ? `${money(owned.cash)}/s` : '???'}</em>
          </div>
          <div className="index-reward">
            <b>Rewards:</b>
            <div className="reward-row">
              <div><ShoeArt size={40} /><span>+{formatNumber(sel.area.reward.speed)}</span></div>
              <div><CashStackArt size={40} /><span>{money(sel.area.reward.cash)}</span></div>
            </div>
            {claimed ? <div className="owned">CLAIMED</div> : (
              <button type="button" className={`buy wide${complete ? '' : ' locked'}`} disabled={!complete} onClick={() => act('claimIndex', { id: sel.area.id })}>
                {complete ? 'CLAIM' : 'LOCKED'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Popup>
  );
}

// ------------------------------------------------------------------ rebirth

export function RebirthPopup({ ui }) {
  const { meta, stats, act, allPets } = ui;
  if (!meta) return null;
  const r = meta.rebirths;
  const need = rebirthNeed(r);
  const area = areaById(need.area);
  const have = allPets.filter((p) => petFromArea(p, area)).length;
  const hasPet = have > 0;
  const hasCash = stats.cash >= need.cash;
  return (
    <Popup title={<><RebirthArt size={40} /> REBIRTH <em>{r} ➜ {r + 1}</em></>} theme="purple">
      <p className="rebirth-sub">Start again, but stronger: earn more cash!</p>
      <div className="rebirth-up">
        <b>UPGRADES</b>
        <div className="reward-row big">
          <div><CashArt size={84} /><span>x{rebirthCashMult(r)} ➜ x{rebirthCashMult(r + 1)} CASH</span></div>
        </div>
      </div>
      <div className="rebirth-need">
        <div className={`need${hasPet ? ' met' : ''}`}><PawArt size={44} /><span>{Math.min(1, have)} / 1 {area.name.toUpperCase()} PET</span></div>
        <div className={`need${hasCash ? ' met' : ''}`}>
          <CashArt size={44} />
          <div className="need-bar"><i style={{ width: `${Math.min(1, stats.cash / need.cash) * 100}%` }} /><span>${formatNumber(Math.min(stats.cash, need.cash))} / ${formatNumber(need.cash)}</span></div>
        </div>
      </div>
      <button type="button" className={`rebirth-go${hasPet && hasCash ? '' : ' poor'}`} disabled={!hasPet || !hasCash} onClick={() => act('rebirth')}>
        REBIRTH!
        <small>You lose your cash + the required pet. Scythes, speed and other pets stay.</small>
      </button>
    </Popup>
  );
}

// ------------------------------------------------------------------ side panels

const closePanel = () => uiStore.set({ panel: null });

// The giant eggs you are growing (hit in the last 2 minutes), and Grow All to finish them now.
export function EggsPanel({ ui }) {
  const { stats, act } = ui;
  const eggs = ui.growing || [];
  const price = eggs.reduce((sum, e) => sum + Math.ceil(treeReward(e.tree) * GROW_ALL_MULT * e.hp / treeHp(e.tree)), 0);
  return (
    <div className="panel">
      <button type="button" className="panel-close" onClick={closePanel} aria-label="Close">&gt;</button>
      <div className="panel-head tan">
        <b>Eggs</b>
        <button type="button" className="grow-all" disabled={!eggs.length || stats.cash < price} onClick={() => act('growAll')}>
          Grow All{eggs.length ? <small>{money(price)}</small> : null}
        </button>
      </div>
      <div className="panel-body">
        {!eggs.length && <p className="empty">Hit a giant egg with your scythe to start growing it!</p>}
        {eggs.map((e) => {
          const grown = 1 - e.hp / e.max;
          return (
            <div key={e.tree.id} className="egg-row">
              <EggArt size={50} color={EGGS[e.egg]?.color} />
              <div>
                <b>{e.name}</b>
                <div className="egg-bar"><i style={{ width: `${grown * 100}%` }} /><span>{Math.floor(grown * 100)}% grown</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PetsPanel({ ui }) {
  const { meta, stats, act, allPets } = ui;
  if (!meta) return null;
  const on = new Set(meta.equipped);
  const list = [...allPets].sort((a, b) => (on.has(b.uid) - on.has(a.uid)) || b.cash - a.cash);
  const price = slotPrice(meta.slots);
  return (
    <div className="panel">
      <button type="button" className="panel-close" onClick={closePanel} aria-label="Close">&gt;</button>
      <div className="panel-head copper">
        <b>Pets {meta.equipped.length}/{meta.slots}</b>
      </div>
      <div className="panel-body list">
        {!list.length && <p className="empty">No pets yet! Grow an egg and bring its pet home.</p>}
        {list.map((pet) => {
          const def = PETS[pet.id];
          const equipped = on.has(pet.uid);
          const mut = MUTATIONS[pet.mut];
          return (
            <div key={pet.uid} className={`pet-row${equipped ? ' on' : ''}`}>
              <div className="pet-row-pic"><PetPic id={pet.id} size={52} /></div>
              <div className="pet-row-text">
                <b>{mut && <span style={{ color: mut.color }}>{mut.name} </span>}{def.name}</b>
                <small style={{ color: RARITY_COLOR[def.rarity] }}>{def.rarity}</small>
              </div>
              <div className="pet-row-right">
                <em>{money(pet.cash)}/s</em>
                <button type="button" className={equipped ? 'unequip' : 'equip'} onClick={() => act(equipped ? 'unequipPet' : 'equipPet', { uid: pet.uid })}>
                  {equipped ? 'Unequip' : 'Equip'}
                </button>
              </div>
            </div>
          );
        })}
        {price !== null && (
          <div className="slot-card">
            <b><PawArt size={34} color="#ffcf33" /> +1 Animal Slot</b>
            <Price price={price} cash={stats.cash} onClick={() => act('buySlots')} wide />
          </div>
        )}
      </div>
      {list.length > 0 && <button type="button" className="equip-best" onClick={() => act('equipBest')}>Equip Best</button>}
    </div>
  );
}

// ------------------------------------------------------------------ what came out of shop eggs

export function OpenedReveal({ opened }) {
  const shown = opened.pets.slice(0, 24);
  return (
    <div className="pop-backdrop" onPointerDown={(e) => e.target === e.currentTarget && uiStore.set({ opened: null })}>
      <div className="opened">
        <h2>You got {opened.pets.length} pet{opened.pets.length > 1 ? 's' : ''}!</h2>
        <div className="opened-grid">
          {shown.map((pet, i) => (
            <div key={i} className="opened-pet" style={{ '--rar': RARITY_COLOR[PETS[pet.id].rarity], animationDelay: `${i * 0.06}s` }}>
              <PetPic id={pet.id} size={72} />
              <b>{petLabel(pet)}</b>
              <small>${formatNumber(pet.cash)}/s</small>
            </div>
          ))}
        </div>
        {opened.pets.length > shown.length && <p>+{opened.pets.length - shown.length} more in your pets</p>}
        <button type="button" className="buy wide" onClick={() => uiStore.set({ opened: null })}>Awesome!</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Starting Place shops (open on walking up)

// A row of big cards that scrolls sideways.
function CardRow({ children }) {
  return <div className="card-row" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>{children}</div>;
}

const RARITY_THEME = { Common: 'white', Uncommon: 'lime', Rare: 'blue', Epic: 'purple', Legendary: 'red', Mythic: 'gold', Secret: 'grey', Celestial: 'pink' };
const rarityColor = (r) => RARITY_COLOR[r] || EXTRA_RARITY_COLOR[r] || '#fff';

export function AxeShopPopup({ ui, onBuy, onEquip }) {
  const { stats } = ui;
  const axes = AXES.filter((a) => a.price > 0);
  const owned = axes.filter((a) => stats.axes.includes(a.id)).length;
  return (
    <Popup title="Scythe Shop" theme="violet" wide>
      <div className="shop-sub">{owned} / {axes.length} OWNED · ${formatNumber(stats.cash)}</div>
      <CardRow>
        {axes.map((axe) => {
          const has = stats.axes.includes(axe.id);
          const on = stats.axe === axe.id;
          return (
            <div key={axe.id} className={`item-card theme-${RARITY_THEME[axe.rarity]}`}>
              <b className="item-name">{axe.name}</b>
              <span className="item-rarity" style={{ color: rarityColor(axe.rarity) }}>{axe.rarity}</span>
              <div className="item-art"><ScytheArt size={190} head={axe.head} handle={axe.handle} /></div>
              <div className="item-stat"><em className="blue">{formatNumber(axe.power)}</em> Power</div>
              {on ? <button type="button" className="buy wide" disabled>Equipped</button>
                : has ? <button type="button" className="buy wide" onClick={() => onEquip(axe.id)}>Equip</button>
                  : <Price price={axe.price} cash={stats.cash} onClick={() => onBuy(axe.id)} wide />}
            </div>
          );
        })}
      </CardRow>
    </Popup>
  );
}

// A blocky runner with a flowing cape-trail, in the trail's colours.
function RunnerArt({ trail, size = 190 }) {
  const id = `tr-${trail.id}`;
  const stripes = trail.id === 'zebra';
  const [a, b] = [trail.colors[0], trail.colors[trail.colors.length - 1]];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {trail.colors.map((c, i) => <stop key={i} offset={i / Math.max(1, trail.colors.length - 1)} stopColor={c} />)}
        </linearGradient>
        <pattern id={`${id}-z`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="8" height="8" fill="#fff" /><rect width="4" height="8" fill="#14141a" />
        </pattern>
      </defs>
      <path d="M44 30 C26 16 10 22 4 14 C8 30 2 36 10 46 C4 50 6 60 16 62 C22 52 34 46 44 44 Z" fill={stripes ? `url(#${id}-z)` : `url(#${id})`} stroke="#14141a" strokeWidth="2" opacity="0.9" />
      <g fill={stripes ? `url(#${id}-z)` : `url(#${id})`} stroke="#14141a" strokeWidth="2.2" strokeLinejoin="round">
        <rect x="52" y="8" width="20" height="18" rx="2" transform="rotate(8 62 17)" />
        <rect x="44" y="28" width="22" height="26" rx="2" transform="rotate(14 55 41)" />
        <rect x="30" y="32" width="10" height="20" rx="2" transform="rotate(-50 35 42)" />
        <rect x="66" y="34" width="9" height="20" rx="2" transform="rotate(40 70 44)" />
        <rect x="38" y="54" width="11" height="26" rx="2" transform="rotate(35 43 67)" />
        <rect x="56" y="56" width="11" height="26" rx="2" transform="rotate(-20 61 69)" />
        <rect x="26" y="74" width="16" height="9" rx="2" transform="rotate(35 34 78)" />
        <rect x="58" y="80" width="16" height="9" rx="2" />
      </g>
      <path d="M56 12 L60 22" stroke="#fff" strokeWidth="2.4" opacity="0.7" strokeLinecap="round" />
      {!stripes && <circle cx="80" cy="18" r="2" fill={b} opacity="0.9" />}
      {!stripes && <circle cx="22" cy="30" r="1.6" fill={a} opacity="0.9" />}
    </svg>
  );
}

export function TrailsShopPopup({ ui }) {
  const { meta, stats, act } = ui;
  if (!meta) return null;
  return (
    <Popup title="Trails Shop" theme="sky" wide>
      <div className="shop-sub">Trails multiply all the speed you gain (treadmill and running) · ${formatNumber(stats.cash)}</div>
      <CardRow>
        {TRAILS.map((trail) => {
          const has = meta.trails.includes(trail.id);
          const on = meta.trail === trail.id;
          return (
            <div key={trail.id} className={`item-card theme-${RARITY_THEME[trail.rarity]}`}>
              <b className="item-name">{trail.name}</b>
              <span className="item-rarity" style={{ color: rarityColor(trail.rarity) }}>{trail.rarity}</span>
              <div className="item-art"><RunnerArt trail={trail} /></div>
              <div className="item-stat"><em>x{formatNumber(trail.mult)}</em> Speed</div>
              {on ? <button type="button" className="buy wide" onClick={() => act('equipTrail', { id: '' })}>Unequip</button>
                : has ? <button type="button" className="buy wide" onClick={() => act('equipTrail', { id: trail.id })}>Equip</button>
                  : <Price price={trail.price} cash={stats.cash} onClick={() => act('buyTrail', { id: trail.id })} wide />}
            </div>
          );
        })}
      </CardRow>
    </Popup>
  );
}

const SORTS = {
  Rarity: (a, b) => RARITIES.indexOf(PETS[b.id].rarity) - RARITIES.indexOf(PETS[a.id].rarity) || b.cash - a.cash,
  'Cash/s': (a, b) => b.cash - a.cash,
  Value: (a, b) => petSellValue(b) - petSellValue(a),
  Newest: (a, b) => b.uid - a.uid,
};

export function SellShopPopup({ ui }) {
  const { meta, act, allPets } = ui;
  const [sort, setSort] = useState('Rarity');
  const [picked, setPicked] = useState(() => new Set());
  if (!meta) return null;
  const locked = new Set(meta.locked);
  const equipped = new Set(meta.equipped);
  const pets = [...allPets].sort(SORTS[sort]);
  const chosen = pets.filter((p) => picked.has(p.uid) && !locked.has(p.uid));
  const total = chosen.reduce((sum, p) => sum + petSellValue(p), 0);
  const toggle = (uid) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(uid)) next.delete(uid); else next.add(uid);
    return next;
  });
  // everything that is not locked or equipped (equipped pets can still be picked one by one)
  const selectAll = () => setPicked(new Set(pets.filter((p) => !locked.has(p.uid) && !equipped.has(p.uid)).map((p) => p.uid)));
  const sell = () => {
    act('sellPets', { uids: chosen.map((p) => p.uid) });
    setPicked(new Set());
  };
  return (
    <div className="pop-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="sell">
        <div className="sell-head">
          <h2>SELL SHOP</h2>
          <button type="button" className="pop-x small" onClick={close} aria-label="Close">X</button>
        </div>
        <div className="sell-sort">
          <b>SORT:</b>
          {Object.keys(SORTS).map((name) => (
            <button key={name} type="button" className={sort === name ? 'on' : ''} onClick={() => setSort(name)}>{name}</button>
          ))}
          <span className="sell-count">{pets.length}/{MAX_PETS} Pets</span>
        </div>
        <div className="sell-grid">
          {!pets.length && <p className="empty">No pets to sell yet!</p>}
          {pets.map((pet) => {
            const def = PETS[pet.id];
            const isLocked = locked.has(pet.uid);
            return (
              <div key={pet.uid} className={`sell-pet${picked.has(pet.uid) && !isLocked ? ' sel' : ''}${isLocked ? ' locked' : ''}`} onClick={() => !isLocked && toggle(pet.uid)}>
                <button type="button" className="lock" title={isLocked ? 'Unlock' : 'Lock (never sold)'} onClick={(e) => { e.stopPropagation(); act('lockPet', { uid: pet.uid }); }}>
                  {isLocked ? '🔒' : '🔓'}
                </button>
                {equipped.has(pet.uid) && <span className="eq">EQUIPPED</span>}
                <PetPic id={pet.id} size={86} />
                <b>{def.name}</b>
                <span className="rar" style={{ color: RARITY_COLOR[def.rarity] }}>{def.rarity.toUpperCase()}</span>
                <small>${formatNumber(pet.cash)}/s</small>
                <em>${formatNumber(petSellValue(pet))}</em>
              </div>
            );
          })}
        </div>
        <div className="sell-foot">
          <button type="button" className="sel-all" onClick={selectAll}>SELECT ALL</button>
          <div className="sell-total"><CashArt size={52} /><span>${formatNumber(total)}</span></div>
          <button type="button" className="sell-go" disabled={!chosen.length} onClick={sell}>SELL</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ invite friends (the Invite Friend pad)

export function InvitePopup({ ui }) {
  const friends = ui.friends || [];
  const [sent, setSent] = useState(() => new Set());
  const [copied, setCopied] = useState(false);
  const here = ui.meta?.friendsHere || 0;
  const invite = async (id) => {
    const ok = await bloxity.inviteFriend(id, ui.roomId);
    if (ok) setSent((s) => new Set(s).add(id));
    else uiStore.set({ toast: { text: 'Could not send the invite', color: '#ff5a5a', at: performance.now() } });
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bloxity.inviteLink(ui.roomId));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const sorted = [...friends].sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));
  return (
    <Popup title="Invite Friends" theme="lime">
      <div className="invite-boost">
        <CashArt size={64} />
        <div>
          <b>Each Friend = <em>+{Math.round(FRIEND_BOOST * 100)}%</em> Cash Boost</b>
          <span>Friends here now: <em>{here}</em> → <em>x{friendCashMult(here).toFixed(1)}</em> cash (up to {FRIEND_MAX} friends)</span>
        </div>
      </div>
      <div className="invite-list">
        {!bloxity.user ? (
          <div className="invite-signin">
            <p className="empty small">Sign in to Bloxity to see your friends and invite them!</p>
            <button type="button" className="buy" onClick={() => bloxity.login()}>Sign in</button>
          </div>
        ) : ui.friendsLoading && !sorted.length ? (
          <p className="empty small">Loading friends...</p>
        ) : !sorted.length ? (
          <p className="empty small">No Bloxity friends yet. Share the link below!</p>
        ) : null}
        {sorted.map((f) => (
          <div key={f.id} className="invite-row">
            {f.avatar ? <img src={f.avatar} alt="" width="48" height="48" /> : <span className="invite-face">{f.name[0]?.toUpperCase()}</span>}
            <div className="invite-name"><b>{f.name}</b><small className={f.online ? 'on' : ''}>{f.online ? 'Online' : 'Offline'}</small></div>
            <button type="button" className="buy" disabled={sent.has(f.id)} onClick={() => invite(f.id)}>{sent.has(f.id) ? 'Sent!' : 'Invite'}</button>
          </div>
        ))}
      </div>
      <button type="button" className="buy wide invite-link" onClick={copyLink}>{copied ? 'Link copied!' : 'Copy invite link'}</button>
    </Popup>
  );
}

// ------------------------------------------------------------------ offline cash (shown on joining)

function awayText(ms) {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

// "Offline Earnings! / WELCOME BACK!": shown on opening the game after time away. Claim what the
// pets earned, or pay the same amount again to claim it 3 times over. X claims it too (never lost).
export function OfflinePopup({ ui }) {
  const { offline, stats, act } = ui;
  const claim = (triple) => {
    act('claimOffline', { triple });
    uiStore.set({ offline: null });
  };
  const canTriple = offline.amount > 0 && stats.cash >= offline.price;
  return (
    <div className="pop-backdrop">
      <div className="pop pop-green offline">
        <div className="pop-head">
          <h2>Offline Earnings!</h2>
          <button type="button" className="pop-x" onClick={() => claim(false)} aria-label="Close">X</button>
        </div>
        <div className="pop-body offline-body">
          <div className="offline-card">
            <b className="offline-title">WELCOME BACK!</b>
            <small className="offline-away">Time Offline: {awayText(offline.away)}</small>
            <div className="offline-main">
              <div className="offline-cash"><div className="rays" /><CashStackArt size={210} /></div>
              <div className="offline-right">
                <span className="offline-amount">${formatNumber(offline.amount)}</span>
                <div className="offline-btns">
                  <button type="button" className="claim" onClick={() => claim(false)}>CLAIM!</button>
                  <div className="triple-wrap">
                    {offline.amount > 0 && <i className="triple-price">${formatNumber(offline.price)}</i>}
                    <button type="button" className={`triple${canTriple ? '' : ' poor'}`} disabled={!canTriple} onClick={() => claim(true)}>CLAIM x3!</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Winter Fusion (the machine by the track)

// Every kind of pet you have 3 or more of: fuse 3 into one Winter pet that earns 1.5x the three together.
// The three used are the unequipped (then weakest) unlocked ones.
// winter = the Winter Fusion (costs Snowflakes, the pet comes out Winter); otherwise the Fuse Machine.
export function FusionPopup({ ui, winter = false }) {
  const { meta, allPets, act } = ui;
  if (!meta) return null;
  const locked = new Set(meta.locked);
  const equipped = new Set(meta.equipped);
  const groups = new Map();
  for (const p of allPets) if (!locked.has(p.uid)) groups.set(p.id, [...(groups.get(p.id) || []), p]);
  const ready = [...groups.entries()]
    .filter(([, pets]) => pets.length >= FUSION.count)
    .map(([id, pets]) => {
      const pick = [...pets].sort((a, b) => (equipped.has(a.uid) - equipped.has(b.uid)) || a.cash - b.cash).slice(0, FUSION.count);
      return { id, count: pets.length, pick, cash: Math.round(fusedCash(pick) * (winter ? MUTATIONS.winter.mult : 1)) };
    })
    .sort((a, b) => b.cash - a.cash);
  return (
    <Popup title={winter ? <>❄ Winter Fusion</> : 'Fuse Machine'} theme="cyan" wide>
      {winter
        ? <p className="fusion-sub">Put <b>{FUSION.count}</b> pets of the same kind in: out comes one <em>Winter</em> pet that earns <b>x{FUSION.boost * MUTATIONS.winter.mult}</b> what all {FUSION.count} earned! Costs <b><SnowflakeArt size={20} /> {FUSION.winterSnowflakes}</b> (you have {formatNumber(meta.snowflakes || 0)}).</p>
        : <p className="fusion-sub">Put <b>{FUSION.count}</b> pets of the same kind in: out comes one pet that earns <b>x{FUSION.boost}</b> what all {FUSION.count} earned! Free!</p>}
      {!ready.length && <p className="empty">You need {FUSION.count} pets of the same kind. Go grow more eggs!</p>}
      <div className="grid3">
        {ready.map((r) => (
          <div key={r.id} className="card small theme-blue fusion-card">
            <div className="fusion-in">{r.pick.map((p) => <PetPic key={p.uid} id={p.id} size={52} />)}</div>
            <b className="card-name small-name">{PETS[r.id].name} <small>(you have {r.count})</small></b>
            <span className="fusion-arrow">▼</span>
            <PetPic id={r.id} size={86} />
            <b className="amount">{winter && <em className="winter">Winter </em>}{PETS[r.id].name}</b>
            <b className="amount"><em>{money(r.cash)}/s</em></b>
            <button type="button" className="buy wide" disabled={winter && (meta.snowflakes || 0) < FUSION.winterSnowflakes} onClick={() => act('fuse', { uids: r.pick.map((p) => p.uid), winter })}>FUSE!</button>
          </div>
        ))}
      </div>
    </Popup>
  );
}

// ------------------------------------------------------------------ the Alien Crate on its pad

export function CratePopup({ ui }) {
  const now = useNow(1000);
  const { meta, stats, act } = ui;
  if (!meta) return null;
  const item = LIMITED.alienCrate;
  const leftN = Math.max(0, item.stock - (meta.bought?.alienCrate || 0));
  void now;
  return (
    <Popup title="Alien Crate" theme="purple">
      <div className="crate-pop">
        <div className="crate-art"><CrateArt size={170} /></div>
        <div className="crate-info">
          <b className="crate-left">{leftN ? `${leftN} Left!` : 'SOLD OUT!'}</b>
          <b className="crate-time">Ends in {clock(featuredEndsAt(Date.now()) - Date.now())}</b>
          <p>{item.info}</p>
          <div className="mystery-rates">
            {eggRates(FEATURED.egg, CRATE_LUCK).map(([pid, pct]) => (
              <span key={pid}><PetPic id={pid} size={40} hidden={!meta.discovered.includes(pid)} />{pct}%</span>
            ))}
          </div>
          {leftN > 0
            ? <BuyRow price={limitedPrice('alienCrate', baseIncome(ui))} cash={stats.cash} onBuy={() => act('buy', { kind: 'limited', id: 'alienCrate' })} gift={{ kind: 'limited', id: 'alienCrate' }} />
            : <div className="owned">SOLD OUT</div>}
        </div>
      </div>
    </Popup>
  );
}

// ------------------------------------------------------------------ the Inferno Dragon (for sale on its fiery pad)

export function DragonPopup({ ui }) {
  const { meta, stats, act, allPets } = ui;
  if (!meta) return null;
  const item = LIMITED.infernoDragon;
  const leftN = Math.max(0, item.stock - (meta.bought?.infernoDragon || 0));
  const best = Math.max(0, ...allPets.map((p) => p.cash || 0));
  return (
    <Popup title={<span className="dragon-title">Inferno Dragon</span>} theme="purple">
      <div className="crate-pop">
        <div className="crate-art fire"><PetPic id="infernoDragon" size={180} /></div>
        <div className="crate-info">
          <b className="crate-time">SPECIAL</b>
          <b className="dragon-best">300% Best Pet: {money(Math.max(100, best * item.best))}/s</b>
          <b className="crate-left">{leftN ? `Only ${leftN} left!` : 'SOLD OUT!'}</b>
          <p>A huge dragon of fire. It earns three times what your best pet earns.</p>
          {leftN > 0
            ? <BuyRow price={limitedPrice('infernoDragon', baseIncome(ui))} cash={stats.cash} onBuy={() => act('buy', { kind: 'limited', id: 'infernoDragon' })} gift={{ kind: 'limited', id: 'infernoDragon' }} />
            : <div className="owned">SOLD OUT</div>}
        </div>
      </div>
    </Popup>
  );
}

// ------------------------------------------------------------------ the Feedback mailbox

export function FeedbackPopup({ ui }) {
  const [text, setText] = useState('');
  const send = () => {
    ui.act('feedback', { text });
    setText('');
    close();
  };
  // typing here must never move the player or swing (the game listens for keys on the window)
  const keep = (e) => e.stopPropagation();
  return (
    <Popup title="✉ Feedback" theme="cyan">
      {!ui.meta?.feedbackRewarded && (
        <div className="feedback-reward">
          <b>FREE REWARD!</b>
          <PotionArt color="#35a8ff" symbol="shoe" size={50} /><span>+</span><DustBagArt size={50} color="#a84aff" />
          <small>x1.5 Speed (15m) + Big Lucky Dust for your first message</small>
        </div>
      )}
      <p className="fusion-sub">Ideas, bugs or wishes? Tell us!</p>
      <textarea
        className="feedback-text" value={text} maxLength={FEEDBACK.maxLength} rows={6} placeholder="Write here..."
        onChange={(e) => setText(e.target.value)} onKeyDown={keep} onKeyUp={keep}
      />
      <div className="feedback-foot">
        <small>{text.length}/{FEEDBACK.maxLength}</small>
        <button type="button" className="buy" disabled={text.trim().length < 3} onClick={send}>SEND</button>
      </div>
    </Popup>
  );
}
