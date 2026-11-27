import * as THREE from 'three';
import { EGGS, PETS, RARITY_COLOR, RULES, formatNumber } from '../../shared/gameData.js';
import { createPetMesh, disposeObject } from './PetDisplay.js';
import { PET_RIGS } from './PetRigs.js';
import { animateRig, buildRig } from './GuardRigs.js';
import { eggTexture } from '../util/textures.js';
import { makeBillboard } from '../util/canvasText.js';
import { MagicDust } from './Effects.js';

const LUCK_GREEN = '#7dff3f';

let eggGeometry = null;
function geometry() {
  if (!eggGeometry) {
    const points = [];
    for (let i = 0; i <= 18; i++) {
      const t = (i / 18) * Math.PI;
      // wider at the bottom than at the top
      points.push(new THREE.Vector2(Math.sin(t) * (1 - 0.2 * Math.cos(t) * -1) * 0.82, -Math.cos(t) * 1.1 + 1.1));
    }
    eggGeometry = new THREE.LatheGeometry(points, 24);
    eggGeometry.computeVertexNormals();
  }
  return eggGeometry;
}

const materials = new Map();
function material(type) {
  if (!materials.has(type)) materials.set(type, new THREE.MeshLambertMaterial({ map: eggTexture(EGGS[type].color) }));
  return materials.get(type);
}

export function createEgg(type) {
  const mesh = new THREE.Mesh(geometry(), material(type));
  mesh.castShadow = true;
  return mesh;
}

export const luckText = (luck) => `x${Number(luck).toFixed(2)} Luck`;

// The pet inside a carried / dropped item (a grown giant egg hatched it), or null for a plain egg.
export function itemPet(item) {
  if (!item?.pet) return null;
  try {
    const pet = typeof item.pet === 'string' ? JSON.parse(item.pet) : item.pet;
    return PETS[pet?.id] ? pet : null;
  } catch {
    return null;
  }
}

// What an item looks like: the pet that hatched, or an egg. eggScale is how big an egg would be;
// pets are drawn a little smaller than that, since their models are bigger than the egg's.
export const PET_ITEM_SCALE = 0.45;
export function createItemMesh(item, eggScale = 1) {
  const pet = itemPet(item);
  const mesh = pet ? createPetMesh(pet.id) : createEgg(item.type);
  mesh.scale.setScalar(pet ? eggScale * PET_ITEM_SCALE : eggScale);
  return mesh;
}

// The label above an item on the ground: for a pet its name, rarity and cash; for an egg its
// Luck, name and rarity.
export function createEggLabel(type, luck, pet = null) {
  if (pet) {
    const def = PETS[pet.id];
    return makeBillboard([
      { text: def.name, size: 56, fill: '#ffffff' },
      { text: def.rarity, size: 40, fill: RARITY_COLOR[def.rarity] },
      { text: `${formatNumber(pet.cash)}/s`, size: 44, fill: LUCK_GREEN },
    ], 3.8);
  }
  const egg = EGGS[type];
  return makeBillboard([
    { text: luckText(luck), size: 54, fill: LUCK_GREEN },
    { text: egg.name, size: 46, fill: '#ffffff' },
    { text: egg.rarity, size: 38, fill: RARITY_COLOR[egg.rarity] },
  ], 3.6);
}

const FLY_SECONDS = 1.7;   // slow, floaty scatter out of the fallen tree
const FLY_START_HEIGHT = 9;
const FLY_PEAK = 13;
const BOUNCE_SECONDS = 0.5;
const BLINK_SECONDS = 5; // an egg blinks for this long before it vanishes
// A grown egg hatching: its animal bursts out of it GIANT, taller than the Starting Place's walls,
// roars for a moment, then shrinks down to the size you carry and drops beside the egg.
const GIANT_HEIGHT = 84;
const GIANT_GROW = 0.9, GIANT_HOLD = 1.6, GIANT_SHRINK = 0.8;
const GIANT_SECONDS = GIANT_GROW + GIANT_HOLD + GIANT_SHRINK;
const GROUND_EGG_SCALE = 2.4; // eggs dropped by trees are big, easy to spot
const NEST_SCALE = 2.1;
const nestMaterial = new THREE.MeshLambertMaterial({ color: '#8a5a32' });
const nestGeometry = new THREE.CylinderGeometry(1.5, 1.2, 0.6, 10);

// An egg lying in the forest, in its little nest, with magic dust swirling around it. A new egg
// drifts out of the fallen tree (or the animal that dropped it) and bounces into place.
// Bigger trees drop bigger eggs (data.size).
export class GroundEggView {
  static sparkles = true; // the magic dust around eggs (off on Low quality)

  constructor(id, data, scene, { fly = false, effects = null } = {}) {
    this.id = id;
    this.x = data.x;
    this.z = data.z;
    this.size = data.size || 1;
    this.effects = effects;
    this.from = { x: data.ox ?? data.x, z: data.oz ?? data.z };
    this.group = new THREE.Group();
    this.group.position.set(data.x, 0, data.z);
    this.nest = new THREE.Mesh(nestGeometry, nestMaterial);
    this.nest.scale.setScalar(NEST_SCALE * this.size);
    this.nest.position.y = 0.3 * NEST_SCALE * this.size;
    this.egg = createItemMesh(data, GROUND_EGG_SCALE * this.size); // the hatched pet (or an old plain egg)
    this.label = createEggLabel(data.type, data.luck, itemPet(data));
    this.label.position.y = 1.8 + 5.6 * this.size; // just above the egg
    this.dust = new MagicDust(this.group, [new THREE.Vector3(0, 1.6 * this.size, 0)], 3.6 * this.size);
    this.group.add(this.nest, this.egg, this.label);
    scene.add(this.group);
    this.t = fly ? 0 : FLY_SECONDS + BOUNCE_SECONDS;
    this.timed = fly; // seen falling out of the tree, so we know when it will vanish
    this.delay = 0;
    const pet = itemPet(data);
    if (fly && pet && PET_RIGS[pet.id] && data.ox !== undefined) this.startGiant(pet.id);
    this.update(0);
  }

  startGiant(id) {
    this.giant = buildRig(PET_RIGS[id]);
    const size = new THREE.Box3().setFromObject(this.giant.group).getSize(new THREE.Vector3());
    this.giantScale = GIANT_HEIGHT / Math.max(1, size.y);
    this.giant.group.position.set(this.from.x - this.x, 0, this.from.z - this.z);
    this.giant.group.rotation.y = Math.random() * Math.PI * 2;
    this.giant.group.scale.setScalar(0.01);
    this.group.add(this.giant.group);
    this.delay = GIANT_SECONDS; // the small one drops after the giant has shrunk
    this.t = -GIANT_SECONDS;
    this.giantT = 0;
  }

  updateGiant(dt) {
    this.giantT += dt;
    const t = this.giantT;
    const g = this.giant.group;
    let k;
    if (t < GIANT_GROW) {
      const a = t / GIANT_GROW;
      k = a * (1 + Math.sin(a * Math.PI) * 0.25); // grows with a little overshoot
      if (!this.burst) {
        this.burst = true;
        const at = new THREE.Vector3(this.from.x, 6, this.from.z);
        this.effects?.burst(at, '#ffffff', 30, 30);
        this.effects?.burst(at, '#ffd75e', 24, 26);
      }
    } else if (t < GIANT_GROW + GIANT_HOLD) {
      k = 1 + Math.sin((t - GIANT_GROW) * 9) * 0.015; // a roar: shakes a little
    } else {
      k = Math.max(0, 1 - (t - GIANT_GROW - GIANT_HOLD) / GIANT_SHRINK);
    }
    g.scale.setScalar(Math.max(0.01, k * this.giantScale));
    animateRig(this.giant.limbs, t * 5, 0.7, true, t);
    if (t >= GIANT_SECONDS) {
      this.group.remove(g);
      disposeObject(g);
      this.giant = null;
    }
  }

  update(dt) {
    this.t += dt;
    if (this.giant) this.updateGiant(dt);
    const waiting = this.t < 0;
    const k = Math.max(0, Math.min(1, this.t / FLY_SECONDS));
    const ease = 1 - (1 - k) ** 2; // slows down as it comes in to land
    const landed = k >= 1;
    if (landed && !this.landedOnce) {
      this.landedOnce = true;
      if (this.t < FLY_SECONDS + dt + 0.01) {
        this.effects?.burst(new THREE.Vector3(this.x, 1, this.z), '#ffd75e', 8, 9);
        this.effects?.burst(new THREE.Vector3(this.x, 1, this.z), '#ff7fe0', 6, 8);
      }
    }
    this.nest.visible = landed;
    this.egg.visible = !waiting;
    this.label.visible = landed;
    this.dust.points.visible = landed && GroundEggView.sparkles;
    // the egg arcs from where it came from, relative to its resting place
    const lx = (this.from.x - this.x) * (1 - ease), lz = (this.from.z - this.z) * (1 - ease);
    const bounce = landed ? Math.max(0, Math.sin(Math.min(1, (this.t - FLY_SECONDS) / BOUNCE_SECONDS) * Math.PI) * 1.2) : 0;
    this.egg.position.set(lx, 0.45 * NEST_SCALE * this.size + FLY_START_HEIGHT * (1 - k) + 4 * FLY_PEAK * k * (1 - k) + bounce, lz);
    this.egg.rotation.z = landed ? 0 : k * 5;
    if (this.dust.points.visible && this.group.visible) this.dust.update(dt);
    // the last seconds before it vanishes: it blinks
    const left = RULES.groundEggMs / 1000 - this.t - this.delay;
    this.egg.visible = !waiting && !(this.timed && left < BLINK_SECONDS && Math.sin(this.t * (left < 2 ? 30 : 16)) < 0);
  }

  dispose() {
    if (this.giant) disposeObject(this.giant.group);
    this.group.parent?.remove(this.group);
    this.label.material.map.dispose();
    this.label.material.dispose();
    this.dust.points.geometry.dispose();
    this.dust.points.material.dispose();
  }
}
