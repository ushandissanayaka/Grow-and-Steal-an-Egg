// The main room. The server owns trees, eggs, the forest animals, cash, speed and each plot's
// shred -> launch -> grow -> hatch stages. Clients only ask for an action, and every action is
// checked against the player's position.

import colyseus from 'colyseus';
import { authenticateClient } from '../auth/legionAuth.js';
import { loadProfile, getProfile, holdProfile, releaseProfile, carryGuestProgress, markDirty } from '../game/profiles.js';
import { hatchFromEggNode, hatchResult, shredResult } from '../game/economy.js';
import {
  ANIMALS, ANIMAL_SPAWNS, AXES, EGGS, MAX_CLIENTS, PETS, PLOT, PLOTS, RANGE, RULES, SHOPS, STAGE_MS, TREES, WORLD,
  RUN_PER_GAIN, ZONES, DECOR_TREES, animalRadius, animalSize, axeById, halfWidthAt, chopDamage, chopRange, onTreadmill, petIncome, plotToWorld, runGain, treadmillGain, treeHp, treeReward, walkSpeed, zoneAt,
} from '../shared/gameData.js';
import { AnimalState, GroundEgg, PlayerState, StartingPlaceState, TreeState } from './schema.js';
import * as progress from '../game/progress.js';
import {
  BAT, WEATHER_PERKS, treadStep, EGG_RAIN_EVERY_MS, GROW_ALL_MULT, SERVER_BOOSTS, SERVER_BOOST_MAX_MS, SERVER_BOOST_MS, friendCashMult, serverBoostPrice, snowflakesForHatch,
} from '../shared/progression.js';
import { WEATHER, pickWeighted, rollLuck, rollPet, TREE_TYPES, eggSize } from '../shared/gameData.js';
import { reportAdd, reportBest } from '../game/leaderboardReporter.js';
import { saveFeedback } from '../game/feedback.js';

const { Room } = colyseus;
const TICK_MS = 100;
const MAX_AVATAR_JSON = 4096;
const MAX_GROUND_EGGS = 220;
const REACH_MARGIN = 4; // positions arrive 10x a second, so allow for a little lag
const ANIMAL = {
  detect: 34,        // sees a player carrying eggs this close
  alertMs: 800,      // the "!" before it charges
  wanderSpeed: 7,
  wanderRadius: 26,
  leash: 160,        // gives up this far from home
  graceMs: 2500,     // after a steal, no animal can steal from the same player again for this long
  returnSpeed: 0.6,  // of its own speed (ANIMALS[type].speed), walking back home
};

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const jsonField = (v) => {
  const text = JSON.stringify(v ?? {});
  return text.length <= MAX_AVATAR_JSON ? text : '{}';
};
const near = (p, x, z, range) => Math.hypot(p.x - x, p.z - z) <= range + REACH_MARGIN;
const treeById = new Map(TREES.map((t) => [t.id, t]));
// what Grow All costs for these eggs: a few times their reward, for the part still to grow
export const growAllPrice = (trees) => trees.reduce((sum, { tree, state }) => sum + Math.ceil(treeReward(tree) * GROW_ALL_MULT * state.hp / treeHp(tree)), 0);

// Older saves kept pets as plain ids and had other axe names.
function normalizeProfile(profile) {
  profile.pets = (profile.pets || []).map((p) => (typeof p === 'string' ? (PETS[p] ? { id: p, cash: 2 } : null) : p)).filter((p) => p && PETS[p.id]);
  profile.ownedAxes = (profile.ownedAxes || []).filter((id) => AXES.some((a) => a.id === id));
  if (!profile.ownedAxes.includes('fists')) profile.ownedAxes.unshift('fists');
  if (!profile.ownedAxes.includes(profile.axe)) profile.axe = profile.ownedAxes[profile.ownedAxes.length - 1];
  if (!finite(profile.cash)) profile.cash = 0;
  if (!finite(profile.speed) || profile.speed < 5) profile.speed = 5;
  progress.normalizeProgress(profile);
}

export class StartingPlaceRoom extends Room {
  onCreate() {
    this.maxClients = MAX_CLIENTS;
    this.setState(new StartingPlaceState());
    this.eggSeq = 0;
    this.emoteSeq = 0;
    this.lastChop = new Map();    // sessionId -> time of the last hit
    this.stageEnds = new Map();   // sessionId -> when the current plot stage ends
    this.treeRespawn = new Map(); // tree id -> when it grows back
    this.eggExpiry = new Map();   // ground egg id -> when it disappears
    this.grace = new Map();       // sessionId -> no steals before this time
    this.lastMove = new Map();    // sessionId -> time of the last position update
    this.runDistance = new Map(); // sessionId -> distance run towards the next speed gain
    this.brains = new Map();      // animal id -> { home, wanderTo, waitUntil, alertUntil }
    this.metaKeys = new Map();    // sessionId -> metaKey when meta was last sent
    this.sidOf = new Map();       // PlayerState -> sessionId (fast lookup)
    this.friendIds = new Map();   // sessionId -> Set of the player's Bloxity friend ids (sent by their client)
    this.serverBoosts = {};       // server boost id -> when it ends (everyone in this server gets it)
    this.hitters = new Map();     // tree id -> Map(sessionId -> last hit time), for the Eggs panel's Grow All
    this.lastBonk = new Map();    // sessionId -> time of the last bat swing
    this.lastRain = 0;
    this.weatherAt = Date.now();  // when the weather last changed
    this.lastSecond = Date.now();
    this.lastTick = Date.now();

    for (const t of TREES) this.state.trees.set(t.id, new TreeState(treeHp(t)));
    ANIMAL_SPAWNS.forEach((spawn, i) => {
      const id = `a${i}`;
      this.state.animals.set(id, new AnimalState(spawn.type, spawn.x, spawn.z));
      this.brains.set(id, { home: { x: spawn.x, z: spawn.z }, zone: ZONES.find((z) => z.id === spawn.zone), wanderTo: null, waitUntil: 0, alertUntil: 0 });
    });

    this.setSimulationInterval(() => this.tick(), TICK_MS);
    this.setPatchRate(TICK_MS); // send state as often as it changes (10/s), not 20/s

    const on = (type, fn) => this.onMessage(type, (client, m = {}) => {
      const p = this.state.players.get(client.sessionId);
      if (p) fn(client, p, m || {});
    });

    this.onMessage('ping', (client, m = {}) => client.send('pong', { t: m?.t }));

    on('move', (client, p, m) => {
      if (![m.x, m.y, m.z, m.ry].every(finite)) return;
      const z = clamp(m.z, WORLD.northZ, WORLD.southZ);
      const x = clamp(m.x, -halfWidthAt(z), halfWidthAt(z));
      this.countRun(client.sessionId, p, x, z);
      p.x = x;
      p.y = clamp(m.y, 0, 200);
      p.z = z;
      p.ry = m.ry;
      if (typeof m.anim === 'string') p.anim = m.anim.slice(0, 24);
    });
    on('chop', (client, p, m) => this.chop(client, p, m.id));
    on('pick', (_client, p, m) => this.pick(p, m.id));
    on('drop', (_client, p) => this.dropCarried(p));
    on('pad', (_client, p) => this.fillPad(p));
    on('lever', (client, p) => this.pullLever(client, p));
    on('hatch', (client, p) => this.hatch(client, p));
    on('buyAxe', (client, p, m) => this.buyAxe(client, p, m.id));
    on('equipAxe', (_client, p, m) => this.equipAxe(p, m.id));

    // shop, pets, index, rebirth and the free gift: all paid with (or paying out) cash
    const str = (v) => (typeof v === 'string' ? v.slice(0, 24) : '');
    // the shop: { kind, id, to } - to = another player's session id to gift it to them
    on('buy', (client, p, m) => this.buy(client, p, str(m.kind), typeof m.id === 'number' ? String(m.id) : str(m.id), str(m.to)));
    on('serverBoost', (client, p, m) => this.buyServerBoost(client, p, str(m.id)));
    on('claimFree', (client, p, m) => this.act(client, p, (pr, now) => progress.claimFree(pr, m.which === 'boost' ? 'boost' : 'gift', now)));
    on('snowflake', (client, p) => this.act(client, p, (pr, now) => progress.catchSnowflake(pr, now)));
    on('claimAllIndex', (client, p) => this.act(client, p, (pr) => progress.claimAllIndex(pr)));
    on('growAll', (client, p) => this.growAll(client, p));
    // Winter Fusion: three pets of the same kind -> one Winter pet
    on('fuse', (client, p, m) => {
      const uids = Array.isArray(m.uids) ? m.uids.map(Number).filter(Number.isInteger).slice(0, 10) : [];
      const result = this.act(client, p, (pr) => progress.fusePets(pr, uids, !!m.winter));
      if (result.ok) client.send('opened', { pets: result.pets.map(({ id, cash, mut }) => ({ id, cash, mut })) });
    });
    // the Feedback mailbox: messages are kept in data/feedback.jsonl
    on('feedback', (client, p, m) => {
      const result = this.act(client, p, (pr, now) => progress.sendFeedback(pr, m.text, now));
      if (result.ok) saveFeedback({ at: new Date().toISOString(), user: p.userId, name: p.name, text: result.message });
    });
    // the Watch Ad board on the front wall
    on('adCash', (client, p) => {
      const result = this.act(client, p, (pr, now) => progress.claimAdCash(pr, now));
      if (result.ok) client.send('gift', { amount: result.amount });
    });
    // the bat: knock what another player carries out of their hands
    on('tool', (_client, p, m) => { p.tool = m.id === 'bat' ? 'bat' : 'scythe'; });
    on('bonk', (client, p, m) => this.bonk(client, p, str(m.id)));
    on('equipPet', (client, p, m) => this.act(client, p, (pr) => progress.equipPet(pr, Number(m.uid))));
    on('unequipPet', (client, p, m) => this.act(client, p, (pr) => progress.unequipPet(pr, Number(m.uid))));
    on('equipBest', (client, p) => this.act(client, p, (pr) => progress.equipBest(pr)));
    on('buySlots', (client, p) => this.buy(client, p, 'slot', '', ''));
    on('claimIndex', (client, p, m) => this.act(client, p, (pr) => progress.claimIndex(pr, str(m.id))));
    on('rebirth', (client, p) => this.act(client, p, (pr) => progress.rebirth(pr)));
    // the player's friends (ids from the Bloxity SDK): each one in this server boosts cash
    on('friends', (_client, p, m) => {
      const ids = (Array.isArray(m.ids) ? m.ids : []).slice(0, 500).filter((id) => typeof id === 'string' || typeof id === 'number').map(String);
      this.friendIds.set(this.sessionOf(p), new Set(ids));
      this.refreshAll();
    });

    // an emote from Boxity's picker: replicated so everyone sees it (ids are 24-char catalogue ids)
    on('emote', (_client, p, m) => {
      if (typeof m.id !== 'string' || !/^[a-f0-9]{24}$/.test(m.id)) return;
      p.emote = `${m.id}:${++this.emoteSeq}`;
    });

    // the new-player guide moving on (treadmill done, a shop visited)
    on('tutorial', (client, p, m) => this.act(client, p, (pr) => progress.advanceTutorial(pr, str(m.step))));
    on('guideDone', (client, p, m) => this.act(client, p, (pr) => progress.markGuideDone(pr, typeof m.key === 'string' ? m.key.slice(0, 40) : '')));

    // Trails Shop and Sell Shop
    on('buyTrail', (client, p, m) => this.act(client, p, (pr) => progress.buyTrail(pr, str(m.id))));
    on('equipTrail', (client, p, m) => this.act(client, p, (pr) => progress.equipTrail(pr, str(m.id))));
    on('lockPet', (client, p, m) => this.act(client, p, (pr) => progress.toggleLock(pr, Number(m.uid))));
    on('sellPets', (client, p, m) => {
      const uids = Array.isArray(m.uids) ? m.uids.map(Number).filter(Number.isInteger) : [];
      const result = this.act(client, p, (pr) => progress.sellPets(pr, uids));
      if (result.ok) client.send('gift', { amount: result.amount });
    });

    // offline cash: the client asks once it is listening, then claims x1 or (paying) x3
    on('offlineCheck', (client, p) => {
      const info = progress.offlineInfo(getProfile(p.userId));
      if (info) client.send('offline', info);
    });
    on('claimOffline', (client, p, m) => {
      const result = this.act(client, p, (pr) => progress.claimOffline(pr, !!m.triple));
      if (result.ok) client.send('gift', { amount: result.amount });
    });
  }

  async onAuth(client, options) {
    const auth = await authenticateClient(client, options);
    await loadProfile(auth.userId, auth.displayName);
    holdProfile(auth.userId);
    if (!auth.guest) await carryGuestProgress(auth.userId, auth.carriedFrom, auth.localGuestId);
    return auth;
  }

  onJoin(client, options = {}, auth) {
    const profile = getProfile(auth.userId, auth.displayName);
    normalizeProfile(profile);
    progress.startOffline(profile, Date.now());
    const used = new Set([...this.state.players.values()].map((p) => p.plot));
    const plot = PLOTS.findIndex((_, i) => !used.has(i));
    const spawn = { x: SHOPS.spawn.x + (Math.random() - 0.5) * 8, z: SHOPS.spawn.z + (Math.random() - 0.5) * 8 }; // everyone appears in the middle
    const p = new PlayerState();
    p.userId = auth.userId;
    p.name = auth.displayName;
    p.avatar = jsonField(options.avatar);
    p.props = jsonField(options.props);
    p.plot = plot;
    p.x = spawn.x;
    p.z = spawn.z;
    p.cash = profile.cash;
    p.speed = profile.speed;
    p.axe = profile.axe;
    p.axes = JSON.stringify(profile.ownedAxes);
    this.state.players.set(client.sessionId, p);
    this.sidOf.set(p, client.sessionId);
    this.restoreMachine(client.sessionId, p, profile);
    this.refreshAll();
  }

  async onLeave(client) {
    const p = this.state.players.get(client.sessionId);
    if (p) this.saveMachine(client.sessionId, p); // before its timers are cleared below
    if (p) this.sidOf.delete(p);
    this.state.players.delete(client.sessionId);
    this.lastChop.delete(client.sessionId);
    this.stageEnds.delete(client.sessionId);
    this.grace.delete(client.sessionId);
    this.lastMove.delete(client.sessionId);
    this.runDistance.delete(client.sessionId);
    this.metaKeys.delete(client.sessionId);
    this.friendIds.delete(client.sessionId);
    this.refreshAll();
    if (p) {
      getProfile(p.userId).lastSeen = Date.now(); // offline cash counts from here
      markDirty();
      await releaseProfile(p.userId);
    }
  }

  // Eggs in progress are part of the save: the egg in your hands, the eggs on your drop pad and the
  // egg in the machine (with how long it still had to grow) come back next time you play.
  saveMachine(sessionId, p) {
    const profile = getProfile(p.userId);
    const ends = this.stageEnds.get(sessionId);
    profile.machine = {
      carried: JSON.parse(p.carried),
      pad: JSON.parse(p.pad),
      stage: p.stage,
      eggType: p.eggType,
      eggLuck: p.eggLuck,
      leftMs: ends ? Math.max(0, ends - Date.now()) : 0,
    };
    markDirty();
  }

  restoreMachine(sessionId, p, profile) {
    const m = profile.machine;
    delete profile.machine;
    if (!m || typeof m !== 'object') return;
    const eggs = (list, max) => (Array.isArray(list) ? list : []).filter((e) => e && EGGS[e.type]).slice(0, max)
      .map((e) => ({ type: e.type, luck: Number(e.luck) || 1, size: Number(e.size) || 1 }));
    p.carried = JSON.stringify(eggs(m.carried, RULES.carryCap));
    p.pad = JSON.stringify(eggs(m.pad, progress.perksOf(profile).padCap));
    if (EGGS[m.eggType] && ['shredding', 'launch', 'growing', 'ready', 'hatching'].includes(m.stage)) {
      p.eggType = m.eggType;
      p.eggLuck = Number(m.eggLuck) || 1;
      if (m.stage === 'ready' || m.stage === 'hatching') this.setStage(sessionId, p, 'ready');
      else {
        // carry on growing for the time it had left (a little at least, so you see it grow)
        this.setStage(sessionId, p, 'growing');
        this.stageEnds.set(sessionId, Date.now() + Math.max(1500, Number(m.leftMs) || 0));
      }
    }
  }

  // The equipped pets walk in the pen and earn; boosts multiply what they earn. Also refreshes
  // everything the popups show (meta).
  refreshPets(p, profile) {
    const now = Date.now();
    const equipped = progress.equippedPets(profile);
    p.pets = JSON.stringify(equipped);
    p.allPets = progress.allPetsJson(profile);
    const friends = this.friendsHere(p);
    const serverOn = this.serverOn(now);
    p.income = Math.round(petIncome(equipped) * progress.perksOf(profile, now, serverOn).cash * friendCashMult(friends));
    p.cash = profile.cash;
    p.speed = profile.speed;
    p.trail = profile.trail || ''; // everyone sees your trail
    p.tread = (profile.treadLevel || 0) + 1; // everyone sees your treadmill and frame level
    const sessionId = this.sessionOf(p);
    const ends = this.stageEnds.get(sessionId);
    p.meta = progress.metaOf(profile, now, ends && p.stage === 'growing' ? ends - now : 0, { friendsHere: friends, serverOn, server: this.serverLeft(now) });
    this.metaKeys.set(sessionId, this.metaKey(profile, now));
  }

  // How many of this player's friends are playing in this server right now.
  friendsHere(p) {
    const ids = this.friendIds.get(this.sessionOf(p));
    if (!ids?.size) return 0;
    let n = 0;
    this.state.players.forEach((other) => {
      if (other !== p && (ids.has(other.userId) || ids.has(other.userId.replace(/^[a-z]+_/, '')))) n++;
    });
    return n;
  }

  // Someone joined, left or sent their friends: everyone's friend boost may change.
  refreshAll() {
    this.state.players.forEach((p) => this.refreshPets(p, getProfile(p.userId)));
  }

  // Changes when a potion runs out or the free gift becomes ready, so meta is refreshed then.
  metaKey(profile, now) {
    return `${Object.keys(profile.boosts).filter((id) => profile.boosts[id] > now).join()}|${now >= profile.giftAt}|${now >= profile.freeBoostAt}|${now >= (profile.adAt || 0)}|${Object.keys(this.serverOn(now)).join()}`;
  }

  // A shop / pets / index / rebirth action: run it, tell the player, sync what changed.
  // ------------------------------------------------------------------ the shop

  // server boosts running now: { id: true }, and how long each has left
  serverOn(now = Date.now()) {
    const on = {};
    for (const id in this.serverBoosts) if (this.serverBoosts[id] > now) on[id] = true;
    return on;
  }
  serverLeft(now = Date.now()) {
    const left = {};
    for (const id in this.serverBoosts) if (this.serverBoosts[id] > now) left[id] = this.serverBoosts[id] - now;
    return left;
  }

  buy(client, p, kind, id, to) {
    const now = Date.now();
    const buyer = getProfile(p.userId);
    const target = to && to !== client.sessionId ? this.state.players.get(to) : null;
    if (to && to !== client.sessionId && !target) return client.send('notice', { text: 'That player has left', ok: false });
    const recipient = target ? getProfile(target.userId) : buyer;
    const result = progress.buy(buyer, recipient, kind, id, { now, server: this.serverOn(now) });
    if (result.text) client.send('notice', { text: result.text, ok: result.ok });
    if (!result.ok) return;
    markDirty();
    this.refreshPets(p, buyer);
    if (target) {
      this.refreshPets(target, recipient);
      this.clients.getById(to)?.send('notice', { text: `${p.name} sent you a gift!`, ok: true });
    }
    const opener = target ? this.clients.getById(to) : client;
    if (result.pets?.length) opener?.send('opened', { pets: result.pets.map(({ id: petId, cash, mut }) => ({ id: petId, cash, mut })) });
    if (result.amount) client.send('gift', { amount: result.amount });
  }

  // A server boost: everyone in this server gets it for 15 more minutes.
  buyServerBoost(client, p, id) {
    const boost = SERVER_BOOSTS[id];
    if (!boost) return;
    const now = Date.now();
    const profile = getProfile(p.userId);
    const ends = Math.max(now, this.serverBoosts[id] || 0);
    if (ends - now > SERVER_BOOST_MAX_MS - SERVER_BOOST_MS) return client.send('notice', { text: 'That boost is already full', ok: false });
    const price = serverBoostPrice(id, progress.baseIncome(profile));
    if (profile.cash < price) return client.send('notice', { text: 'Not enough cash', ok: false });
    profile.cash -= price;
    this.serverBoosts[id] = ends + SERVER_BOOST_MS;
    markDirty();
    this.broadcast('notice', { text: `${p.name} started ${boost.name.replace('!', '')} for everyone!`, ok: true });
    this.refreshAll();
  }

  // Grow All (the Eggs panel): finishes every giant egg you hit in the last 2 minutes, for a price.
  growAll(client, p) {
    const now = Date.now();
    const trees = this.myGrowingEggs(client.sessionId, now);
    if (!trees.length) return client.send('notice', { text: 'Hit a giant egg first!', ok: false });
    const profile = getProfile(p.userId);
    const price = growAllPrice(trees);
    if (profile.cash < price) return client.send('notice', { text: `Grow All costs ${price.toLocaleString('en-US')}`, ok: false });
    profile.cash -= price;
    for (const { tree, state } of trees) {
      state.hp = 0;
      this.broadcast('hit', { id: tree.id, by: client.sessionId, damage: 0, hp: 0, reward: 0, fx: p.x, fz: p.z });
      this.fell(client.sessionId, p, tree, now, false);
    }
    p.cash = profile.cash;
    markDirty();
    client.send('notice', { text: `${trees.length} egg${trees.length > 1 ? 's' : ''} hatched!`, ok: true });
  }

  myGrowingEggs(sessionId, now) {
    const out = [];
    for (const [id, by] of this.hitters) {
      const state = this.state.trees.get(id);
      if (!state || state.hp <= 0 || now - (by.get(sessionId) || 0) > 120_000) continue;
      out.push({ tree: treeById.get(id), state });
    }
    return out.slice(0, 8);
  }

  // The bat: whatever the other player carries falls to the ground.
  bonk(client, p, targetId) {
    const now = Date.now();
    if (p.tool !== 'bat' || now - (this.lastBonk.get(client.sessionId) || 0) < BAT.cooldownMs) return;
    this.lastBonk.set(client.sessionId, now);
    const target = this.state.players.get(targetId);
    if (!target || target === p || !near(p, target.x, target.z, BAT.range)) return;
    if (target.carried === '[]') return;
    this.dropCarried(target);
    this.broadcast('bonked', { by: client.sessionId, target: targetId });
  }

  // Snow, then a rain storm, then snow... each for WEATHER.switchMs. Everyone sees the same weather.
  updateWeather(now) {
    if (now - this.weatherAt >= WEATHER.switchMs) {
      this.weatherAt = now;
      const i = WEATHER.kinds.indexOf(this.state.weather);
      this.state.weather = WEATHER.kinds[(i + 1) % WEATHER.kinds.length];
    }
    this.state.weatherLeft = Math.ceil((WEATHER.switchMs - (now - this.weatherAt)) / 1000);
  }

  // Lucky Egg Rain: every few seconds a lucky pet lands near each player out in the stages.
  eggRain(now) {
    if (!this.serverBoosts.eggRain || this.serverBoosts.eggRain <= now || now - this.lastRain < EGG_RAIN_EVERY_MS) return;
    this.lastRain = now;
    this.state.players.forEach((p) => {
      const zone = zoneAt(p.z);
      if (!zone) return;
      const tree = TREES.find((t) => zoneAt(t.z) === zone);
      if (!tree) return;
      const type = pickWeighted(TREE_TYPES[tree.type].eggs);
      const luck = rollLuck(type) * 3;
      const pet = rollPet(type, luck);
      const a = Math.random() * Math.PI * 2;
      this.spawnGroundEgg({
        type, luck, size: eggSize(tree), pet: JSON.stringify(pet),
        x: clamp(p.x + Math.cos(a) * 14, -WORLD.halfX + 3, WORLD.halfX - 3), z: clamp(p.z + Math.sin(a) * 14, WORLD.northZ + 3, WORLD.lineZ - 3),
        ox: p.x, oz: p.z,
      });
    });
  }

  act(client, p, run) {
    const profile = getProfile(p.userId);
    const result = run(profile, Date.now());
    if (result.text) client.send('notice', { text: result.text, ok: result.ok });
    if (!result.ok) return result;
    markDirty();
    this.refreshPets(p, profile);
    return result;
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;

    for (const [sessionId, ends] of this.stageEnds) {
      if (now >= ends) this.advanceStage(sessionId);
    }
    for (const [id, at] of this.treeRespawn) {
      if (now < at) continue;
      this.treeRespawn.delete(id);
      this.state.trees.get(id).hp = treeHp(treeById.get(id));
    }
    for (const [id, at] of this.eggExpiry) {
      if (now < at) continue;
      this.eggExpiry.delete(id);
      this.state.eggs.delete(id);
    }
    this.updateAnimals(now, dt);
    if (now - this.lastSecond >= 1000) {
      this.lastSecond += 1000;
      if (now - this.lastSecond > 3000) this.lastSecond = now;
      this.everySecond();
    }
  }

  // Pets earn cash; running on your own treadmill earns speed.
  everySecond() {
    const now = Date.now();
    this.eggRain(now);
    this.updateWeather(now);
    this.state.players.forEach((p, sessionId) => {
      const profile = getProfile(p.userId);
      profile.lastSeen = now; // for offline cash next time (also right if the server stops suddenly)
      reportBest('cash_per_sec', p.userId, p.income);   // leaderboards (only the highest is sent)
      reportBest('top_speed', p.userId, profile.speed);
      // a potion ran out or the free gift is ready: refresh income and what the popups show
      if (this.metaKeys.get(sessionId) !== this.metaKey(profile, now)) this.refreshPets(p, profile);
      let changed = false;
      if (p.income > 0) {
        profile.cash += p.income;
        changed = true;
      }
      if (onTreadmill(PLOTS[p.plot], p.x, p.y, p.z, p.tread)) {
        profile.speed += Math.round(treadStep(p.tread, profile.speed) * progress.perksOf(profile, now).treadmill);
        p.speed = profile.speed;
        changed = true;
      }
      if (changed) {
        p.cash = profile.cash;
        markDirty();
      }
    });
  }

  // Running anywhere (off the treadmill) slowly earns speed. Each step counts at most as far as
  // the player could really walk since their last update, so teleports or fake moves earn nothing extra.
  countRun(sessionId, p, x, z) {
    const now = Date.now();
    const last = this.lastMove.get(sessionId) || now;
    this.lastMove.set(sessionId, now);
    if (onTreadmill(PLOTS[p.plot], p.x, p.y, p.z, p.tread)) return;
    const seconds = Math.min(0.5, (now - last) / 1000);
    const profile = getProfile(p.userId);
    const k = progress.perksOf(profile, now);
    const step = Math.min(Math.hypot(x - p.x, z - p.z), walkSpeed(p.speed) * k.walk * seconds * 1.3 + 0.5);
    if (step < 0.05) return;
    const run = (this.runDistance.get(sessionId) || 0) + step;
    if (run < RUN_PER_GAIN) return void this.runDistance.set(sessionId, run);
    this.runDistance.set(sessionId, run - RUN_PER_GAIN);
    profile.speed += Math.round(runGain(profile.speed) * k.run);
    p.speed = profile.speed;
    markDirty();
  }

  // ------------------------------------------------------------------ animals

  updateAnimals(now, dt) {
    // forests nobody is in: their animals rest (no movement, so nothing to send to players)
    const busy = new Set();
    this.state.players.forEach((p) => { const z = zoneAt(p.z); if (z) busy.add(z.id); });
    this.state.animals.forEach((a, id) => {
      const brain = this.brains.get(id);
      if (a.mood === 'idle' && !a.carrying && !busy.has(brain.zone?.id)) return;
      const def = ANIMALS[a.type];
      const target = a.target ? this.state.players.get(a.target) : null;

      if (a.mood === 'alert') {
        if (!this.isThief(target, brain, now)) return this.calmDown(a);
        a.ry = Math.atan2(target.x - a.x, target.z - a.z);
        if (now >= brain.alertUntil) a.mood = 'chase';
        return;
      }
      if (a.mood === 'chase') {
        if (!this.isThief(target, brain, now)) return this.calmDown(a);
        const d = this.moveToward(a, target.x, target.z, def.speed, dt); // fixed per animal (see ANIMALS)
        if (d <= def.reach * Math.sqrt(animalSize(a.type))) this.steal(a, id, target, now); // bigger animals reach further
        return;
      }
      if (a.mood === 'return') {
        if (!a.carrying && this.spot(a, id, brain, now)) return;
        const d = this.moveToward(a, brain.home.x, brain.home.z, def.speed * ANIMAL.returnSpeed, dt);
        if (d > 2) return;
        if (a.carrying) {
          const egg = JSON.parse(a.carrying);
          this.spawnGroundEgg({ ...egg, x: brain.home.x + (Math.random() - 0.5) * 8, z: brain.home.z + (Math.random() - 0.5) * 8, ox: a.x, oz: a.z });
          a.carrying = '';
        }
        a.mood = 'idle';
        brain.waitUntil = now + 1500;
        return;
      }

      // idle: look for thieves, otherwise wander around home
      if (this.spot(a, id, brain, now)) return;
      if (!brain.wanderTo) {
        if (now < brain.waitUntil) return;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * ANIMAL.wanderRadius;
        brain.wanderTo = { x: brain.home.x + Math.cos(angle) * r, z: brain.home.z + Math.sin(angle) * r };
      }
      if (this.moveToward(a, brain.wanderTo.x, brain.wanderTo.z, ANIMAL.wanderSpeed, dt) < 0.5) {
        brain.wanderTo = null;
        brain.waitUntil = now + 1500 + Math.random() * 3500;
      }
    });
  }

  isThief(p, brain, now) {
    if (!p || p.z > WORLD.lineZ) return false; // home free in the safe zone
    if (p.carried === '[]') return false; // not carrying (no JSON decode in this hot path)
    // it chases you anywhere in its own forest, and gives up once you leave it
    if (brain.zone ? p.z > brain.zone.maxZ || p.z < brain.zone.minZ : Math.hypot(p.x - brain.home.x, p.z - brain.home.z) > ANIMAL.leash) return false;
    return now >= (this.grace.get(this.sessionOf(p)) || 0);
  }

  sessionOf(p) {
    const id = this.sidOf.get(p);
    if (id) return id;
    for (const [sessionId, other] of this.state.players) if (other === p) return sessionId;
    return '';
  }

  spot(a, id, brain, now) {
    let best = null;
    let bestDist = ANIMAL.detect;
    this.state.players.forEach((p, sessionId) => {
      const d = Math.hypot(p.x - a.x, p.z - a.z);
      if (d < bestDist && this.isThief(p, brain, now)) {
        best = sessionId;
        bestDist = d;
      }
    });
    if (!best) return false;
    a.mood = 'alert';
    a.target = best;
    brain.alertUntil = now + ANIMAL.alertMs;
    brain.wanderTo = null;
    return true;
  }

  calmDown(a) {
    a.mood = 'return';
    a.target = '';
  }

  moveToward(a, x, z, speed, dt) {
    const dx = x - a.x, dz = z - a.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-3) return 0;
    const step = Math.min(d, speed * dt);
    const dir = this.steerRoundTrees(a, dx / d, dz / d, d);
    a.x += dir.x * step;
    a.z += dir.z * step;
    a.ry = Math.atan2(dir.x, dir.z);
    this.keepOutOfTrees(a);
    return d - step;
  }

  // Walking round trees: if a trunk stands on the way ahead (closer than the target), the guard
  // turns aside early, away from the side the trunk is on, so it goes round it instead of into it.
  steerRoundTrees(a, ux, uz, targetDist) {
    const own = animalRadius(a.type);
    const ahead = Math.min(targetDist, own * 4 + 30);
    let sx = 0, sz = 0;
    for (const t of DECOR_TREES) {
      const tx = t.x - a.x, tz = t.z - a.z;
      const along = tx * ux + tz * uz;              // how far ahead the trunk is
      if (along <= 0 || along > ahead) continue;
      const side = tx * -uz + tz * ux;              // how far to the side of the path (+ = left)
      const clear = t.r + own + 3;
      if (Math.abs(side) >= clear) continue;
      // push away from the trunk's side, harder the nearer and more in the way it is
      const k = (1 - Math.abs(side) / clear) * (1 - along / (ahead + 1)) * 2.2;
      const away = side >= 0 ? -1 : 1;
      sx += -uz * away * k;
      sz += ux * away * k;
    }
    const x = ux + sx, z = uz + sz;
    const len = Math.hypot(x, z) || 1;
    return { x: x / len, z: z / len };
  }

  // A guard can't walk through a tree: if it ends up inside a trunk it is pushed back out to the
  // trunk's edge, so it slides round the tree instead.
  keepOutOfTrees(a) {
    const own = animalRadius(a.type);
    for (const t of DECOR_TREES) {
      const dx = a.x - t.x, dz = a.z - t.z;
      const reach = t.r + own;
      if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
      const d = Math.hypot(dx, dz);
      if (d >= reach) continue;
      const k = d < 1e-3 ? 1 : reach / d;
      a.x = t.x + (d < 1e-3 ? reach : dx * k);
      a.z = t.z + (d < 1e-3 ? 0 : dz * k);
    }
  }

  steal(a, id, p, now) {
    const sessionId = a.target;
    const carried = JSON.parse(p.carried);
    const egg = carried.pop();
    p.carried = JSON.stringify(carried);
    a.carrying = JSON.stringify(egg);
    a.mood = 'return';
    a.target = '';
    this.grace.set(sessionId, now + ANIMAL.graceMs);
    this.broadcast('stolen', { animal: id, from: sessionId, type: egg.type, x: a.x, z: a.z });
  }

  // ------------------------------------------------------------------ trees and eggs

  spawnGroundEgg(egg) {
    if (this.state.eggs.size >= MAX_GROUND_EGGS) return;
    const id = `e${++this.eggSeq}`;
    this.state.eggs.set(id, new GroundEgg(egg));
    this.eggExpiry.set(id, Date.now() + RULES.groundEggMs);
  }

  chop(client, p, id) {
    const tree = treeById.get(id);
    const state = this.state.trees.get(id);
    if (!tree || !state || state.hp <= 0) return;
    const now = Date.now();
    const k = progress.perksOf(getProfile(p.userId), now, this.serverOn(now));
    if (now - (this.lastChop.get(client.sessionId) || 0) < RULES.chopCooldownMs / k.swing) return;
    if (!near(p, tree.x, tree.z, chopRange(tree))) return;
    this.lastChop.set(client.sessionId, now);

    if (!this.hitters.has(id)) this.hitters.set(id, new Map());
    this.hitters.get(id).set(client.sessionId, now);
    // x2 Damage, and growth (x2 Growth, Golden Can, the growing power-up); at least RULES.minHits hits per egg
    const rain = this.state.weather === 'rain' ? WEATHER_PERKS.rainGrowth : 1; // Growth Rain
    const damage = chopDamage(tree, axeById(p.axe).power * k.power * k.growth * rain);
    state.hp = Math.max(0, state.hp - damage);
    const felled = state.hp <= 0;
    const reward = felled ? Math.round(treeReward(tree) * k.cash * friendCashMult(this.friendsHere(p))) : 0;
    // fx/fz: where the hitter stands, so the tree falls away from them
    this.broadcast('hit', { id, by: client.sessionId, damage, hp: state.hp, reward, fx: p.x, fz: p.z });
    if (!felled) return;

    const profile = getProfile(p.userId);
    profile.cash += reward;
    this.fell(client.sessionId, p, tree, now, true);
  }

  // A giant egg grown to full: it hatches and its pet lands beside it. The grower's luck (Super
  // Lucky, Server Luck, banked Lucky Dust) and mutation chances count; they also earn snowflakes.
  fell(sessionId, p, tree, now, touched) {
    const profile = getProfile(p.userId);
    const server = this.serverOn(now);
    const k = progress.perksOf(profile, now, server);
    this.treeRespawn.set(tree.id, now + (tree.giant ? RULES.giantRespawnMs : RULES.treeRespawnMs));
    this.hitters.delete(tree.id);
    const egg = hatchFromEggNode(tree, k.luck * progress.useLuck(profile));
    const pet = progress.maybeMutate(profile, JSON.parse(egg.pet), { storm: !!server.mutationStorm, touch: touched });
    if (server.eggSize) pet.cash *= 2;
    egg.pet = JSON.stringify(pet);
    this.spawnGroundEgg(egg);
    profile.treesChopped = (profile.treesChopped || 0) + 1;
    profile.snowflakes = (profile.snowflakes || 0) + snowflakesForHatch(ZONES.indexOf(zoneAt(tree.z))) * (this.state.weather === 'snow' ? WEATHER_PERKS.snowFlakes : 1);
    p.cash = profile.cash;
    markDirty();
    this.refreshPets(p, profile);
  }

  pick(p, id) {
    const egg = this.state.eggs.get(id);
    if (!egg || !near(p, egg.x, egg.z, RANGE.pick)) return;
    const carried = JSON.parse(p.carried);
    if (carried.length >= RULES.carryCap) return;
    carried.push({ type: egg.type, luck: egg.luck, size: egg.size || 1, pet: egg.pet || '' });
    p.carried = JSON.stringify(carried);
    this.state.eggs.delete(id);
    this.eggExpiry.delete(id);
    const profile = getProfile(p.userId);
    profile.eggsStolen = (profile.eggsStolen || 0) + 1;
    reportAdd('eggs_stolen', p.userId, 1);
    markDirty();
    this.alertGuard(p, Date.now());
  }

  // Taking an egg in a forest always gets noticed: the nearest free animal of that forest turns
  // angry and comes after you, however far away it is.
  alertGuard(p, now) {
    const zone = zoneAt(p.z);
    if (!zone) return; // the safe zone
    let best = null;
    let bestDist = Infinity;
    this.state.animals.forEach((a, id) => {
      const brain = this.brains.get(id);
      if (brain.zone?.id !== zone.id || a.carrying || a.mood === 'chase' || a.mood === 'alert') return;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      if (d < bestDist) {
        best = { a, brain };
        bestDist = d;
      }
    });
    if (!best || !this.isThief(p, best.brain, now)) return;
    best.a.mood = 'alert';
    best.a.target = this.sessionOf(p);
    best.brain.alertUntil = now + ANIMAL.alertMs;
    best.brain.wanderTo = null;
  }

  dropCarried(p) {
    const carried = JSON.parse(p.carried);
    if (!carried.length) return;
    carried.forEach((egg, i) => this.spawnGroundEgg({ ...egg, x: p.x + (i ? 2.5 : -2.5), z: p.z + 2 }));
    p.carried = '[]';
  }

  // ------------------------------------------------------------------ the axe shop

  buyAxe(client, p, id) {
    const axe = AXES.find((a) => a.id === id);
    const profile = getProfile(p.userId);
    if (!axe || profile.ownedAxes.includes(id)) return;
    if (!near(p, SHOPS.axe.x, SHOPS.axe.z, RANGE.shop)) return;
    if (profile.cash < axe.price) return;
    profile.cash -= axe.price;
    profile.ownedAxes.push(id);
    profile.axe = id;
    p.cash = profile.cash;
    p.axes = JSON.stringify(profile.ownedAxes);
    p.axe = id;
    markDirty();
    client.send('bought', { id, name: axe.name });
  }

  equipAxe(p, id) {
    const profile = getProfile(p.userId);
    if (!profile.ownedAxes.includes(id)) return;
    profile.axe = id;
    p.axe = id;
    markDirty();
  }

  // ------------------------------------------------------------------ the plot machine

  atOwnPlot(p, local, range) {
    const at = plotToWorld(PLOTS[p.plot], local.x, local.z);
    return near(p, at.x, at.z, range);
  }

  // Bringing what you carry to your own frame: a stolen pet goes straight into your pen (an old
  // plain egg, from before eggs hatched in the field, hatches there and then).
  fillPad(p) {
    if (!this.atOwnPlot(p, PLOT.pad, RANGE.pad)) return;
    const carried = JSON.parse(p.carried);
    if (!carried.length) return;
    const sessionId = this.sessionOf(p);
    for (const item of carried) {
      let pet = null;
      try { pet = item.pet ? JSON.parse(item.pet) : null; } catch { pet = null; }
      if (!pet || !PETS[pet.id]) pet = hatchResult(item.type, item.luck).pet;
      this.givePet(sessionId, p, pet, EGGS[item.type]?.name || 'Egg');
    }
    p.carried = '[]';
  }

  pullLever(client, p) {
    if (p.stage !== 'idle' || !this.atOwnPlot(p, PLOT.lever, RANGE.lever)) return;
    const pad = JSON.parse(p.pad);
    if (!pad.length) return;
    const { type, luck } = shredResult(pad);
    p.pad = '[]';
    p.eggType = type;
    p.eggLuck = luck;
    this.setStage(client.sessionId, p, 'shredding');
    const profile = getProfile(p.userId);
    profile.eggsShredded = (profile.eggsShredded || 0) + pad.length;
    markDirty();
  }

  hatch(client, p) {
    if (p.stage !== 'ready' || !this.atOwnPlot(p, PLOT.eggSpot, RANGE.hatch)) return;
    this.setStage(client.sessionId, p, 'hatching');
  }

  setStage(sessionId, p, stage) {
    p.stage = stage;
    const profile = getProfile(p.userId);
    let ms = STAGE_MS[stage];
    if (ms && stage === 'growing') ms /= progress.perksOf(profile).growth; // x2 Growth pass / potion
    if (ms) this.stageEnds.set(sessionId, Date.now() + ms);
    else this.stageEnds.delete(sessionId);
    if (stage === 'growing' || stage === 'ready') this.refreshPets(p, profile); // the eggs panel's timer
  }

  advanceStage(sessionId) {
    const p = this.state.players.get(sessionId);
    if (!p) return void this.stageEnds.delete(sessionId);
    if (p.stage === 'shredding') this.setStage(sessionId, p, 'launch');
    else if (p.stage === 'launch') this.setStage(sessionId, p, 'growing');
    else if (p.stage === 'growing') this.setStage(sessionId, p, 'ready');
    else if (p.stage === 'hatching') this.finishHatch(sessionId, p);
  }

  finishHatch(sessionId, p) {
    const { pet, egg } = hatchResult(p.eggType, p.eggLuck);
    this.setStage(sessionId, p, 'idle');
    p.eggType = '';
    p.eggLuck = 1;
    this.givePet(sessionId, p, pet, egg);
  }

  // A new pet for the player's pen, with the reveal popup. The first one also pays enough for the
  // first scythe and moves the new-player guide on to the shops.
  givePet(sessionId, p, pet, egg) {
    const profile = getProfile(p.userId);
    progress.addPet(profile, pet);
    if (profile.tutorial === 'basics') profile.tutorial = 'axeShop'; // first pet: on to the shop tour
    // The first pet pays out enough for the Wooden Scythe, so every new player can move from
    // growing eggs with their hands to a scythe right after the tutorial loop.
    let bonus = 0;
    if (!profile.starterBonus && profile.ownedAxes.length <= 1) {
      bonus = Math.max(0, AXES[1].price - profile.cash);
      profile.cash += bonus;
      p.cash = profile.cash;
    }
    profile.starterBonus = true;
    markDirty();
    this.refreshPets(p, profile);
    const def = PETS[pet.id];
    this.clients.getById(sessionId)?.send('hatched', { pet: pet.id, cash: pet.cash, name: def.name, rarity: def.rarity, egg, bonus });
  }
}
