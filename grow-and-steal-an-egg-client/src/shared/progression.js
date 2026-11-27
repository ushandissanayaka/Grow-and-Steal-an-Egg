// Shop, boosts, pet slots, the index and rebirths. Shared by client and server; keep both copies
// identical. Everything is bought with in-game cash ($), except the Money packs, which cost
// Snowflakes (earned by hatching eggs and catching falling snowflakes, or bought with cash).
//
// Prices:
//   fixed    passes, speed packs, the Alien Hunters eggs: one price for everyone
//   scaled   potions, server boosts, lucky dust, limited items, snowflakes: the bigger of a floor
//            and some seconds of the buyer's own income, so they stay worth it at every stage
// `rs` on an item is its size in the shop's price scale (how the reference shop ranks it).

import { EGGS, EGG_ORDER, MUTATIONS, PETS, PET_POOLS, RARITIES, RULES } from './gameData.js';

const MINUTE = 60_000;

// floor: rs x $100; otherwise rs x 8 seconds of income
export const scaledPrice = (rs, income) => Math.round(Math.max(rs * 100, (income || 0) * rs * 8));

// ------------------------------------------------------------------ passes (permanent)

export const PASSES = {
  vip: { name: 'VIP', lines: ['+50% Money', '+50% Speed', 'VIP Chat Tag'], price: 255_000, theme: 'gold', icon: 'vip' },
  power2: { name: 'x2 Damage', lines: ['Every scythe hit does', 'x2 damage!'], price: 279_000, theme: 'red', icon: 'damage' },
  cash2: { name: 'x2 Money', lines: ['Earn x2 Money', 'from your Pen!'], price: 115_000, theme: 'gold', icon: 'money' },
  swing2: { name: 'x2 Swing', lines: ['Swing your scythe', 'x2 faster!'], price: 169_000, theme: 'blue', icon: 'swing' },
  growth2: { name: 'x2 Growth', lines: ['Every hit grows eggs', 'x2 faster!'], price: 95_000, theme: 'rainbow', icon: 'growth' },
  goldenCan: { name: 'Golden Can', lines: ['Eggs grow', '+25% faster!'], price: 85_000, theme: 'gold', icon: 'can' },
  lucky2: { name: 'Super Lucky', lines: ['x2 Egg Luck', 'forever!'], price: 169_000, theme: 'orange', icon: 'clover', isNew: true },
  offline2: { name: 'x2 Offline Cash', lines: ['Earn x2 Cash', 'while offline!'], price: 79_000, theme: 'blue', icon: 'moon', isNew: true },
  offline72: { name: '72h Offline', lines: ['Earn offline for', '72h instead of 24h!'], price: 59_000, theme: 'purple', icon: 'alarm', isNew: true },
  mutDoubler: { name: 'Mutation Doubler', lines: ['Every mutation', 'counts x2!'], price: 85_000, theme: 'purple', icon: 'crystals', isNew: true },
  mutTouch: { name: 'Mutation Touch', lines: ['Eggs you hit have a', '2% chance to mutate!'], price: 139_000, theme: 'pink', icon: 'rainbowEgg', isNew: true },
  mutChance2: { name: 'x2 Mutation Chance', lines: ['x2 chance for', 'pets to mutate!'], price: 105_000, theme: 'orange', icon: 'flask', isNew: true },
};
export const PASS_ORDER = ['vip', 'power2', 'cash2', 'swing2', 'growth2', 'goldenCan', 'lucky2', 'offline2', 'offline72', 'mutDoubler', 'mutTouch', 'mutChance2'];

// ------------------------------------------------------------------ power-ups (potions, 15 minutes)

export const POTION_MS = 15 * MINUTE;
export const POTION_MAX_MS = 3 * 60 * MINUTE; // buying more adds time, up to this
export const POTIONS = {
  cash: { name: 'x2 Cash', mult: 2, rs: 30, theme: 'green', color: '#3fcf4b', icon: 'cash' },
  treadmill: { name: 'x2 Treadmill Speed', mult: 2, rs: 30, theme: 'orange', color: '#ff3a3a', icon: 'treadmill' },
  walk: { name: 'x1.5 WalkSpeed', mult: 1.5, rs: 15, theme: 'blue', color: '#35a8ff', icon: 'shoe' },
  swing: { name: 'x1.5 Swing Speed', mult: 1.5, rs: 15, theme: 'purple', color: '#a84aff', icon: 'scythe' },
  growth: { name: 'x1.5 Growing Speed', mult: 1.5, rs: 15, theme: 'orange', color: '#ff8a1a', icon: 'egg' },
};
export const POTION_ORDER = ['cash', 'treadmill', 'walk', 'swing', 'growth'];
export const potionPrice = (id, income) => scaledPrice(POTIONS[id].rs, income);
// x10 of every potion (capped at POTION_MAX_MS each), 27% off
export const BUNDLE = { count: 10, save: 0.27 };
export const bundlePrice = (income) => Math.round(POTION_ORDER.reduce((sum, id) => sum + potionPrice(id, income), 0) * BUNDLE.count * (1 - BUNDLE.save));
export const bundleFullPrice = (income) => POTION_ORDER.reduce((sum, id) => sum + potionPrice(id, income), 0) * BUNDLE.count;

// free every so often: the shop's Free Gift (growing) and Free Boost (swing)
export const FREE_GIFT = { potion: 'growth', ms: 5 * MINUTE, every: 15 * MINUTE };
export const FREE_BOOST = { potion: 'swing', ms: 5 * MINUTE, every: 30 * MINUTE };
// unlocked by claiming the Free Gift once: an Alien Crate and 2 Mega Lucky Dust, once only
export const MEGA_DEAL = { rs: 29, was: 113 };

// ------------------------------------------------------------------ server boosts (everyone here)

export const SERVER_BOOST_MS = 15 * MINUTE;
export const SERVER_BOOST_MAX_MS = 2 * 60 * MINUTE;
export const SERVER_BOOSTS = {
  luck: { name: 'Server Luck!', line: ['1x', '2x'], rs: 29, theme: 'green', icon: 'clover' },
  eggSize: { name: 'Double Egg Size!', line: ['1x', '2x'], rs: 49, theme: 'orange', icon: 'goldEgg', note: 'pets hatched earn x2' },
  money: { name: 'Server Money!', line: ['1x', '2x'], rs: 59, theme: 'gold', icon: 'globe' },
  eggRain: { name: 'Lucky Egg Rain!', line: ['x2 Lucky Eggs fall!'], rs: 85, theme: 'green', icon: 'cloud' },
  mutationStorm: { name: 'Mutation Storm!', line: ['Winter', 'Blood Moon', 'Alien'], rs: 169, theme: 'purple', icon: 'storm' },
};
export const SERVER_BOOST_ORDER = ['luck', 'eggSize', 'money', 'eggRain', 'mutationStorm'];
export const serverBoostPrice = (id, income) => scaledPrice(SERVER_BOOSTS[id].rs * 2, income);
export const EGG_RAIN_EVERY_MS = 12_000;

// ------------------------------------------------------------------ mutations

export const MUTATION_BASE = 0.03;
export function mutationChance({ mutChance2 = false, storm = false, touch = false } = {}) {
  return MUTATION_BASE * (mutChance2 ? 2 : 1) * (storm ? 5 : 1) + (touch ? 0.02 : 0);
}
// Mutation Doubler: the mutation's bonus counts twice (x2 -> x3, x3 -> x5, x5 -> x9)
export const mutationMult = (id, doubler) => (MUTATIONS[id] ? (doubler ? 1 + (MUTATIONS[id].mult - 1) * 2 : MUTATIONS[id].mult) : 1);

// ------------------------------------------------------------------ lucky dust (luck for the next eggs)

// Luck is banked; each egg you hatch uses up to LUCK_PER_HATCH of it: x(1 + used / 100) Luck.
export const LUCK_PER_HATCH = 1000;
export const DUST = {
  small: { name: 'Small Lucky Dust', count: 5, luck: [25, 40], rs: 9, theme: 'blue', color: '#5fd0ff' },
  big: { name: 'Big Lucky Dust', count: 5, luck: [100, 160], rs: 19, theme: 'purple', color: '#a84aff' },
  mega: { name: 'Mega Lucky Dust', count: 5, luck: [500, 750], rs: 39, theme: 'gold', color: '#ffcf33' },
};
export const DUST_ORDER = ['small', 'big', 'mega'];
export const DUST_PACKS = {
  luckyPack: { name: 'Lucky Pack', mega: 10, big: 10, rs: 59, was: 117, theme: 'purple' },
  specialOffer: { name: 'SPECIAL OFFER!', mega: 25, big: 25, luckMs: 10 * MINUTE, rs: 115, was: 283, theme: 'gold' },
};
export const dustPrice = (id, income) => scaledPrice(DUST[id].rs, income);
export const dustPackPrice = (id, income) => scaledPrice(DUST_PACKS[id].rs, income);
export const dustPackWas = (id, income) => scaledPrice(DUST_PACKS[id].was, income);

// ------------------------------------------------------------------ snowflakes and money

export const SNOWFLAKE_PACKS = [
  { id: 'f1', amount: 250, rs: 15 },
  { id: 'f2', amount: 700, rs: 40 },
  { id: 'f3', amount: 2_000, rs: 95 },
  { id: 'f4', amount: 5_000, rs: 225 },
  { id: 'f5', amount: 12_000, rs: 479 },
  { id: 'f6', amount: 30_000, rs: 1_025, best: true },
];
const flakeValue = (income) => Math.max(600, (income || 0) * 3.6); // $ per snowflake, before pack discounts
export const snowflakePrice = (id, income) => {
  const pack = SNOWFLAKE_PACKS.find((p) => p.id === id);
  return pack ? Math.round(pack.amount * flakeValue(income) * (pack.rs / pack.amount) / (15 / 250)) : null;
};
// Money packs cost snowflakes; they pay out half the cheapest bought price, so bought snowflakes
// never turn a profit, while earned ones are free cash.
export const MONEY_PACKS = [
  { id: 'm1', snowflakes: 250 },
  { id: 'm2', snowflakes: 600 },
  { id: 'm3', snowflakes: 1_000 },
  { id: 'm4', snowflakes: 3_000, wide: true },
  { id: 'm5', snowflakes: 6_000, wide: true },
];
export const moneyPackCash = (id, income) => {
  const pack = MONEY_PACKS.find((p) => p.id === id);
  return pack ? Math.round(pack.snowflakes * flakeValue(income) * 0.5) : null;
};
// earned: per egg hatched (more in later stages) and per falling snowflake caught
export const snowflakesForHatch = (zoneIndex) => 2 + Math.max(0, zoneIndex);
export const SNOWFLAKE_CATCH = { amount: 5, everyMs: 15_000 };

// ------------------------------------------------------------------ speed

export const SPEED_PACKS = [
  { id: 's1', amount: 150_000, price: 35_000 },
  { id: 's2', amount: 1_000_000, price: 200_000 },
  { id: 's3', amount: 10_000_000, price: 1_500_000 },
  { id: 's4', amount: 50_000_000, price: 6_000_000 },
  { id: 's5', amount: 250_000_000, price: 25_000_000 },
  { id: 's6', amount: 1_000_000_000, price: 85_000_000, best: true },
];
export const doubleSpeedPrice = (speed) => Math.max(300, Math.round(speed * 0.3));
// Upgrade Treadmill: each level adds +100% to the speed you gain from running
// Every player's frame has a treadmill: running on it earns speed each step (second). It has 5
// levels; each upgrade makes it (and the frame's corner pillars) bigger, adds parts and a new colour,
// and doubles the base speed per step. treadLevel (saved) = level - 1, 0..4.
export const TREADMILL = { maxLevel: 4, prices: [15_000, 250_000, 4_000_000, 60_000_000] };
export const TREAD_STEP = [4, 8, 16, 32, 64];
export const treadmillPrice = (treadLevel) => TREADMILL.prices[treadLevel] ?? null;
// speed earned per step on a level 1..5 treadmill (it also grows a little with your speed)
export const treadStep = (level, speed) => TREAD_STEP[Math.min(4, Math.max(0, level - 1))] + Math.floor(Math.max(0, speed) * 0.003 * level);

// ------------------------------------------------------------------ featured: Alien Hunters eggs

const WEEK = 7 * 24 * 60 * MINUTE;
export const FEATURED = {
  name: 'ALIEN HUNTERS',
  sub: 'Most OP pets in the game!',
  egg: 'alien',
  // what each pet earns; Xeno earns x3 your best pet
  pets: { shadowRaptor: 25_000, voidStalker: 125_000, nightPanther: 1_000_000, riftBeast: 15_000_000, novaDragon: 500_000_000, xeno: 'x3' },
  packs: [
    { count: 1, price: 500_000_000 },
    { count: 3, price: 1_250_000_000 },
    { count: 10, price: 3_850_000_000 },
    { count: 50, price: 11_190_000_000, best: true, was: 27_990_000_000 },
  ],
};
export const featuredEndsAt = (now) => (Math.floor(now / WEEK) + 1) * WEEK;
export const featuredPrice = (count) => FEATURED.packs.find((p) => p.count === count)?.price ?? null;

// [[petId, percent]] chances for one egg (luck makes the rarer ones likelier)
export function eggRates(type, luck = 1) {
  const pool = PET_POOLS[type].map(([id, w]) => [id, w * Math.max(1, luck) ** (RARITIES.indexOf(PETS[id].rarity) * 0.5)]);
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  return pool.map(([id, w]) => [id, Math.round((w / total) * 1000) / 10]);
}

// ------------------------------------------------------------------ limited items

// Mystery eggs: hatch a pet from the best egg you have found so far (Celestial one stage further,
// Godly two), with extra luck.
export const MYSTERY_EGGS = {
  secret: { name: 'Secret', luck: 5, ahead: 0, rs: 75, theme: 'grey', color: '#3a3a44' },
  celestial: { name: 'Celestial', luck: 10, ahead: 1, rs: 139, theme: 'pink', color: '#e04ac8' },
  godly: { name: 'Godly', luck: 20, ahead: 2, rs: 225, theme: 'gold', color: '#ffb21f' },
};
export const MYSTERY_ORDER = ['secret', 'celestial', 'godly'];
export const mysteryPrice = (id, income) => scaledPrice(MYSTERY_EGGS[id].rs, income);
// the best (latest) egg among the pets a player has found
export const bestEggOf = (discovered) => {
  let best = 'chicken';
  for (const egg of EGG_ORDER) if (egg !== 'golden' && PET_POOLS[egg].some(([id]) => discovered.includes(id))) best = egg;
  return best;
};
const STAGE_EGGS = EGG_ORDER.filter((e) => e !== 'golden');
export const mysteryEgg = (id, discovered) => STAGE_EGGS[Math.min(STAGE_EGGS.length - 1, STAGE_EGGS.indexOf(bestEggOf(discovered)) + MYSTERY_EGGS[id].ahead)];

// stock: how many each player can ever buy
export const LIMITED = {
  infernoDragon: { name: 'Inferno Dragon', tag: 'MOST SELLING!', stock: 8, rs: 339, theme: 'pink', pet: 'infernoDragon', best: 3, line: '300% Best Pet' },
  alienCrate: { name: 'Alien Crate', tag: 'LIMITED!', stock: 13, rs: 559, theme: 'purple', info: 'Opens into an Alien Hunters pet, with x5 Luck.' },
  cyberWolf: { name: 'Cyber Wolf', tag: 'BEST VALUE!', stock: 43, rs: 279, theme: 'blue', pet: 'cyberWolf', best: 2, line: '200% Best Pet' },
  megaPack: { name: 'Mega Pack', tag: 'ONE TIME!', stock: 1, rs: 225, was: 675, theme: 'orange', info: '5 of every potion, 10 Mega + 10 Big Lucky Dust, 500 Snowflakes and 30 minutes of cash.' },
};
export const LIMITED_ORDER = ['infernoDragon', 'alienCrate', 'cyberWolf', 'megaPack'];
export const limitedPrice = (id, income) => scaledPrice(LIMITED[id].rs, income);
export const CRATE_LUCK = 5;

// ------------------------------------------------------------------ pets: slots and storage

export const SLOTS = { start: 8, step: 1, max: 20, base: 1_000_000, growth: 1.8 };
export const slotPrice = (slots) => (slots >= SLOTS.max ? null : Math.round(SLOTS.base * SLOTS.growth ** (slots - SLOTS.start)));
export const MAX_PETS = 150; // past this, the weakest unequipped pet is let go

// ------------------------------------------------------------------ the index

export const INDEX_AREAS = [
  { id: 'forest', name: 'Forest', eggs: ['chicken', 'stone'], reward: { speed: 60, cash: 100 }, colors: ['#51ea1f', '#2fa828'] },
  { id: 'autumn', name: 'Savanna', eggs: ['maple'], reward: { speed: 25_000, cash: 50_000 }, colors: ['#f2c84a', '#c88a1f'] },
  { id: 'sakura', name: 'Frozen Peaks', eggs: ['sakura'], reward: { speed: 1_000_000, cash: 1_000_000 }, colors: ['#dff4ff', '#7ab8e0'] },
  { id: 'snow', name: 'Coral Reef', eggs: ['frost'], reward: { speed: 50_000_000, cash: 25_000_000 }, colors: ['#ff9c8a', '#2a9ad6'] },
  { id: 'water', name: 'Sweet Land', eggs: ['ocean'], reward: { speed: 2_000_000_000, cash: 1_000_000_000 }, colors: ['#ff9fd8', '#c86aff'] },
  { id: 'volcano', name: 'Lava Lands', eggs: ['magma'], reward: { speed: 20_000_000_000, cash: 10_000_000_000 }, colors: ['#ff7a1a', '#3a1a1a'] },
  { id: 'heaven', name: 'Dino Valley', eggs: ['heavenly'], reward: { speed: 200_000_000_000, cash: 100_000_000_000 }, colors: ['#f2a41a', '#6a8a3a'] },
  { id: 'candy', name: 'Bamboo Grove', eggs: ['candy'], reward: { speed: 2e12, cash: 1e12 }, colors: ['#7fd84a', '#e65ad8'] },
  { id: 'mushroom', name: 'Scorched Desert', eggs: ['spore'], reward: { speed: 2e13, cash: 1e13 }, colors: ['#e8c47a', '#c8141e'] },
  { id: 'galaxy', name: 'The Void', eggs: ['cosmic'], reward: { speed: 2e14, cash: 1e14 }, colors: ['#b04aff', '#14101c'] },
  { id: 'shop', name: 'Golden Eggs', eggs: ['golden'], reward: { speed: 500_000_000, cash: 250_000_000 }, colors: ['#ffcf33', '#d89a10'], limited: true },
  { id: 'alien', name: 'Alien Hunters', eggs: ['alien'], reward: { speed: 5e10, cash: 5e10 }, colors: ['#35e8ff', '#3a1a5a'], limited: true },
  { id: 'limited', name: 'Limited Pets', eggs: ['limited'], reward: { speed: 1e10, cash: 1e10 }, colors: ['#ff3a3a', '#35a8ff'], limited: true },
];
export const areaPets = (area) => [...new Set(area.eggs.flatMap((egg) => PET_POOLS[egg].map(([id]) => id)))];
export const areaById = (id) => INDEX_AREAS.find((a) => a.id === id);

// The egg a pet came from (older saves have none: the first egg that hatches that pet).
export const petEgg = (pet) => (pet.egg && EGGS[pet.egg] ? pet.egg : Object.keys(PET_POOLS).find((e) => PET_POOLS[e].some(([id]) => id === pet.id)));
export const petFromArea = (pet, area) => area.eggs.includes(petEgg(pet));

// ------------------------------------------------------------------ rebirth

const REBIRTH_AREAS = ['autumn', 'sakura', 'snow', 'water', 'volcano', 'heaven', 'candy', 'mushroom', 'galaxy'];
// Rebirth r -> r+1 costs this much cash and one pet from that area (both are lost).
export const rebirthNeed = (r) => ({ cash: 10_000 * 25 ** r, area: REBIRTH_AREAS[Math.min(r, REBIRTH_AREAS.length - 1)] });
export const rebirthCashMult = (r) => 1 + r;           // x2 after the first, x3 after the second...
export const rebirthPadBonus = (r) => Math.min(3, r);  // +1 egg on the drop pad per rebirth, up to +3

// ------------------------------------------------------------------ "grow all" (the Eggs panel)

// Finishing the eggs you are growing costs a few times what they pay when they hatch.
export const GROW_ALL_MULT = 3;

// ------------------------------------------------------------------ what everything adds up to

// passes: list of pass ids; active(id): is that potion running; rebirths: count; server: running server boosts
export function perks(passes, active, rebirths = 0, trail = '', treadLevel = 0, server = {}) {
  const has = (id) => passes.includes(id);
  const potion = (id) => (active(id) ? POTIONS[id].mult : 1);
  const trailMult = TRAILS.find((t) => t.id === trail)?.mult || 1;
  return {
    cash: rebirthCashMult(rebirths) * (has('vip') ? 1.5 : 1) * (has('cash2') ? 2 : 1) * potion('cash') * (server.money ? 2 : 1),
    treadmill: (has('vip') ? 1.5 : 1) * potion('treadmill') * trailMult,
    run: (has('vip') ? 1.5 : 1) * potion('treadmill') * trailMult,
    walk: potion('walk'),
    swing: (has('swing2') ? 2 : 1) * potion('swing'),
    power: has('power2') ? 2 : 1,
    growth: (has('growth2') ? 2 : 1) * (has('goldenCan') ? 1.25 : 1) * potion('growth'),
    luck: (has('lucky2') ? 2 : 1) * (server.luck ? 2 : 1) * (active('luck') ? 2 : 1),
    padCap: RULES.padCap + rebirthPadBonus(rebirths),
  };
}

export const petName = (id) => PETS[id]?.name || id;

// ------------------------------------------------------------------ trails (Trails Shop)

// A trail streams behind you and multiplies all the speed you gain (treadmill and running).
// Each one costs ~8x the one before and gives ~1.7x more, so the next trail is always the goal.
export const TRAILS = [
  { id: 'white', name: 'White Trail', rarity: 'Common', mult: 2, price: 75, colors: ['#ffffff', '#c8ccd4'] },
  { id: 'green', name: 'Green Trail', rarity: 'Uncommon', mult: 4, price: 600, colors: ['#7dff3f', '#2fbf2a'] },
  { id: 'blue', name: 'Blue Trail', rarity: 'Rare', mult: 7, price: 5_000, colors: ['#5fd0ff', '#1f6ad6'] },
  { id: 'purple', name: 'Purple Trail', rarity: 'Epic', mult: 12, price: 40_000, colors: ['#d98cff', '#7a2fd6'] },
  { id: 'fire', name: 'Fire Trail', rarity: 'Legendary', mult: 20, price: 320_000, colors: ['#ffd21f', '#ff3a1a'] },
  { id: 'rainbow', name: 'Rainbow Trail', rarity: 'Mythic', mult: 35, price: 2_500_000, colors: ['#ff5fa8', '#ffd21f', '#5ff04a', '#35a8ff', '#a86aff'] },
  { id: 'zebra', name: 'Zebra Trail', rarity: 'Secret', mult: 60, price: 20_000_000, colors: ['#ffffff', '#14141a'] },
  { id: 'crystal', name: 'Crystal Trail', rarity: 'Celestial', mult: 100, price: 160_000_000, colors: ['#ff8fd0', '#e0207a'] },
  { id: 'moonlight', name: 'Moonlight Trail', rarity: 'Celestial', mult: 170, price: 1_200_000_000, colors: ['#c8fff4', '#5fd6c8'] },
];
export const trailById = (id) => TRAILS.find((t) => t.id === id) || null;
// rarity colours for the two trail-only rarities
export const EXTRA_RARITY_COLOR = { Secret: '#5a5e68', Celestial: '#ffc531' };

// ------------------------------------------------------------------ selling pets (Sell Shop)

export const SELL_SECONDS = 25; // a pet sells for 25 seconds of what it earns
export const petSellValue = (pet) => Math.max(5, Math.round((pet.cash || 0) * SELL_SECONDS));

// ------------------------------------------------------------------ offline cash

// While away, equipped pets keep earning at half rate (passes and rebirths count, potions do not),
// for up to 24 hours (72 with the 72h Offline pass; x2 Offline Cash doubles it). On return: claim
// it, or pay the same amount again to claim it 3 times over.
export const OFFLINE = { minMs: 60_000, maxMs: 24 * 60 * MINUTE, longMs: 72 * 60 * MINUTE, rate: 0.5, triple: 3 };
export const offlineAmount = (incomePerSecond, ms, maxMs = OFFLINE.maxMs) =>
  Math.round(incomePerSecond * OFFLINE.rate * Math.min(ms, maxMs) / 1000);
export const offlineTriplePrice = (amount) => amount;

// ------------------------------------------------------------------ friends

// Each friend playing in the same server adds 10% cash (pets and trees), up to 5 friends.
export const FRIEND_BOOST = 0.1;
export const FRIEND_MAX = 5;
export const friendCashMult = (friendsHere) => 1 + FRIEND_BOOST * Math.min(FRIEND_MAX, friendsHere);

// ------------------------------------------------------------------ Winter Fusion and the ad board

// The Fuse Machine: three pets of the same kind fuse into one that earns 1.5x what the three earned
// together. The Winter Fusion does the same for some Snowflakes, and the pet comes out Winter
// (x2 on top). Rain makes eggs grow faster; snowfall doubles the Snowflakes from hatching.
export const FUSION = { count: 3, boost: 1.5, mutation: 'winter', winterSnowflakes: 300 };
export const WEATHER_PERKS = { rainGrowth: 1.5, snowFlakes: 2 };
// The Feedback mailbox: send an idea, a bug or a wish; the first one gives a reward.
export const FEEDBACK = { maxLength: 500, everyMs: 5 * MINUTE, reward: { potion: 'walk', ms: 15 * MINUTE, dust: 'big' } };
export const fusedCash = (pets) => Math.round(pets.reduce((sum, p) => sum + (p.cash || 0), 0) * FUSION.boost);
// The Watch Ad board on the front wall: cash worth 2 minutes of income, every 10 minutes.
export const AD_CASH = { everyMs: 10 * MINUTE, seconds: 120, min: 500 };
export const adCashAmount = (income) => Math.round(Math.max(AD_CASH.min, (income || 0) * AD_CASH.seconds));

// ------------------------------------------------------------------ the bat

// The bat knocks whatever another player carries out of their hands.
export const BAT = { range: 9, cooldownMs: 900 };

// ------------------------------------------------------------------ the new-player guide

// basics: chop -> pick up the egg -> drop it on the pad -> pull the lever -> it grows and hatches.
// Then 20 seconds on the treadmill, then a visit to each Starting Place shop, then 'done'
// (after which the guide points at the furthest forest the player is strong enough for).
export const TUTORIAL_STEPS = ['basics', 'treadmill', 'axeShop', 'sellShop', 'trailsShop', 'done'];
export const TUTORIAL_TREADMILL_SECONDS = 20;

export { MUTATIONS };
