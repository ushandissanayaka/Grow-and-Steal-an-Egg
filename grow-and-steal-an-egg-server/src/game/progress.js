// Server rules for everything bought or claimed: the shop (passes, power-ups, lucky dust,
// snowflakes, money, speed, featured eggs, limited items, free gift and boost), pet slots and
// equipping, the index rewards, rebirths and offline cash. Each action checks the price against
// the buyer's own cash (or snowflakes) and returns { ok, text } for a message to the player.
// Most shop items can be bought as a gift for another player: the buyer pays, they get it.

import { EGGS, MUTATIONS, PETS, PET_POOLS, petIncome, pickWeighted, rollPet } from '../shared/gameData.js';
import {
  BUNDLE, CRATE_LUCK, DUST, DUST_PACKS, FEATURED, FREE_BOOST, FREE_GIFT, INDEX_AREAS, LIMITED, LUCK_PER_HATCH,
  MAX_PETS, MEGA_DEAL, MYSTERY_EGGS, OFFLINE, PASSES, POTIONS, POTION_MAX_MS, POTION_MS, POTION_ORDER, SLOTS,
  SNOWFLAKE_CATCH, SNOWFLAKE_PACKS, SPEED_PACKS, TRAILS, TREADMILL, TUTORIAL_STEPS, MONEY_PACKS,
  AD_CASH, FEEDBACK, FUSION, adCashAmount, fusedCash, areaById, areaPets, mysteryEgg, bundlePrice, doubleSpeedPrice, dustPackPrice, dustPrice, featuredPrice, limitedPrice,
  moneyPackCash, mutationChance, mutationMult, mysteryPrice, offlineAmount, offlineTriplePrice, perks, petFromArea,
  petSellValue, potionPrice, rebirthNeed, scaledPrice, slotPrice, snowflakePrice, trailById, treadmillPrice,
} from '../shared/progression.js';

const fail = (text) => ({ ok: false, text });
const done = (text) => ({ ok: true, text });
const BOOST_IDS = [...POTION_ORDER, 'luck'];

// Fills in the progress fields on older saves.
export function normalizeProgress(profile, now = Date.now()) {
  if (!profile.passes || typeof profile.passes !== 'object' || Array.isArray(profile.passes)) profile.passes = {};
  if (!profile.boosts || typeof profile.boosts !== 'object') profile.boosts = {};
  profile.rebirths = Number.isInteger(profile.rebirths) ? profile.rebirths : 0;
  profile.slots = Number.isInteger(profile.slots) ? Math.min(SLOTS.max, Math.max(SLOTS.start, profile.slots)) : SLOTS.start;
  profile.claimed = Array.isArray(profile.claimed) ? profile.claimed : [];
  profile.petSeq = Number.isInteger(profile.petSeq) ? profile.petSeq : 0;
  profile.giftAt = Number.isFinite(profile.giftAt) ? profile.giftAt : now; // the free gift is ready on the first visit
  profile.freeBoostAt = Number.isFinite(profile.freeBoostAt) ? profile.freeBoostAt : now;
  profile.giftClaimed = !!profile.giftClaimed;
  profile.megaDeal = !!profile.megaDeal;
  profile.snowflakes = Number.isFinite(profile.snowflakes) ? Math.max(0, Math.floor(profile.snowflakes)) : 0;
  profile.snowCaughtAt = Number.isFinite(profile.snowCaughtAt) ? profile.snowCaughtAt : 0;
  profile.luckBank = Number.isFinite(profile.luckBank) ? Math.max(0, Math.round(profile.luckBank)) : 0;
  profile.treadLevel = Number.isInteger(profile.treadLevel) ? Math.min(TREADMILL.maxLevel, Math.max(0, profile.treadLevel)) : 0;
  if (!profile.bought || typeof profile.bought !== 'object' || Array.isArray(profile.bought)) profile.bought = {};
  profile.trails = (Array.isArray(profile.trails) ? profile.trails : []).filter((id) => trailById(id));
  if (!profile.trails.includes(profile.trail)) profile.trail = '';
  profile.locked = Array.isArray(profile.locked) ? profile.locked : [];
  // the new-player guide: players who already have pets have done it
  if (!TUTORIAL_STEPS.includes(profile.tutorial)) profile.tutorial = profile.pets.length ? 'done' : 'basics';
  // guide steps already done once (they are not shown again): 'chop', 'pick', 'zone:autumn'...
  profile.guideDone = (Array.isArray(profile.guideDone) ? profile.guideDone : []).filter((k) => typeof k === 'string').slice(0, 200);
  if (profile.pets.length) for (const k of ['chop', 'pick', 'pad', 'lever', 'hatch']) if (!profile.guideDone.includes(k)) profile.guideDone.push(k);
  for (const pet of profile.pets) if (!Number.isInteger(pet.uid)) pet.uid = ++profile.petSeq;
  const discovered = new Set(Array.isArray(profile.discovered) ? profile.discovered : []);
  for (const pet of profile.pets) discovered.add(pet.id);
  profile.discovered = [...discovered].filter((id) => PETS[id]);
  const uids = new Set(profile.pets.map((p) => p.uid));
  profile.equipped = (Array.isArray(profile.equipped) ? profile.equipped : []).filter((uid) => uids.has(uid)).slice(0, profile.slots);
  if (!profile.equipped.length && profile.pets.length) equipBest(profile);
}

export const passList = (profile) => Object.keys(profile.passes).filter((id) => profile.passes[id] && PASSES[id]);
const boostActive = (profile, now) => (id) => (profile.boosts[id] || 0) > now;
// server: { id: true } for the server boosts running in the player's room
export const perksOf = (profile, now = Date.now(), server = {}) =>
  perks(passList(profile), boostActive(profile, now), profile.rebirths, profile.trail, profile.treadLevel, server);

export const equippedPets = (profile) => {
  const on = new Set(profile.equipped);
  return profile.pets.filter((p) => on.has(p.uid));
};
export const baseIncome = (profile) => petIncome(equippedPets(profile));
const bestPetCash = (profile) => profile.pets.reduce((best, p) => Math.max(best, p.cash || 0), 0);

// What the client needs for the popups. Times are sent as "ms left" so clocks do not have to agree.
export function metaOf(profile, now, stageLeft = 0, extra = {}) {
  const boosts = {};
  for (const id of BOOST_IDS) if ((profile.boosts[id] || 0) > now) boosts[id] = profile.boosts[id] - now;
  const k = perksOf(profile, now, extra.serverOn || {});
  const { serverOn, ...rest } = extra;
  return JSON.stringify({
    passes: passList(profile),
    boosts,
    rebirths: profile.rebirths,
    padCap: k.padCap,
    walk: k.walk,
    swing: k.swing,
    cashMult: k.cash,
    income: baseIncome(profile), // what the equipped pets earn before boosts: shop prices follow it
    runMult: k.run,
    luckMult: k.luck,
    slots: profile.slots,
    equipped: profile.equipped,
    discovered: profile.discovered,
    claimed: profile.claimed,
    giftIn: Math.max(0, profile.giftAt - now),
    adIn: Math.max(0, (profile.adAt || 0) - now),
    feedbackRewarded: !!profile.feedbackRewarded,
    freeBoostIn: Math.max(0, profile.freeBoostAt - now),
    giftClaimed: profile.giftClaimed,
    megaDeal: profile.megaDeal,
    snowflakes: profile.snowflakes,
    luckBank: profile.luckBank,
    treadLevel: profile.treadLevel,
    bought: profile.bought,
    stageLeft,
    trails: profile.trails,
    trail: profile.trail,
    locked: profile.locked,
    tutorial: profile.tutorial,
    guideDone: profile.guideDone,
    ...rest,
  });
}

// The full pet list for the pets panel, compact.
export const allPetsJson = (profile) => JSON.stringify(profile.pets.map(({ uid, id, cash, egg, mut }) => ({ uid, id, cash, egg, mut })));

// A new pet: numbered, recorded in the index, equipped if there is a free slot. Past MAX_PETS the
// weakest unequipped pet goes.
export function addPet(profile, pet) {
  pet.uid = ++profile.petSeq;
  profile.petsHatched = (profile.petsHatched ?? profile.pets.length) + 1; // lifetime count, for the Boxity profile
  profile.pets.push(pet);
  if (!profile.discovered.includes(pet.id)) profile.discovered.push(pet.id);
  if (profile.equipped.length < profile.slots) profile.equipped.push(pet.uid);
  else {
    // swap it in for the weakest equipped pet if it is better
    const equipped = equippedPets(profile).sort((a, b) => a.cash - b.cash);
    if (equipped.length && equipped[0].cash < pet.cash) profile.equipped[profile.equipped.indexOf(equipped[0].uid)] = pet.uid;
  }
  if (profile.pets.length > MAX_PETS) {
    const on = new Set(profile.equipped);
    const weakest = profile.pets.filter((p) => !on.has(p.uid)).sort((a, b) => a.cash - b.cash)[0];
    if (weakest) profile.pets.splice(profile.pets.indexOf(weakest), 1);
  }
  return pet;
}

const spend = (profile, price) => {
  if (!Number.isFinite(price) || price < 0 || profile.cash < price) return false;
  profile.cash -= price;
  return true;
};

// ------------------------------------------------------------------ luck and mutations

// Uses up to LUCK_PER_HATCH of the banked Lucky Dust luck: the Luck multiplier for one egg.
export function useLuck(profile) {
  const used = Math.min(profile.luckBank || 0, LUCK_PER_HATCH);
  profile.luckBank = (profile.luckBank || 0) - used;
  return 1 + used / 100;
}

// A new pet may hatch mutated (Winter, Blood Moon or Alien): it earns that much more.
export function maybeMutate(profile, pet, { storm = false, touch = false } = {}, rnd = Math.random) {
  if (!pet || pet.mut) return pet;
  const has = (id) => !!profile.passes[id];
  if (rnd() >= mutationChance({ mutChance2: has('mutChance2'), storm, touch: touch && has('mutTouch') })) return pet;
  const id = pickWeighted(Object.entries(MUTATIONS).map(([key, m]) => [key, m.weight]), rnd);
  pet.mut = id;
  pet.cash = Math.round(pet.cash * mutationMult(id, has('mutDoubler')));
  return pet;
}

const addLuck = (profile, dustId, uses) => {
  const [lo, hi] = DUST[dustId].luck;
  let total = 0;
  for (let i = 0; i < uses; i++) total += Math.round(lo + Math.random() * (hi - lo));
  profile.luckBank = (profile.luckBank || 0) + total;
  return total;
};

function addPotion(profile, id, now, ms = POTION_MS) {
  const from = Math.max(now, profile.boosts[id] || 0);
  profile.boosts[id] = Math.min(now + POTION_MAX_MS, from + ms);
}

// ------------------------------------------------------------------ shop pets

function featuredPet(profile, luck = 1) {
  // luck makes the rare ones (under 5%) likelier
  const id = pickWeighted(PET_POOLS[FEATURED.egg].map(([pid, w]) => [pid, w * (w < 5 ? luck : 1)]));
  const value = FEATURED.pets[id];
  const cash = value === 'x3' ? Math.max(1_000_000_000, bestPetCash(profile) * 3) : value;
  return { id, cash, egg: FEATURED.egg };
}

const limitedPet = (profile, id) => ({ id, cash: Math.max(100, Math.round(bestPetCash(profile) * LIMITED[id].best)), egg: 'limited' });

// ------------------------------------------------------------------ the shop

// Every shop purchase. buyer pays; recipient (the buyer, or the player they gift it to) gets it.
// ctx: { now, server (running server boosts), gift: true when it is for someone else }
// Returns { ok, text, pets? } ; serverBoost purchases are handled by the room.
export function buy(buyer, recipient, kind, id, ctx) {
  const { now } = ctx;
  const income = baseIncome(buyer);
  const gifted = recipient !== buyer;
  const notGiftable = () => fail('That cannot be gifted');
  const thanks = (text) => done(gifted ? `Gift sent! ${text}` : text);
  const giveMutated = (pet) => addPet(recipient, maybeMutate(recipient, pet, { storm: !!ctx.server?.mutationStorm }));

  switch (kind) {
    case 'pass': {
      const pass = PASSES[id];
      if (!pass) return fail('Unknown pass');
      if (recipient.passes[id]) return fail(gifted ? 'They already own it' : 'You already own it');
      if (!spend(buyer, pass.price)) return fail('Not enough cash');
      recipient.passes[id] = true;
      return thanks(`${pass.name} unlocked!`);
    }
    case 'potion': {
      if (!POTIONS[id]) return fail('Unknown power-up');
      if ((recipient.boosts[id] || 0) - now > POTION_MAX_MS - POTION_MS) return fail('That power-up is already full');
      if (!spend(buyer, potionPrice(id, income))) return fail('Not enough cash');
      addPotion(recipient, id, now);
      return thanks(`${POTIONS[id].name}: 15 minutes!`);
    }
    case 'bundle': {
      if (!spend(buyer, bundlePrice(income))) return fail('Not enough cash');
      for (const pid of POTION_ORDER) addPotion(recipient, pid, now, POTION_MS * BUNDLE.count);
      return thanks('x10 All Potions!');
    }
    case 'dust': {
      if (!DUST[id]) return fail('Unknown dust');
      if (!spend(buyer, dustPrice(id, income))) return fail('Not enough cash');
      const luck = addLuck(recipient, id, DUST[id].count);
      return thanks(`+${luck} Luck for your next eggs!`);
    }
    case 'dustPack': {
      const pack = DUST_PACKS[id];
      if (!pack) return fail('Unknown pack');
      if (!spend(buyer, dustPackPrice(id, income))) return fail('Not enough cash');
      const luck = addLuck(recipient, 'mega', pack.mega) + addLuck(recipient, 'big', pack.big);
      if (pack.luckMs) addPotion(recipient, 'luck', now, pack.luckMs);
      return thanks(`+${luck} Luck for your next eggs!`);
    }
    case 'snowflakes': {
      const pack = SNOWFLAKE_PACKS.find((p) => p.id === id);
      if (!pack) return fail('Unknown pack');
      if (!spend(buyer, snowflakePrice(id, income))) return fail('Not enough cash');
      recipient.snowflakes += pack.amount;
      return thanks(`+${pack.amount.toLocaleString('en-US')} Snowflakes!`);
    }
    case 'money': {
      if (gifted) return notGiftable();
      const pack = MONEY_PACKS.find((p) => p.id === id);
      if (!pack) return fail('Unknown pack');
      if (buyer.snowflakes < pack.snowflakes) return fail('Not enough Snowflakes');
      const cash = moneyPackCash(id, income);
      buyer.snowflakes -= pack.snowflakes;
      buyer.cash += cash;
      return { ...done(`+$${cash.toLocaleString('en-US')}!`), amount: cash };
    }
    case 'speed': {
      const pack = SPEED_PACKS.find((s) => s.id === id);
      if (!pack) return fail('Unknown pack');
      if (!spend(buyer, pack.price)) return fail('Not enough cash');
      recipient.speed += pack.amount;
      return thanks('Speed added!');
    }
    case 'doubleSpeed': {
      if (gifted) return notGiftable();
      if (!spend(buyer, doubleSpeedPrice(buyer.speed))) return fail('Not enough cash');
      buyer.speed *= 2;
      return done('Your speed is doubled!');
    }
    case 'treadmill': {
      if (gifted) return notGiftable();
      const price = treadmillPrice(buyer.treadLevel);
      if (price === null) return fail('Fully upgraded!');
      if (!spend(buyer, price)) return fail('Not enough cash');
      buyer.treadLevel += 1;
      return done(`Treadmill upgraded to level ${buyer.treadLevel + 1}!`);
    }
    case 'featured': {
      const count = Number(id);
      const price = featuredPrice(count);
      if (price === null) return fail('Unknown pack');
      if (!spend(buyer, price)) return fail('Not enough cash');
      const pets = [];
      for (let i = 0; i < count; i++) pets.push(giveMutated(featuredPet(recipient)));
      const best = pets.reduce((a, b) => (b.cash > a.cash ? b : a));
      return { ...thanks(`${count} Alien Hunters egg${count > 1 ? 's' : ''} hatched! Best: ${PETS[best.id].name}`), pets };
    }
    case 'mystery': {
      const egg = MYSTERY_EGGS[id];
      if (!egg) return fail('Unknown egg');
      if (!spend(buyer, mysteryPrice(id, income))) return fail('Not enough cash');
      const pet = giveMutated(rollPet(mysteryEgg(id, recipient.discovered), egg.luck * perksOf(recipient, now, ctx.server).luck));
      return { ...thanks(`${egg.name} Egg: ${PETS[pet.id].name}!`), pets: [pet] };
    }
    case 'limited': {
      const item = LIMITED[id];
      if (!item) return fail('Unknown item');
      const had = buyer.bought[id] || 0;
      if (had >= item.stock) return fail('Sold out!');
      if (!spend(buyer, limitedPrice(id, income))) return fail('Not enough cash');
      buyer.bought[id] = had + 1;
      if (item.pet) {
        const pet = giveMutated(limitedPet(recipient, item.pet));
        return { ...thanks(`${item.name}!`), pets: [pet] };
      }
      if (id === 'alienCrate') {
        const pet = giveMutated(featuredPet(recipient, CRATE_LUCK));
        return { ...thanks(`Alien Crate: ${PETS[pet.id].name}!`), pets: [pet] };
      }
      // the Mega Pack
      for (const pid of POTION_ORDER) addPotion(recipient, pid, now, POTION_MS * 5);
      addLuck(recipient, 'mega', 10);
      addLuck(recipient, 'big', 10);
      recipient.snowflakes += 500;
      recipient.cash += Math.round(Math.max(10_000, baseIncome(recipient) * 1800));
      return thanks('Mega Pack opened!');
    }
    case 'megaDeal': {
      if (gifted) return notGiftable();
      if (!buyer.giftClaimed) return fail('Claim the Free Gift first');
      if (buyer.megaDeal) return fail('Already bought');
      if (!spend(buyer, scaledPrice(MEGA_DEAL.rs, income))) return fail('Not enough cash');
      buyer.megaDeal = true;
      addLuck(buyer, 'mega', 2);
      const pet = giveMutated(featuredPet(buyer, CRATE_LUCK));
      return { ...done(`Mega Deal: ${PETS[pet.id].name} + 2 Mega Lucky Dust!`), pets: [pet] };
    }
    case 'slot': {
      if (gifted) return notGiftable();
      const price = slotPrice(buyer.slots);
      if (price === null) return fail('All slots unlocked');
      if (!spend(buyer, price)) return fail('Not enough cash');
      buyer.slots = Math.min(SLOTS.max, buyer.slots + SLOTS.step);
      return done('+1 Animal Slot!');
    }
    default:
      return fail('Unknown item');
  }
}

// The shop's Free Gift (x1.5 Growing Speed) and Free Boost (x1.5 Swing Speed).
export function claimFree(profile, which, now) {
  const free = which === 'boost' ? FREE_BOOST : FREE_GIFT;
  const key = which === 'boost' ? 'freeBoostAt' : 'giftAt';
  if (now < profile[key]) return fail('Not ready yet');
  addPotion(profile, free.potion, now, free.ms);
  profile[key] = now + free.every;
  if (which !== 'boost') profile.giftClaimed = true;
  return done(`${POTIONS[free.potion].name}: 5 minutes!`);
}

// A falling snowflake caught (at most one every SNOWFLAKE_CATCH.everyMs).
export function catchSnowflake(profile, now) {
  if (now - profile.snowCaughtAt < SNOWFLAKE_CATCH.everyMs) return fail('');
  profile.snowCaughtAt = now;
  profile.snowflakes += SNOWFLAKE_CATCH.amount;
  return done(`+${SNOWFLAKE_CATCH.amount} Snowflakes!`);
}

// ------------------------------------------------------------------ Winter Fusion and the ad board

// Fuses FUSION.count pets of the same kind (not locked) into one Winter pet. Returns the new pet too.
export function fusePets(profile, uids, winter = false) {
  const want = [...new Set(Array.isArray(uids) ? uids : [])];
  if (want.length !== FUSION.count) return fail(`Pick ${FUSION.count} pets of the same kind`);
  const pets = want.map((uid) => profile.pets.find((p) => p.uid === uid));
  if (pets.some((p) => !p)) return fail('No such pet');
  if (pets.some((p) => profile.locked.includes(p.uid))) return fail('Unlock the pets first');
  if (pets.some((p) => p.id !== pets[0].id)) return fail('The pets must all be the same kind');
  if (winter && (profile.snowflakes || 0) < FUSION.winterSnowflakes) return fail(`Winter Fusion needs ${FUSION.winterSnowflakes} Snowflakes`);
  if (winter) profile.snowflakes -= FUSION.winterSnowflakes;
  const gone = new Set(want);
  profile.pets = profile.pets.filter((p) => !gone.has(p.uid));
  profile.equipped = profile.equipped.filter((uid) => !gone.has(uid));
  const best = pets.find((p) => p.mut)?.mut;
  const pet = addPet(profile, winter
    ? { id: pets[0].id, egg: pets[0].egg, cash: Math.round(fusedCash(pets) * MUTATIONS.winter.mult), mut: FUSION.mutation }
    : { id: pets[0].id, egg: pets[0].egg, cash: fusedCash(pets), ...(best ? { mut: best } : {}) });
  if (!profile.equipped.includes(pet.uid) && profile.equipped.length < profile.slots) profile.equipped.push(pet.uid);
  return { ...done(`${winter ? 'Winter ' : ''}${PETS[pet.id].name} fused!`), pets: [pet] };
}

// A message from the Feedback mailbox. The first one ever gives the reward (a walk-speed potion and
// some Big Lucky Dust); after that, one message every few minutes. The text goes to the room to store.
export function sendFeedback(profile, text, now) {
  const msg = typeof text === 'string' ? text.trim().slice(0, FEEDBACK.maxLength) : '';
  if (msg.length < 3) return fail('Write a few words first!');
  if (now - (profile.feedbackAt || 0) < FEEDBACK.everyMs) return fail('Thanks! You can send another one in a few minutes');
  profile.feedbackAt = now;
  if (profile.feedbackRewarded) return { ...done('Thank you for your feedback!'), message: msg };
  profile.feedbackRewarded = true;
  addPotion(profile, FEEDBACK.reward.potion, now, FEEDBACK.reward.ms);
  addLuck(profile, FEEDBACK.reward.dust, 1);
  return { ...done('Thank you! Free reward: x1.5 Speed + Lucky Dust!'), message: msg };
}

// The Watch Ad board's cash (every AD_CASH.everyMs).
export function claimAdCash(profile, now) {
  if (now < (profile.adAt || 0)) return fail('Not ready yet');
  const amount = adCashAmount(baseIncome(profile));
  profile.cash += amount;
  profile.adAt = now + AD_CASH.everyMs;
  return { ...done(`+$${amount.toLocaleString('en-US')}!`), amount };
}

// ------------------------------------------------------------------ pets

export function equipPet(profile, uid) {
  if (!profile.pets.some((p) => p.uid === uid)) return fail('No such pet');
  if (profile.equipped.includes(uid)) return fail('Already equipped');
  if (profile.equipped.length >= profile.slots) return fail('No free slot: unequip one or buy more slots');
  profile.equipped.push(uid);
  return done('Equipped!');
}

export function unequipPet(profile, uid) {
  const i = profile.equipped.indexOf(uid);
  if (i < 0) return fail('Not equipped');
  profile.equipped.splice(i, 1);
  return done('Unequipped');
}

export function equipBest(profile) {
  profile.equipped = [...profile.pets].sort((a, b) => b.cash - a.cash).slice(0, profile.slots).map((p) => p.uid);
  return done('Best pets equipped!');
}

// ------------------------------------------------------------------ index

export function claimIndex(profile, areaId) {
  const area = areaById(areaId);
  if (!area) return fail('Unknown area');
  if (profile.claimed.includes(areaId)) return fail('Already claimed');
  const missing = areaPets(area).filter((id) => !profile.discovered.includes(id));
  if (missing.length) return fail(`Find ${missing.length} more pet${missing.length > 1 ? 's' : ''} first`);
  profile.claimed.push(areaId);
  profile.speed += area.reward.speed;
  profile.cash += area.reward.cash;
  return done(`${area.name} complete! Reward claimed!`);
}

// Claims every finished area at once (the Index's Claim! button).
export function claimAllIndex(profile) {
  const ready = INDEX_AREAS.filter((a) => !profile.claimed.includes(a.id) && areaPets(a).every((id) => profile.discovered.includes(id)));
  if (!ready.length) return fail('Find all the pets of an area first');
  for (const area of ready) claimIndex(profile, area.id);
  return done(`${ready.length} reward${ready.length > 1 ? 's' : ''} claimed!`);
}

// ------------------------------------------------------------------ rebirth

// Costs the cash and one pet from the required area (the weakest one, unequipped first). Gives a
// cash multiplier; axes, speed and other pets stay.
export function rebirth(profile) {
  const need = rebirthNeed(profile.rebirths);
  const area = areaById(need.area);
  if (profile.cash < need.cash) return fail('Not enough cash');
  const on = new Set(profile.equipped);
  const candidates = profile.pets.filter((p) => petFromArea(p, area))
    .sort((a, b) => (on.has(a.uid) - on.has(b.uid)) || a.cash - b.cash);
  if (!candidates.length) return fail(`You need a pet from ${area.name}`);
  const pet = candidates[0];
  profile.pets.splice(profile.pets.indexOf(pet), 1);
  profile.equipped = profile.equipped.filter((uid) => uid !== pet.uid);
  profile.cash = 0;
  profile.rebirths += 1;
  if (!profile.equipped.length && profile.pets.length) equipBest(profile);
  return done(`Rebirth ${profile.rebirths}! Cash x${profile.rebirths + 1}!`);
}

// ------------------------------------------------------------------ the new-player guide

// Moves the guide on (never back). The first hatch moves 'basics' on by itself (see the room).
export function advanceTutorial(profile, step) {
  const to = TUTORIAL_STEPS.indexOf(step);
  if (to < 0 || to <= TUTORIAL_STEPS.indexOf(profile.tutorial)) return { ok: false, text: '' };
  profile.tutorial = step;
  return { ok: true, text: '' };
}

// A guide step done once: never guided again.
export function markGuideDone(profile, key) {
  if (typeof key !== 'string' || !key || key.length > 40 || profile.guideDone.includes(key) || profile.guideDone.length >= 200) return { ok: false, text: '' };
  profile.guideDone.push(key);
  return { ok: true, text: '' };
}

// ------------------------------------------------------------------ trails

export function buyTrail(profile, id) {
  const trail = trailById(id);
  if (!trail) return fail('Unknown trail');
  if (profile.trails.includes(id)) return fail('You already own it');
  if (!spend(profile, trail.price)) return fail('Not enough cash');
  profile.trails.push(id);
  profile.trail = id;
  return done(`${trail.name} equipped! x${trail.mult} Speed`);
}

// Equip an owned trail, or take it off (id = '').
export function equipTrail(profile, id) {
  if (id && !profile.trails.includes(id)) return fail('You do not own it');
  profile.trail = id;
  return done(id ? `${trailById(id).name} equipped!` : 'Trail unequipped');
}

// ------------------------------------------------------------------ selling pets

export function toggleLock(profile, uid) {
  if (!profile.pets.some((p) => p.uid === uid)) return fail('No such pet');
  const i = profile.locked.indexOf(uid);
  if (i >= 0) profile.locked.splice(i, 1);
  else profile.locked.push(uid);
  return { ok: true, text: '' };
}

// Sells the given pets (locked ones are skipped; equipped ones are unequipped first).
export function sellPets(profile, uids) {
  const wanted = new Set(Array.isArray(uids) ? uids.slice(0, 500) : []);
  const locked = new Set(profile.locked);
  const sold = profile.pets.filter((p) => wanted.has(p.uid) && !locked.has(p.uid));
  if (!sold.length) return fail('Pick some pets to sell');
  const total = sold.reduce((sum, p) => sum + petSellValue(p), 0);
  const gone = new Set(sold.map((p) => p.uid));
  profile.pets = profile.pets.filter((p) => !gone.has(p.uid));
  profile.equipped = profile.equipped.filter((uid) => !gone.has(uid));
  profile.cash += total;
  return { ...done(`Sold ${sold.length} pet${sold.length > 1 ? 's' : ''} for $${total.toLocaleString('en-US')}!`), amount: total };
}

// ------------------------------------------------------------------ offline cash

// On joining: what the equipped pets earned while the player was away (kept until claimed).
export function startOffline(profile, now) {
  const away = profile.lastSeen ? now - profile.lastSeen : 0;
  profile.lastSeen = now;
  if (away < OFFLINE.minMs || profile.offlinePending > 0) return;
  const has = (id) => !!profile.passes?.[id];
  const rate = baseIncome(profile) * perks(passList(profile), () => false, profile.rebirths).cash * (has('offline2') ? 2 : 1);
  const maxMs = has('offline72') ? OFFLINE.longMs : OFFLINE.maxMs;
  const amount = offlineAmount(rate, away, maxMs);
  // the Welcome Back popup shows after any time away (even with nothing earned yet)
  profile.offlineShow = true;
  profile.offlineAway = Math.min(away, maxMs);
  if (amount > 0) profile.offlinePending = amount;
}

export const offlineInfo = (profile) => (profile.offlinePending > 0 || profile.offlineShow
  ? { amount: profile.offlinePending || 0, away: profile.offlineAway || 0, price: offlineTriplePrice(profile.offlinePending || 0) }
  : null);

export function claimOffline(profile, triple) {
  const amount = profile.offlinePending || 0;
  profile.offlineShow = false;
  if (amount <= 0) return done('Welcome back!');
  if (triple && !spend(profile, offlineTriplePrice(amount))) return fail('Not enough cash for 3x');
  const got = triple ? amount * OFFLINE.triple : amount;
  profile.cash += got;
  profile.offlinePending = 0;
  return { ...done(`+$${got.toLocaleString('en-US')} offline cash!`), amount: got };
}

export { INDEX_AREAS, EGGS, TRAILS };
