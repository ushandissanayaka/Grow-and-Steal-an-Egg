// Works out what the player can do right now, and turns E, Q, F and clicks into server messages.

import * as THREE from 'three';
import { INVITE_RADIUS } from '../entities/InviteSpot.js';
import {
  AXES, EGGS, PETS, PLOT, PLOTS, RANGE, RULES, SHOPS, TREES, TREE_TYPES, ZONES, axeById, chopRange, hitsToFell, plotToWorld, treeHp, zoneAt,
} from '../../shared/gameData.js';
import { itemPet } from '../entities/Egg.js';
import { BAT } from '../../shared/progression.js';

// The egg a giant egg spot grows (the most likely egg of its old tree type).
const nodeEgg = (def) => TREE_TYPES[def.type].eggs.reduce((best, e) => (e[1] > best[1] ? e : best))[0];

// The shops the guide walks a new player through, in order: [shop, objective, next step].
const SHOP_TOUR = {
  axeShop: ['axe', 'VISIT THE SCYTHE SHOP!', 'sellShop'],
  sellShop: ['sell', 'VISIT THE SELL SHOP!', 'trailsShop'],
  trailsShop: ['trails', 'VISIT THE TRAILS SHOP!', 'done'],
};
const ZONE_MAX_HITS = 60; // a forest is "yours" when its trees fall in this many hits or fewer

const NEAR_EGG_HINT = 34;
// The Starting Place shops: walking up to one opens its popup, walking away closes it.
const SHOP_POPUPS = [['axe', 'Scythe Shop'], ['sell', 'Sell Shop'], ['trails', 'Trails Shop'], ['fusion', 'Winter Fusion', 40], ['crate', 'Alien Crate', 30], ['fuse', 'Fuse Machine', 34], ['dragon', 'Inferno Dragon', 30], ['feedback', 'Feedback', 16]];
const SHOP_OPEN_RANGE = 22;
const FREE_PAD_RADIUS = 13;
const TREE_BAR_RANGE = 40;  // the HP bar shows for the nearest tree this close
const GLOW_MARGIN = 4;      // the trunk glows green this little bit before it is in reach
const _v = new THREE.Vector3();

const distance = (a, x, z) => Math.hypot(a.x - x, a.z - z);

export class InteractionSystem {
  constructor(game) {
    this.game = game;
    this.action = null;    // { kind, verb, title, at: Vector3, run }
    this.tree = null;      // the nearest standing tree: { def, hp, max, inReach }
    this.lastSwing = 0;
    this.done = new Set(); // guide steps done this session (the server keeps them too)
    this.autoSwing = false;
    this.hold = null;      // { id, start, sent } while E is held on an egg
    this.holdFill = 0;     // 0..1, shown in the prompt
  }

  // A JSON field decoded only when it changes (these are read every frame).
  cached(name, json) {
    this.decoded ??= {};
    const c = this.decoded[name];
    if (c && c.json === json) return c.value;
    const value = JSON.parse(json || '[]');
    this.decoded[name] = { json, value };
    return value;
  }

  // E (or the gamepad X button) is down right now
  holdingE() {
    const input = this.game.input;
    return input.keys.has('KeyE') || !!input.pad.buttons[2] || !!input.touchHold; // touch: the Action button
  }

  // Eggs are picked up by holding E until the prompt fills.
  updateHold() {
    const a = this.action;
    if (a?.kind !== 'pick' || !this.holdingE()) {
      this.hold = null;
      this.holdFill = 0;
      return;
    }
    const now = performance.now();
    if (this.hold?.id !== a.id) this.hold = { id: a.id, start: now, sent: false };
    this.holdFill = Math.min(1, (now - this.hold.start) / RULES.pickHoldMs);
    if (this.holdFill >= 1 && !this.hold.sent) {
      this.hold.sent = true;
      a.run();
    }
  }

  update() {
    const { game } = this;
    const me = game.me;
    if (!me) return;
    const pos = game.player.body.pos;
    const plot = PLOTS[me.plot];
    const carried = this.cached('carried', me.carried);
    const pad = this.cached('pad', me.pad);
    const stage = me.stage;
    const spot = (local) => plotToWorld(plot, local.x, local.z);

    this.action = null;
    const offer = (kind, verb, title, x, y, z, run) => {
      this.action = { kind, verb, title, at: new THREE.Vector3(x, y, z), run };
    };

    const eggSpot = spot(PLOT.eggSpot);
    const padSpot = spot(PLOT.pad);

    let nearestEgg = null;
    let nearestDist = Infinity;
    game.room.state.eggs.forEach((egg, id) => {
      const d = distance(pos, egg.x, egg.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEgg = { id, egg };
      }
    });

    if (stage === 'ready' && distance(pos, eggSpot.x, eggSpot.z) < RANGE.hatch) {
      offer('hatch', 'Hatch', EGGS[me.eggType]?.name || 'Egg', eggSpot.x, 9, eggSpot.z, () => game.room.send('hatch'));
    } else if (carried.length && distance(pos, padSpot.x, padSpot.z) < RANGE.pad) {
      offer('pad', 'Drop', 'Put in Pen', padSpot.x, 4, padSpot.z, () => game.room.send('pad'));
    } else if (nearestEgg && nearestDist < RANGE.pick && carried.length < RULES.carryCap) {
      const { id, egg } = nearestEgg;
      offer('pick', 'Hold to Grab', PETS[itemPet(egg)?.id]?.name || EGGS[egg.type].name, egg.x, 6 * (egg.size || 1), egg.z, () => game.room.send('pick', { id }));
      this.action.id = id;
    }
    // no "Press E" for the shops: walking up to one opens its popup straight away
    this.autoOpenShop(pos);
    this.walkOnPads(pos);

    this.updateHold();
    this.updateTree(pos);
    this.updateGuide({ me, carried, pad, stage, nearestEgg, nearestDist, padSpot, eggSpot, pos, plot });
    if (this.autoSwing && this.tree?.inReach) this.swing();
  }

  updateTree(pos) {
    let best = null;
    let bestDist = TREE_BAR_RANGE;
    for (const def of TREES) {
      const d = distance(pos, def.x, def.z);
      if (d >= bestDist) continue;
      const hp = this.game.room.state.trees.get(def.id)?.hp ?? 0;
      if (hp <= 0) continue;
      best = { def, hp, max: treeHp(def), inReach: d < chopRange(def), near: d < chopRange(def) + GLOW_MARGIN };
      bestDist = d;
    }
    this.tree = best;
  }

  // The guide: the goal message at the bottom and the arrows on the ground. Each step has a key and
  // is only shown until the player has done it once ('chop', 'pick', 'pad', 'hatch', the shop tour,
  // 'axe:stone', 'zone:autumn'...). Done steps are kept on the server.
  updateGuide({ me, carried, pad, stage, nearestEgg, nearestDist, padSpot, eggSpot, pos, plot }) {
    const owned = this.game.ownedAxes(me);
    const nearEgg = nearestEgg && nearestDist < NEAR_EGG_HINT;

    // what the player did just now ticks steps off
    if (carried.length) this.markDone('pick');
    if (pad.length) this.markDone('pad');

    let step;
    if (stage === 'shredding' || stage === 'launch') step = { key: 'hatch', text: 'HERE COMES YOUR NEW EGG!', guide: null };
    else if (stage === 'growing' || stage === 'hatching') step = { key: 'hatch', text: 'WATCH YOUR EGG GROW!', guide: null };
    else if (stage === 'ready') step = { key: 'hatch', text: 'PRESS E TO HATCH YOUR EGG!', guide: eggSpot };
    else if (carried.length) {
      step = { key: 'pad', text: distance(pos, padSpot.x, padSpot.z) < RANGE.pad ? 'CLICK TO PUT THE PET IN YOUR PEN!' : 'RUN HOME BEFORE THE GUARD CATCHES YOU!', guide: padSpot };
    } else if (nearEgg) {
      step = { key: 'pick', text: 'HOLD E TO GRAB THE PET!', guide: nearestEgg.egg };
    } else step = this.nextTask(me, pos, plot, owned) || this.chopStep(me, pos, owned);

    // the guide never goes quiet: there is always a goal and (when it is somewhere) arrows to it
    this.guide = step.guide || null;
    this.game.store.set({ objective: step.text, carried: carried.length });
  }

  // Nothing else to do: chop trees for eggs, in the best forest you are strong enough for.
  chopStep(me, pos, owned) {
    const zone = this.bestZone(me);
    const here = zoneAt(pos.z);
    const inBest = here?.id === zone.id;
    // the arrows lead to that forest (also back to it from a forest still too hard for your axe);
    // only if every tree there is down for a moment do they show the nearest tree anywhere
    const guide = this.nearestStandingTree(pos, zone.id) || this.nearestStandingTree(pos);
    let text;
    if (owned.length <= 1) text = 'HIT A GIANT EGG TO GROW IT!';
    else if (inBest || this.game.meta?.tutorial === 'basics') text = 'GROW GIANT EGGS TO HATCH PETS!';
    else text = `GROW GIANT EGGS IN ${zone.name.toUpperCase()}!`;
    return { key: 'chop', text, guide };
  }

  isDone(key) {
    return this.done.has(key) || (this.game.meta?.guideDone || []).includes(key);
  }

  markDone(key) {
    if (this.isDone(key)) return;
    this.done.add(key);
    this.game.room.send('guideDone', { key });
  }

  // ---------------------------------------------------------------- the guide

  // The guide's step once nothing about eggs needs doing (null: the plain "chop a tree" step).
  nextTask(me, pos, plot, owned) {
    const { game } = this;
    const step = game.meta?.tutorial || 'done';
    if (step === 'basics') return null;

    // the frames have no treadmills any more: a save still on the old treadmill step goes on to the shops
    if (step === 'treadmill') this.advance('axeShop', null);
    const tour = SHOP_TOUR[step === 'treadmill' ? 'axeShop' : step];
    if (tour) {
      const shop = SHOPS[tour[0]];
      // reaching the shop (its popup opens) is enough: nothing has to be bought to go on
      const visited = distance(pos, shop.x, shop.z) < SHOP_OPEN_RANGE || this.game.store.get().popup === tour[0];
      if (visited) this.advance(tour[2], tour[2] === 'done' ? 'Now go grow giant eggs and steal their pets!' : null);
      return { key: step, text: tour[1], guide: shop };
    }

    // done: the next axe once you can afford it (until you buy it)...
    for (const axe of AXES) if (owned.includes(axe.id)) this.markDone(`axe:${axe.id}`);
    const next = AXES.find((a) => a.price > 0 && !owned.includes(a.id));
    if (next && me.cash >= next.price) {
      // a better axe you can afford: the guide shows you the Axe Shop (opening it is enough)
      const key = `axe:${next.id}`;
      if (this.game.store.get().popup === 'axe') this.markDone(key);
      if (!this.isDone(key)) return { key, text: `YOU CAN BUY THE ${next.name.toUpperCase()}!`, guide: SHOPS.axe };
    }
    // ...and each new forest you become strong enough for (until you get there)
    const zone = this.bestZone(me);
    const key = `zone:${zone.id}`;
    if (zoneAt(pos.z)?.id === zone.id) this.markDone(key);
    if (this.isDone(key)) return null; // then the usual "chop trees" goal
    return { key, text: `GO TO ${zone.name.toUpperCase()}!`, guide: this.nearestStandingTree(pos, zone.id) };
  }

  advance(step, message) {
    if (this.sentStep === step) return;
    this.sentStep = step;
    this.game.room.send('tutorial', { step });
    if (message) this.game.toast(message, '#7dff3f');
  }

  // The furthest forest whose trees fall in ZONE_MAX_HITS hits with your axe and whose recommended
  // speed you have. Says so when you become strong enough for a new one.
  bestZone(me) {
    const power = axeById(me.axe).power;
    let best = 0;
    ZONES.forEach((zone, i) => {
      const tree = TREES.find((t) => t.zone === zone.id && !t.giant);
      if (tree && hitsToFell(tree, treeHp(tree), power) <= ZONE_MAX_HITS && me.speed >= zone.speed) best = i;
    });
    if (this.bestZoneIndex !== undefined && best > this.bestZoneIndex) {
      this.game.toast(`You're strong enough for ${ZONES[best].name}! Follow the arrows!`, '#ffd21f');
    }
    this.bestZoneIndex = best;
    return ZONES[best];
  }

  nearestStandingTree(pos, zoneId = null) {
    let best = null;
    let bestDist = Infinity;
    for (const def of TREES) {
      if (zoneId && (def.zone !== zoneId || def.giant)) continue;
      const d = distance(pos, def.x, def.z);
      if (d >= bestDist || (this.game.room.state.trees.get(def.id)?.hp ?? 0) <= 0) continue;
      best = def;
      bestDist = d;
    }
    return best;
  }

  openShop(id = 'axe') {
    this.game.store.set({ popup: id });
  }

  // Stepping onto the Invite Friend pad opens the invite popup; stepping onto the FREE pad claims
  // the free gift (or says how long until it is ready). Once per visit to each pad.
  walkOnPads(pos) {
    const { game } = this;
    const onInvite = distance(pos, SHOPS.invite.x, SHOPS.invite.z) < INVITE_RADIUS;
    if (onInvite && !this.onInvite && !game.store.get().popup) game.store.set({ popup: 'invite' });
    this.onInvite = onInvite;

    const onFree = distance(pos, SHOPS.free.x, SHOPS.free.z) < FREE_PAD_RADIUS;
    if (onFree && !this.onFree) {
      const meta = game.store.get().meta;
      const left = meta ? meta.giftIn - (performance.now() - meta.at) : Infinity;
      if (left <= 0) game.room.send('claimGift');
      else if (meta) game.toast(`Free gift in ${Math.floor(left / 60000)}m ${String(Math.ceil(left / 1000) % 60).padStart(2, '0')}s!`, '#ffd21f');
    }
    this.onFree = onFree;
  }

  // Opens a shop's popup on walking up to it (once per visit), and closes it on walking away.
  autoOpenShop(pos) {
    const inside = SHOP_POPUPS.find(([id, , range]) => distance(pos, SHOPS[id].x, SHOPS[id].z) < (range || SHOP_OPEN_RANGE))?.[0] || null;
    if (inside === this.shopInside) return;
    const { store } = this.game;
    const open = store.get().popup;
    if (inside && !open) store.set({ popup: inside });
    else if (!inside && open === this.shopInside) store.set({ popup: null });
    this.shopInside = inside;
  }

  // eggs the drop pad takes (bigger with the Egg Crate pass and rebirths)
  interact() {
    if (this.action?.kind === 'pick') return; // picking needs E held down (updateHold)
    this.action?.run();
  }

  dropEggs() {
    this.game.room.send('drop');
  }

  toggleAutoSwing() {
    this.autoSwing = !this.autoSwing;
    this.game.store.set({ autoSwing: this.autoSwing });
    if (this.autoSwing && this.game.tool === 'bat') this.game.setTool('scythe'); // Auto Grow needs the scythe
  }

  swing() {
    if (!this.tree?.inReach || this.game.tool === 'bat') return;
    const now = performance.now();
    const wait = (this.autoSwing ? RULES.autoSwingMs : RULES.chopCooldownMs) / (this.game.meta?.swing || 1); // x2 Swing pass / potion
    if (now - this.lastSwing < wait) return;
    this.lastSwing = now;
    this.game.player.punch();
    this.game.room.send('chop', { id: this.tree.def.id });
  }

  // Clicks drop eggs on the pad, otherwise they chop.
  click() {
    if (this.action?.kind === 'pad') return this.action.run();
    if (this.game.tool === 'bat') return this.batSwing();
    return this.swing();
  }

  // The bat: swing at the nearest other player in reach; if they carry a pet or egg, it drops.
  batSwing() {
    const now = performance.now();
    if (now - (this.lastBat || 0) < BAT.cooldownMs) return;
    this.lastBat = now;
    const { player, remotes, room } = this.game;
    player.punch();
    const me = player.body.pos;
    let best = null;
    let bestD = BAT.range + 2;
    for (const [id, remote] of remotes) {
      const d = Math.hypot(remote.root.position.x - me.x, remote.root.position.z - me.z);
      if (d < bestD) { best = id; bestD = d; }
    }
    if (best) room.send('bonk', { id: best });
  }

  // Screen position (CSS pixels) of a world point, or null when it is behind the camera.
  project(point) {
    const { camera, renderer } = this.game;
    _v.copy(point).project(camera);
    if (_v.z > 1) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    return { x: Math.round(((_v.x + 1) / 2) * rect.width / 4) * 4, y: Math.round(((1 - _v.y) / 2) * rect.height / 4) * 4 };
  }

  publish() {
    const { store } = this.game;
    const a = this.action;
    const at = a && this.project(a.at);
    const fill = a?.kind === 'pick' ? Math.round(this.holdFill * 50) / 50 : null;
    store.set({ prompt: a && at ? { verb: a.verb, title: a.title, x: at.x, y: at.y, fill } : null });

    const t = this.tree;
    const tp = t && this.project(_v.set(t.def.x, 4.5 + 2.5 * t.def.scale, t.def.z).clone()) // beside the trunk, about head height;
    if (!t || !tp) return store.set({ treeBar: null });
    const power = axeById(this.game.me.axe).power;
    store.set({
      treeBar: {
        name: `${t.def.giant ? 'Huge ' : 'Giant '}${EGGS[nodeEgg(t.def)].name}`, hp: t.hp, max: t.max, hits: hitsToFell(t.def, t.hp, power), x: tp.x, y: tp.y,
        inReach: t.inReach, // close enough to hit: show the auto swing / click to swing prompt
      },
    });
  }
}
