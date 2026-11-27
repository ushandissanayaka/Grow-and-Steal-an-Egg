// The giant eggs out in each biome. Every scythe hit makes an egg shake and grow; when its HP runs
// out it is fully grown and cracks open (the server drops the pet that hatched beside it), the shell
// pieces lie in the nest, and after a while a new small egg appears and the cycle starts again.
// Same interface the game used for the old choppable trees (tree, max, hp, group, trunkW,
// topHeight, setHighlight, setHp, hit, update), so the rest of the game drives it unchanged.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { EGGS, TREE_TYPES, treeHp } from '../../shared/gameData.js';
import { createEgg } from './Egg.js';
import { glowMap } from './Effects.js';

const START_SCALE = 3.6;   // the egg's size when it appears, times the spot's scale
const FULL_SCALE = 7.2;    // its size when fully grown
const EGG_HEIGHT = 2.2;    // the egg mesh's own height at scale 1
const EGG_RADIUS = 0.9;
const SHAKE_SECONDS = 0.22;
const POP_SECONDS = 0.6;   // a new egg pops up out of the nest
const NEST_TWIGS = ['#7a4a26', '#8f5a30', '#6a3d1f', '#a06a3a'];
const GLOW_COLOR = '#3dff6a';

const glowMaterial = new THREE.MeshBasicMaterial({ color: GLOW_COLOR, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.BackSide });

// The egg a spot grows: the most likely egg of its old tree type.
function eggTypeOf(node) {
  const list = TREE_TYPES[node.type].eggs;
  return list.reduce((best, e) => (e[1] > best[1] ? e : best))[0];
}

// A round nest of twigs: a ring of short blocks at slight angles around a straw floor.
function buildNest(rnd) {
  const v = new Voxels();
  v.box(0, 0, 0, 7.4, 0.5, 7.4, '#c9a45a', { ry: 0.4 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = 3.6;
    v.box(Math.cos(a) * r, 0.2 + (i % 2) * 0.5, Math.sin(a) * r, 2.6, 0.8, 1, NEST_TWIGS[i % NEST_TWIGS.length], {
      ry: -a + Math.PI / 2 + (rnd() - 0.5) * 0.4, rz: (rnd() - 0.5) * 0.3,
    });
  }
  return v.mesh();
}

// Cracked shell pieces left in the nest after hatching.
function buildShell(color, rnd) {
  const v = new Voxels();
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2, r = 0.6 + rnd() * 2;
    v.box(Math.cos(a) * r, 0.4, Math.sin(a) * r, 1 + rnd() * 1.2, 0.5 + rnd() * 0.9, 0.8 + rnd(), color, { rx: rnd(), ry: rnd() * 3, rz: rnd() });
  }
  return v.mesh();
}

// The egg's outline: its radius at height y (0..EGG_HEIGHT), wider low down than at the top.
function eggRadius(y) {
  const t = Math.min(1, Math.max(0, y / EGG_HEIGHT));
  const a = Math.acos(1 - 2 * t);                 // 0 at the bottom, PI at the top
  return Math.sin(a) * EGG_RADIUS * (1 + 0.16 * Math.cos(a));
}

// An egg built from rows of little bricks, a few of them in a darker spot colour.
function brickEgg(base, spots, seed) {
  const v = new Voxels();
  const rnd = seeded(seed);
  const ROW = 0.2;
  for (let y = 0, row = 0; y < EGG_HEIGHT - 0.05; y += ROW, row++) {
    const r = eggRadius(y + ROW / 2);
    if (r < 0.08) continue;
    const n = Math.max(4, Math.round((Math.PI * 2 * r) / 0.3));
    for (let i = 0; i < n; i++) {
      const a = ((i + (row % 2) * 0.5) / n) * Math.PI * 2;
      const w = (Math.PI * 2 * r) / n + 0.02;
      const color = rnd() < 0.12 ? spots : base;
      v.box(Math.cos(a) * (r - 0.05), y, Math.sin(a) * (r - 0.05), 0.16, ROW + 0.01, w, color, { ry: -a });
    }
    v.box(0, y, 0, r * 1.5, ROW, r * 1.5, base); // fills the inside so no gap shows through
  }
  return v.mesh({ receiveShadow: false });
}

// The mushroom egg: a pale stem wrapped in green vines under a big red cap with white spots.
function mushroomEgg(seed) {
  const v = new Voxels();
  const rnd = seeded(seed);
  for (let y = 0; y < 1.1; y += 0.2) v.box(0, y, 0, 1.1, 0.21, 1.1, '#f3eee4', { ry: y * 0.4 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    v.box(Math.cos(a) * 0.58, 0.1 + rnd() * 0.6, Math.sin(a) * 0.58, 0.12, 0.5, 0.16, '#3fae3a', { ry: -a, rz: 0.5 });
  }
  const CAP = (y) => 1.05 * Math.sqrt(Math.max(0, 1 - ((y - 0.95) / 1.25) ** 2));
  for (let y = 0.95; y < 2.2; y += 0.18) {
    const r = CAP(y);
    const n = Math.max(4, Math.round((Math.PI * 2 * r) / 0.3));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = (Math.PI * 2 * r) / n + 0.02;
      const spot = (i * 7 + Math.round(y * 10) * 3) % 9 === 0;
      v.box(Math.cos(a) * (r - 0.05), y, Math.sin(a) * (r - 0.05), 0.16, 0.19, w, spot ? '#ffffff' : '#e2323c', { ry: -a });
    }
    v.box(0, y, 0, r * 1.5, 0.18, r * 1.5, '#e2323c');
  }
  v.box(0, 0.92, 0, 2, 0.12, 2, '#f6e6d6'); // the underside of the cap
  return v.mesh({ receiveShadow: false });
}

// The giant egg a spot grows: stage 1 has brick Forest Eggs and Mushroom Eggs, stage 2 brick
// Savanna Eggs; further stages keep the smooth egg.
function createNodeEgg(type) {
  if (type === 'chicken') return brickEgg('#f2cfb4', '#a8643a', 'forest');
  if (type === 'stone') return mushroomEgg('mushroom');
  if (type === 'maple') return brickEgg('#e8c47a', '#c06a2a', 'savanna');
  if (type === 'sakura') return brickEgg('#e6f6ff', '#3a6ad0', 'crystal');
  if (type === 'frost') return brickEgg('#ffd2bf', '#ff7a5a', 'shell');
  if (type === 'ocean') return brickEgg('#ffc6e4', '#ff4fa0', 'lollipop');
  if (type === 'magma') return brickEgg('#1e2240', '#ff6a1a', 'obsidian');
  if (type === 'heavenly') return brickEgg('#f2a41a', '#7a4a14', 'amber');
  if (type === 'candy') return brickEgg('#5fbf3a', '#2a6a1a', 'bamboo');
  if (type === 'spore') return brickEgg('#e0b060', '#9a5a20', 'sand');
  if (type === 'cosmic') return brickEgg('#2a1a3a', '#ff4ad8', 'void');
  return createEgg(type);
}

function seeded(text) {
  let s = [...text].reduce((a, c) => a * 31 + c.charCodeAt(0), 11) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export class EggNodeView {
  static sparkles = true;

  constructor(node, scene, physics) {
    this.tree = node; // (named tree for the rest of the game)
    this.max = treeHp(node);
    this.type = eggTypeOf(node);
    const rnd = seeded(node.id);
    const s = node.scale;

    this.group = new THREE.Group();
    this.group.position.set(node.x, 0, node.z);
    const nest = buildNest(rnd);
    nest.scale.setScalar(s * 1.15);
    this.group.add(nest);
    this.shell = buildShell(EGGS[this.type].color, rnd);
    this.shell.scale.setScalar(s * 1.2);
    this.shell.visible = false;
    this.group.add(this.shell);

    this.eggPivot = new THREE.Group(); // shakes and squashes; the egg itself sits in it
    this.eggPivot.position.y = 0.4 * s;
    this.egg = createNodeEgg(this.type);
    this.eggPivot.add(this.egg);
    this.glow = new THREE.Mesh(this.egg.geometry, glowMaterial);
    this.glow.scale.setScalar(1.08);
    this.glow.renderOrder = 2;
    this.glow.visible = false;
    this.egg.add(this.glow);
    this.group.add(this.eggPivot);
    if (node.giant) this.addShine();
    scene.add(this.group);

    this.trunkW = EGG_RADIUS * 2 * START_SCALE; // used for where hit effects come from
    this.hp = null;
    this.shake = 0;
    this.pop = 0;
    this.size = START_SCALE;
    this.collider = physics.addCircle(node.x, node.z, EGG_RADIUS * START_SCALE * s);
    this.setSize(START_SCALE);
  }

  // The egg's scale (before the spot's own scale); the collider and hit point follow it.
  setSize(k) {
    this.size = k;
    const s = k * this.tree.scale;
    this.egg.scale.setScalar(s);
    this.collider.r = EGG_RADIUS * s;
    this.collider.top = EGG_HEIGHT * s;
    this.trunkW = EGG_RADIUS * 2 * k;
  }

  grownSize() {
    const done = this.hp === null ? 0 : Math.max(0, Math.min(1, 1 - this.hp / this.max));
    return START_SCALE + (FULL_SCALE - START_SCALE) * done;
  }

  get standing() {
    return this.hp === null || this.hp > 0;
  }

  // The egg glows green while the player is close enough to hit it.
  setHighlight(on) {
    this.glow.visible = on && this.standing;
  }

  // world height just above the egg, for labels
  get topHeight() {
    return (EGG_HEIGHT * this.size + 6) * this.tree.scale;
  }

  setHp(hp) {
    const previous = this.hp;
    this.hp = hp;
    const standing = hp > 0;
    this.egg.visible = standing;
    this.shell.visible = !standing;
    this.collider.active = standing;
    if (previous !== null && previous <= 0 && standing) this.pop = POP_SECONDS; // a new egg appears
    if (standing) this.setSize(this.grownSize());
  }

  hit() {
    this.shake = SHAKE_SECONDS;
  }

  // A giant egg spot shines: a glow on the ground under it.
  addShine() {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9 * this.tree.scale, 40), new THREE.MeshBasicMaterial({
      map: glowMap(), color: '#fff6c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.08;
    floor.renderOrder = 2;
    this.group.add(floor);
  }

  update(dt) {
    if (!this.egg.visible) return;
    let k = 1;
    if (this.pop > 0) {
      this.pop = Math.max(0, this.pop - dt);
      const t = 1 - this.pop / POP_SECONDS;
      k = t < 1 ? Math.min(1.12, t * 1.4) - Math.max(0, t - 0.8) * 0.6 : 1; // grows in, overshoots a little
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const t = this.shake / SHAKE_SECONDS;
      this.eggPivot.rotation.z = Math.sin(t * 40) * 0.08 * t;
      this.eggPivot.scale.set(1 + 0.08 * t, 1 - 0.08 * t, 1 + 0.08 * t); // a squash on every hit
    } else {
      this.eggPivot.rotation.z = 0;
      this.eggPivot.scale.setScalar(1);
    }
    this.eggPivot.scale.multiplyScalar(k);
  }
}
