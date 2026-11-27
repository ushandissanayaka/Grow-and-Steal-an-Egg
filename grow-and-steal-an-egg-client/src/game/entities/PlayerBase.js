// A player's plot: the fenced pen, with a drop spot for eggs in front of it (shown only as a green
// glow while you carry an egg home).
// Plays the shred -> launch -> grow -> hatch sequence from the owner's server state.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { canvasTexture, drawOutlinedText, makeBillboard, FONT_TITLE, FONT_UI } from '../util/canvasText.js';
import { BELT_TOP, buildPillars, buildTreadmill } from './Treadmill.js';
import { treadStep, treadmillPrice } from '../../shared/progression.js';
import { EGGS, PLOT, PLOT_SCALE, RULES, STAGE_MS, TREAD_SIZE, TREADMILL_BELT, formatNumber, plotToWorld } from '../../shared/gameData.js';
import { createEgg, luckText } from './Egg.js';
import { PetPen } from './PetDisplay.js';
import { OwnerSign } from './OwnerSign.js';
import { createGlow } from './Effects.js';

const LAMP_OFF = new THREE.Color('#8a9098');
const _lamp = new THREE.Color();

const FENCE_POST = '#6e3120';
const FENCE_RAIL = '#7f3a24';
const FENCE_BASE = '#cc6d3d';

// The drop spot has no pad drawn any more: eggs dropped there sit on the ground, and slide inwards
// along BELT_LOW -> BELT_HIGH when they are used.
const PAD_TOP = 0;
const BELT_LOW = new THREE.Vector3(12.4, 1.2, 0);
const BELT_HIGH = new THREE.Vector3(6.4, 4.2, 0);
const LAUNCH_PEAK = 18;
const LAUNCH_FROM = new THREE.Vector3(PLOT.pad.x, 1.5, PLOT.pad.z); // new eggs pop up from the drop pad
const PEN_GAP_EDGE = 21; // the front fence starts this far from the middle, leaving a wide way in (plot units)
// up to 6 eggs on the pad (Egg Crate and rebirths make room for more than 2)
const PAD_SLOTS = [[20, -3], [20, 3], [15.5, -3], [15.5, 3], [24.5, -3], [24.5, 3]].map(([x, z]) => new THREE.Vector3(x, PAD_TOP, z));
const RIDE_SECONDS = 1.5;
const RIDE_GAP = 0.5;

const parse = (json) => {
  try { return JSON.parse(json); } catch { return []; }
};

function addFence(v, ax, az, bx, bz, colliders) {
  const horizontal = az === bz;
  const length = horizontal ? Math.abs(bx - ax) : Math.abs(bz - az);
  const cx = (ax + bx) / 2, cz = (az + bz) / 2;
  const box = (y, h, across, color) => v.box(cx, y, cz, horizontal ? length : across, h, horizontal ? across : length, color);
  box(0, 0.5, 3.4, FENCE_BASE);
  box(2.2, 0.55, 0.6, FENCE_RAIL);
  box(3.7, 0.55, 0.6, FENCE_RAIL);
  const posts = Math.max(1, Math.round(length / 8));
  for (let i = 0; i <= posts; i++) {
    const k = i / posts;
    const px = ax + (bx - ax) * k, pz = az + (bz - az) * k;
    v.box(px, 0, pz, 1.3, 5.1, 1.3, FENCE_POST);
    v.box(px, 5.1, pz, 1.7, 0.5, 1.7, FENCE_POST);
  }
  colliders.push([Math.min(ax, bx) - 0.7, Math.max(ax, bx) + 0.7, Math.min(az, bz) - 0.7, Math.max(az, bz) + 0.7, 5]);
}











// "Upgrade Treadmill / Level 1 > 2 / +4 > +8 Speed / $15K": a dark board on a post beside the treadmill.
function drawBoard(canvas, level, price, afford) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  g.fillStyle = '#0e1630';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#16204a';
  for (let y = 18; y < H; y += 46) for (let x = 18; x < W; x += 46) g.fillRect(x, y, 30, 30);
  drawOutlinedText(g, 'Upgrade Treadmill', W / 2, 62, { size: 58, fill: '#ffffff', font: FONT_UI, weight: 800, strokeWidth: 9 });
  if (price === null) {
    drawOutlinedText(g, `Level ${level}`, W / 2, 150, { size: 66, fill: '#7dff3f', font: FONT_TITLE, strokeWidth: 10 });
    drawOutlinedText(g, 'MAX LEVEL!', W / 2, 270, { size: 80, fill: '#ffd21f', font: FONT_TITLE, strokeWidth: 12 });
  } else {
    drawOutlinedText(g, `Level ${level} > ${level + 1}`, W / 2, 140, { size: 64, fill: '#7dff3f', font: FONT_TITLE, strokeWidth: 10 });
    drawOutlinedText(g, `+${treadStep(level, 0)} > +${treadStep(level + 1, 0)} Speed`, W / 2, 198, { size: 40, fill: '#ffd21f', font: FONT_UI, weight: 800, strokeWidth: 7 });
    g.fillStyle = '#14141a';
    g.fillRect(56, 236, W - 112, 112);
    g.fillStyle = afford ? '#3fdc2c' : '#8a909a';
    g.fillRect(62, 242, W - 124, 100);
    drawOutlinedText(g, `$${formatNumber(price)}`, W / 2, 294, { size: 72, fill: '#ffffff', font: FONT_TITLE, strokeWidth: 10 });
  }
}

export class PlotView {
  constructor(index, plot, scene, physics, effects, smoke) {
    this.index = index;
    this.plot = plot;
    this.effects = effects;
    this.group = new THREE.Group();
    this.group.position.set(plot.x, 0, plot.z);
    this.group.rotation.y = plot.rot;
    this.group.scale.setScalar(PLOT_SCALE);
    scene.add(this.group);

    // The shredder machine, its conveyor, pipe, lever and the treadmill were taken out of the
    // frames: a frame is now just the fenced pen with the drop pad in front of it.
    this.buildStatic(physics);

    this.labels = {};
    this.pens = new PetPen(this.group);
    this.padEggs = [];
    this.padKey = '[]';
    this.padList = [];
    this.riders = [];
    this.stage = 'idle';
    this.stageT = 0;
    this.egg = null;
    this.glow = null;
    this.ownerSign = new OwnerSign(this.group, new THREE.Vector3((PLOT.penMinX + PLOT.penMaxX) / 2, 32, 0)); // over the middle of the frame
    this.time = index * 1.7;
    this.lit = 0;
    // the treadmill's belt: a raised floor the player runs on (its size follows the level)
    this.surface = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, height: 0, ry: plot.rot + Math.PI };
    physics.surfaces.push(this.surface);
    this.buildBoard();
    this.setLevel(1);
  }

  // Treadmill and corner pillars for a frame level (1..5): rebuilt only when the level changes.
  setLevel(level) {
    if (level === this.level) return;
    this.level = level;
    for (const old of [this.tread, this.pillars]) if (old) {
      this.group.remove(old.group);
      old.group.traverse((o) => { o.geometry?.dispose(); });
    }
    for (const h of this.halos || []) this.group.remove(h);
    const size = TREAD_SIZE[level - 1];
    this.tread = buildTreadmill(level);
    this.tread.group.position.set(PLOT.treadmill.x, 0, PLOT.treadmill.z);
    this.tread.group.scale.setScalar(size);
    this.group.add(this.tread.group);
    const { penMinX, penMaxX, penHalfZ } = PLOT;
    const spots = [[penMinX, -penHalfZ], [penMinX, penHalfZ], [penMaxX, -penHalfZ], [penMaxX, penHalfZ], [penMaxX, -PEN_GAP_EDGE], [penMaxX, PEN_GAP_EDGE]];
    this.pillars = buildPillars(level, spots);
    this.group.add(this.pillars.group);
    this.lampOn = new THREE.Color(this.pillars.light);
    this.halos = this.pillars.halos.map((p) => {
      const halo = createGlow(this.pillars.light, 9 + level * 1.5);
      halo.position.copy(p);
      halo.visible = false;
      this.group.add(halo);
      return halo;
    });
    // the belt's floor, in world units
    const a = plotToWorld(this.plot, PLOT.treadmill.x - TREADMILL_BELT.halfX * size, PLOT.treadmill.z - TREADMILL_BELT.backZ * size);
    const b = plotToWorld(this.plot, PLOT.treadmill.x + TREADMILL_BELT.halfX * size, PLOT.treadmill.z + TREADMILL_BELT.frontZ * size);
    Object.assign(this.surface, {
      minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z),
      height: BELT_TOP * size * PLOT_SCALE,
    });
    this.boardKey = '';
  }

  buildBoard() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 380;
    const texture = canvasTexture(canvas);
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6, 1.4), new THREE.MeshLambertMaterial({ color: '#0e1630' }));
    post.position.y = 3;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 3), post.material);
    foot.position.y = 0.3;
    const back = new THREE.Mesh(new THREE.BoxGeometry(15, 9.2, 0.8), post.material);
    back.position.set(0, 10.4, -0.45);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 8.55), new THREE.MeshBasicMaterial({ map: texture }));
    face.position.set(0, 10.4, 0);
    group.add(post, foot, back, face);
    // it stands beside the treadmill and faces out of the frame (+x)
    group.position.set(PLOT.treadmill.x + 2, 0, PLOT.treadmill.z - 17);
    group.rotation.y = Math.PI / 2;
    this.group.add(group);
    const alert = makeBillboard([{ text: '!', size: 120, fill: '#ff2a3c', font: FONT_TITLE }], 4.4);
    alert.position.set(0, 18.5, 0);
    group.add(alert);
    this.board = { group, face, canvas, texture, alert };
  }

  // the board shows only on your own frame; the "!" when you can afford the upgrade
  syncBoard(state, mine) {
    const { board } = this;
    board.group.visible = !!(mine && state);
    if (!board.group.visible) return;
    const price = treadmillPrice(this.level - 1);
    const afford = price !== null && state.cash >= price;
    board.alert.visible = afford;
    const key = `${this.level}|${afford}`;
    if (key === this.boardKey) return;
    this.boardKey = key;
    drawBoard(board.canvas, this.level, price, afford);
    board.texture.needsUpdate = true;
  }

  buildStatic(physics) {
    const v = new Voxels();
    const boxes = [];
    const { penMinX, penMaxX, penHalfZ } = PLOT;

    addFence(v, penMinX, -penHalfZ, penMaxX, -penHalfZ, boxes);
    addFence(v, penMinX, penHalfZ, penMaxX, penHalfZ, boxes);
    addFence(v, penMinX, -penHalfZ, penMinX, penHalfZ, boxes);
    // two short front sections leave a wide walk-in gap in the middle
    addFence(v, penMaxX, -penHalfZ, penMaxX, -PEN_GAP_EDGE, boxes);
    addFence(v, penMaxX, PEN_GAP_EDGE, penMaxX, penHalfZ, boxes);

    this.group.add(v.mesh());

    // a see-through green column over the drop spot, shown while you carry an egg to your own base
    const size = PLOT.pad.half * 2 + 1;
    this.padGlow = new THREE.Mesh(new THREE.BoxGeometry(size, 7, size), new THREE.MeshBasicMaterial({
      color: '#3dff6a', transparent: true, opacity: 0.3, depthWrite: false,
    }));
    this.padGlow.position.set(PLOT.pad.x, 3.5, PLOT.pad.z);
    this.padGlow.renderOrder = 2;
    this.padGlow.visible = false;
    this.group.add(this.padGlow);

    for (const [a, b, c, d, top] of boxes) {
      const p = plotToWorld(this.plot, a, c);
      const q = plotToWorld(this.plot, b, d);
      physics.addBox(p.x, q.x, p.z, q.z, top * PLOT_SCALE);
    }
  }

  // Replaces a text label; does nothing while its text is unchanged.
  setLabel(slot, key, lines, height, position) {
    const old = this.labels[slot];
    if (old?.key === key) return;
    if (old) {
      this.group.remove(old.sprite);
      old.sprite.material.map.dispose();
      old.sprite.material.dispose();
    }
    if (!lines) return void delete this.labels[slot];
    const sprite = makeBillboard(lines, height, { renderOrder: 6 });
    sprite.position.copy(position);
    this.group.add(sprite);
    this.labels[slot] = { key, sprite };
  }

  localToWorld(x, y, z) {
    return this.group.localToWorld(new THREE.Vector3(x, y, z));
  }

  // owner: { name, pfp, mine } or null
  setOwner(owner) {
    this.ownerSign.set(owner);
  }

  sync(state, mine, owner = null) {
    this.setOwner(owner);
    this.setLevel(Math.min(5, Math.max(1, state?.tread || 1)));
    this.syncBoard(state, mine);
    // "+4/step" over the treadmill: what a step on it earns its owner
    const step = state ? treadStep(this.level, state.speed) : treadStep(this.level, 0);
    const size = TREAD_SIZE[this.level - 1];
    this.setLabel('step', `${step}|${this.level}`, [{ text: `+${formatNumber(step)}/step`, size: 72, fill: { gradient: [[0, '#fff27a'], [1, '#ffb21f']] }, font: FONT_TITLE }],
      4.4, new THREE.Vector3(PLOT.treadmill.x, (this.level >= 4 ? 22 : 16) * size, PLOT.treadmill.z));
    // the pets only change now and then: re-read them only when they do
    const petsJson = state ? state.pets : '';
    if (petsJson !== this.petsKey) {
      this.petsKey = petsJson;
      this.pens.sync(state ? parse(state.pets) : []);
    }
    if (!state) this.pens.clear();

    const metaJson = state?.meta || '{}';
    if (metaJson !== this.metaKey) {
      this.metaKey = metaJson;
      this.padCap = Math.min(PAD_SLOTS.length, parse(metaJson).padCap || RULES.padCap);
    }
    const stage = state?.stage || 'idle';
    const padJson = state?.pad || '[]';
    if (padJson !== this.padKey) {
      this.padKey = padJson;
      this.showPad(parse(padJson));
    }
    if (stage !== this.stage) this.enterStage(stage, state);

    // glow green while I am bringing an egg and the pad has room for it
    this.padGlow.visible = !!(mine && state && stage === 'idle' && state.carried !== '[]' && this.padList.length < (this.padCap || RULES.padCap));
    this.updateEggLabel(stage, state);
  }

  showPad(list) {
    // keep the eggs just removed so they can ride the conveyor
    this.previousPad = this.padEggs;
    this.padEggs = [];
    this.padList = list;
    list.slice(0, PAD_SLOTS.length).forEach((egg, i) => {
      const mesh = createEgg(egg.type);
      mesh.position.copy(PAD_SLOTS[i]);
      this.group.add(mesh);
      this.padEggs.push(mesh);
    });
    if (list.length || this.stage !== 'idle') this.clearPrevious();
  }

  clearPrevious() {
    for (const mesh of this.previousPad || []) this.group.remove(mesh);
    this.previousPad = [];
  }

  updateEggLabel(stage, state) {
    if (stage !== 'growing' && stage !== 'ready') return this.setLabel('egg', '', null);
    const name = EGGS[state.eggType]?.name || 'Egg';
    const key = `${stage}:${name}:${state.eggLuck.toFixed(2)}`;
    this.setLabel('egg', key, [
      ...(stage === 'ready' ? [{ text: name, size: 56, fill: '#ffffff' }] : []),
      { text: luckText(state.eggLuck), size: 56, fill: '#7dff3f' },
    ], stage === 'ready' ? 4.6 : 2.6, new THREE.Vector3(PLOT.eggSpot.x, 11, PLOT.eggSpot.z));
  }

  removeEgg() {
    if (this.egg) this.group.remove(this.egg);
    if (this.glow) this.group.remove(this.glow);
    this.egg = null;
    this.glow = null;
  }

  ensureEgg(type) {
    if (this.egg) return;
    this.egg = createEgg(type || 'stone');
    this.egg.position.set(PLOT.eggSpot.x, 0, PLOT.eggSpot.z);
    this.group.add(this.egg);
  }

  ensureGlow() {
    if (this.glow) return;
    this.glow = createGlow('#f6ffd8', 12);
    this.glow.position.set(PLOT.eggSpot.x, 3, PLOT.eggSpot.z);
    this.group.add(this.glow);
  }

  enterStage(stage, state) {
    const previous = this.stage;
    this.stage = stage;
    this.stageT = 0;

    if (stage === 'shredding') {
      this.riders = (this.previousPad || []).map((mesh, i) => ({ mesh, delay: i * RIDE_GAP, from: mesh.position.clone() }));
      this.previousPad = [];
    } else if (stage === 'launch') {
      // with no machine any more, the new egg pops up from the drop pad and arcs to its spot
      this.removeEgg();
      this.ensureEgg(state?.eggType);
      this.egg.position.copy(LAUNCH_FROM);
      if (previous === 'shredding') this.effects.burst(this.localToWorld(LAUNCH_FROM.x, LAUNCH_FROM.y, LAUNCH_FROM.z), '#fff3b0', 12, 14);
    } else if (stage === 'growing' || stage === 'ready' || stage === 'hatching') {
      this.ensureEgg(state?.eggType);
      this.ensureGlow();
      // a slow frame rate can end the launch before the arc has finished
      this.egg.position.set(PLOT.eggSpot.x, 0, PLOT.eggSpot.z);
    } else if (stage === 'idle') {
      if (previous === 'hatching') {
        this.effects.burst(this.localToWorld(PLOT.eggSpot.x, 3, PLOT.eggSpot.z), '#fff6c8', 26, 22);
      }
      this.removeEgg();
    }
  }

  updateRiders(t) {
    for (const r of this.riders) {
      const k = Math.min(1, Math.max(0, (t - r.delay) / RIDE_SECONDS));
      if (k < 0.3) r.mesh.position.lerpVectors(r.from, BELT_LOW, k / 0.3);
      else r.mesh.position.lerpVectors(BELT_LOW, BELT_HIGH, (k - 0.3) / 0.7);
      r.mesh.visible = k < 1;
    }
  }

  update(dt, lit = 0) {
    // the belt runs; the board's "!" bobs; the pillar lanterns light up in snow and rain
    this.tread.belt.texture.offset.y += dt * 0.9;
    if (this.board.alert.visible) this.board.alert.position.y = 18.5 + Math.abs(Math.sin(this.time * 3)) * 1.2;
    if (Math.abs(lit - this.lit) > 0.002 || this.litLevel !== this.level) {
      this.lit = lit;
      this.litLevel = this.level;
      this.pillars.lamps.color.copy(_lamp.copy(LAMP_OFF).lerp(this.lampOn, lit));
      for (const h of this.halos) {
        h.visible = lit > 0.03;
        h.material.opacity = lit * 0.75;
      }
    }
    if (this.padGlow.visible) {
      this.glowT = (this.glowT || 0) + dt;
      this.padGlow.material.opacity = 0.24 + Math.sin(this.glowT * 4) * 0.1; // a gentle pulse
    }
    this.time += dt;
    this.stageT += dt;
    this.pens.update(dt);
    this.ownerSign.update(dt);

    const t = this.stageT;
    const shredding = this.stage === 'shredding';

    if (shredding) this.updateRiders(t);
    else if (this.riders.length) {
      for (const r of this.riders) this.group.remove(r.mesh);
      this.riders = [];
    }

    if (this.stage === 'launch' && this.egg) {
      const k = Math.min(1, t / (STAGE_MS.launch / 1000));
      this.egg.position.x = LAUNCH_FROM.x + (PLOT.eggSpot.x - LAUNCH_FROM.x) * k;
      this.egg.position.z = LAUNCH_FROM.z + (PLOT.eggSpot.z - LAUNCH_FROM.z) * k;
      this.egg.position.y = LAUNCH_FROM.y * (1 - k) + 4 * LAUNCH_PEAK * k * (1 - k);
      this.egg.rotation.z = k * 9;
      this.egg.scale.setScalar(0.8 + k * 0.5);
    }
    if (this.stage === 'growing' && this.egg) {
      const k = Math.min(1, t / (STAGE_MS.growing / 1000));
      this.egg.position.y = 0;
      this.egg.rotation.z = 0;
      this.egg.scale.setScalar(1.3 + k * 1.5);
      this.glow.scale.setScalar(10 + k * 16 + Math.sin(this.time * 9) * 1.6);
      this.glow.material.opacity = 0.75;
    }
    if (this.stage === 'ready' && this.egg) {
      this.egg.position.y = 0;
      this.egg.rotation.z = Math.sin(this.time * 5) * 0.05;
      this.egg.scale.setScalar(2.8);
      this.glow.scale.setScalar(13 + Math.sin(this.time * 4) * 1.5);
      this.glow.material.opacity = 0.14; // faint, so the finished egg can be seen
    }
    if (this.stage === 'hatching' && this.egg) {
      const k = Math.min(1, t / (STAGE_MS.hatching / 1000));
      this.egg.rotation.z = Math.sin(t * 46) * (0.1 + k * 0.28);
      this.egg.scale.setScalar(2.8 + k * 0.9);
      this.glow.scale.setScalar(16 + k * 34);
      this.glow.material.opacity = 0.5 + k * 0.5;
    }
  }
}
