// Block scythes, chunky like the reference: a thick handle of stacked blocks with a round wheel and a
// white band at the head, and a big curved blade built from beveled block plates. Built in world
// units with the grip at the origin, the handle along +Z and the blade sweeping out from its far end.
// Two copies of each: one for the right hand (shown while swinging) and one always carried flat
// across the back. With no scythe bought yet (bare hands) the starter Chocolate Scythe is used.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { axeById } from '../../shared/gameData.js';

const HANDLE = 6.2;        // handle length
const BLADE_RADIUS = 3.4;  // how wide the blade's curve is
const BLADE_SEGMENTS = 8;
const BLADE_SWEEP = 2.0;   // radians of curve, from straight out to hooked back towards the grip

// the starter scythe everyone carries until they buy one: chocolate brown blocks
const CHOCOLATE = { head: '#6e3c24', handle: '#5a301c', light: '#8a5234', dark: '#3e2012' };

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
};

function looks(scythe) {
  if (!scythe.head) return CHOCOLATE;
  return { head: scythe.head, handle: scythe.handle, light: shade(scythe.head, 1.25), dark: shade(scythe.handle, 0.65) };
}

function buildScythe(scythe) {
  const c = looks(scythe);
  const v = new Voxels();
  // the handle: chunky blocks, alternately a little wider, with small studs on the front
  for (let z = 0, i = 0; z < HANDLE - 0.4; z += 0.9, i++) {
    const w = i % 2 ? 0.62 : 0.54;
    v.box(0, -w / 2, z + 0.45, w, w, 0.92, i % 2 ? c.handle : c.dark);
    if (i % 2) v.box(0, -w / 2 - 0.08, z + 0.45, w * 0.55, w + 0.16, 0.42, c.light); // the stud
  }
  v.box(0, -0.38, -0.2, 0.76, 0.76, 0.5, c.dark);                    // pommel
  v.box(0, -0.4, HANDLE - 1.3, 0.8, 0.8, 0.6, '#f2ecdc');            // the white band under the head
  // the wheel at the head: an eight-sided disc with a hub and spokes, across the handle
  const hubZ = HANDLE - 0.3;
  for (const r of [0, Math.PI / 4]) v.box(0, -0.75, hubZ, 0.5, 1.5, 1.5, c.head, { rx: r });
  v.box(0, -0.35, hubZ, 0.62, 0.7, 0.7, c.light);
  for (const r of [0, Math.PI / 2]) v.box(0, -0.68, hubZ, 0.58, 1.36, 0.16, c.dark, { rx: r });
  // the blade: beveled plates along a curve that starts straight out (+Y) and hooks back (-Z),
  // thinner towards the tip, each with a lighter raised square on its face
  const step = BLADE_SWEEP / BLADE_SEGMENTS;
  for (let i = 0; i < BLADE_SEGMENTS; i++) {
    const t = (i + 0.5) * step;
    const y = 0.5 + BLADE_RADIUS * Math.sin(t);
    const z = hubZ - BLADE_RADIUS * (1 - Math.cos(t));
    const length = BLADE_RADIUS * step + 0.16;
    const width = 1.55 * (1 - i / (BLADE_SEGMENTS + 2)) + 0.25;
    const turn = { rx: -t };
    v.box(0, y - length / 2, z, 0.42, length, width, i % 2 ? c.head : shade(c.head, 0.9), turn);
    v.box(0, y - length / 2 + 0.04, z, 0.52, length * 0.6, width * 0.55, c.light, turn);   // raised square
    // the edge, a darker lip on the inside of the curve
    const inset = width / 2 + 0.05;
    v.box(0, y - Math.sin(t) * inset - length / 2, z - Math.cos(t) * inset, 0.3, length, 0.2, c.dark, turn);
  }
  return v.mesh({ receiveShadow: false });
}

// The scythe for the right hand (the Chocolate Scythe for bare hands). The mesh is turned so the
// blade's inside edge faces the way the arm swings (the group's own rotation is set when it is put in the hand).
export function createScytheMesh(id) {
  const mesh = buildScythe(axeById(id));
  mesh.rotation.z = Math.PI;
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

// The same scythe carried flat across the back, always: the grip low on one side, the handle
// running diagonally up to the wheel above the other shoulder, the blade sweeping out sideways and
// curving down. Placed in the avatar root's space (the character faces +Z there).
export function createBackScytheMesh(id) {
  const mesh = buildScythe(axeById(id));
  mesh.rotation.set(-Math.PI / 2, 0, 0);  // handle up (+Y), blade out behind (-Z)
  const flat = new THREE.Group();
  flat.rotation.y = -Math.PI / 2;         // turn the blade from pointing back to lying flat along the back
  flat.add(mesh);
  const tilt = new THREE.Group();
  tilt.rotation.z = -0.55;                // lean the handle across the back
  tilt.add(flat);
  const group = new THREE.Group();
  group.add(tilt);
  group.position.set(-1.1, 0.5, -1.0);    // grip by the hip, just behind the back
  return group;
}

// ------------------------------------------------------------------ the bat (hotbar slot 2)

// A wooden baseball bat: thin taped grip at the origin, thickening along +Z to a rounded end.
function buildBat() {
  const v = new Voxels();
  v.box(0, -0.2, -0.15, 0.46, 0.4, 0.3, '#5a3a1f');                     // knob
  v.box(0, -0.16, 0.9, 0.3, 0.32, 1.9, '#2f2a26');                     // taped grip
  const steps = [[1.85, 0.4], [2.6, 0.52], [3.3, 0.64], [4, 0.74], [4.6, 0.78]];
  for (const [z, w] of steps) v.box(0, -w / 2, z, w, w, 0.75, '#e2b878');
  v.box(0, -0.34, 5.0, 0.6, 0.6, 0.2, '#d4a868');                       // rounded end
  v.box(0, -0.3, 3.6, 0.8, 0.12, 0.9, '#c8945a');                       // grain stripe
  return v.mesh({ receiveShadow: false });
}

export function createBatMesh() {
  const mesh = buildBat();
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}
