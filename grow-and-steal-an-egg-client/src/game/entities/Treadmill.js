// The treadmill in front of every frame, and the frame's six big corner pillars, both built for the
// frame's level (1..5). Each level has its own colours and adds parts to what the level before had:
//   1  grey        the plain treadmill; wooden corner posts with small lanterns
//   2  green+yellow side pipes, glowing yellow rail strips, a bigger screen; taller banded pillars
//   3  red+white    black spikes along the sides; spiked pillars
//   4  blue+yellow  an arch with a big screen over the console, side fins; finned pillars
//   5  black+purple glowing purple crystals and runes, a halo over the screen; crystal pillars
// The treadmill grows (TREAD_SIZE) and its console and screen get bigger with every level.
// Built in plot units with the treadmill's middle at the origin, the console at -z.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { beltTexture } from '../util/textures.js';
import { TREADMILL_BELT } from '../../shared/gameData.js';

const BELT_WIDTH = TREADMILL_BELT.halfX * 2;
const WIDTH = BELT_WIDTH + 1.4; // across the belt (local x)
const LENGTH = 13;              // along the belt (local z); the console is at -z
export const BELT_TOP = 1.23;

export const TREAD_LOOKS = [
  { main: '#c8ccd2', dark: '#6a6e76', accent: '#e4e6ea', glow: '#9fe8ff', belt: '#ffffff', name: 'Treadmill' },
  { main: '#3fbf3a', dark: '#1f6a25', accent: '#ffd21f', glow: '#ffe14a', belt: '#c8ffb0', name: 'Jungle Treadmill' },
  { main: '#e8323c', dark: '#8a141e', accent: '#ffffff', glow: '#ff5a5a', belt: '#ffc0c0', name: 'Inferno Treadmill' },
  { main: '#2f7ae8', dark: '#1a3a8a', accent: '#ffd21f', glow: '#7fe8ff', belt: '#c0d8ff', name: 'Thunder Treadmill' },
  { main: '#1a1424', dark: '#0c0810', accent: '#b04aff', glow: '#c86aff', belt: '#d8b0ff', name: 'Void Treadmill' },
];
const lookOf = (level) => TREAD_LOOKS[Math.min(4, Math.max(0, level - 1))];

// A seeded random, so a level always looks the same.
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Returns { group, belt: { texture } }: lit blocks, glowing (unlit) blocks and the moving belt.
export function buildTreadmill(level) {
  const L = Math.min(5, Math.max(1, level));
  const P = lookOf(L);
  const v = new Voxels();
  const g = new Voxels();
  const rnd = seeded(77 + L);
  const half = WIDTH / 2;
  const consoleZ = -LENGTH / 2 + 1.2;

  // the deck: a base, raised side edges, a roller cap at the front
  v.box(0, 0, 0, WIDTH, 1, LENGTH, P.main);
  for (const side of [-1, 1]) v.box(side * (half - 0.3), 0, 0, 0.8, 1.7, LENGTH, P.dark);
  v.box(0, 0, LENGTH / 2 - 0.4, WIDTH, 1.4, 0.8, P.dark);
  v.box(0, 1, 0, BELT_WIDTH, 0.2, LENGTH - 1, '#2e3138');
  // the uprights, handle bars and console, bigger each level
  for (const side of [-1, 1]) {
    v.box(side * (half - 0.6), 1, consoleZ + 0.4, 0.9, 6, 0.9, P.main, { rx: 0.18 });
    v.box(side * (half - 0.6), 5.6, consoleZ + 2.6, 0.7, 0.7, 4.6, P.dark);
    v.box(side * (half - 0.6), 5.2, consoleZ + 4.8, 0.7, 1.1, 0.7, P.dark);
  }
  const cw = WIDTH * (0.62 + 0.07 * L), ch = 2 + 0.45 * L;
  v.box(0, 6.3, consoleZ, cw, ch, 1.4, P.main);
  v.box(0, 6.3 + ch, consoleZ, cw + 0.4, 0.5, 1.6, P.dark);
  // the buttons on its front: red, yellow, yellow, green (more of them as it grows)
  const buttons = ['#e22b2b', '#ffd21f', '#ffd21f', '#35d04b', '#35a8ff', '#ff5fd8'].slice(0, 3 + Math.min(3, L));
  const bw = (cw - 1) / buttons.length;
  buttons.forEach((c, i) => g.box(-cw / 2 + 0.5 + bw * (i + 0.5), 6.6, consoleZ + 0.72, bw * 0.75, 0.8, 0.1, c));
  // the screen on top, bigger each level
  const sw = cw * (0.45 + 0.05 * L), sh = 0.9 + 0.45 * L;
  v.box(0, 6.8 + ch, consoleZ, sw + 0.6, sh + 0.6, 0.9, P.dark);
  g.box(0, 7.1 + ch, consoleZ + 0.47, sw, sh, 0.06, P.glow);

  if (L >= 2) {
    // glowing strips along the rails and pipes coiling up the sides
    for (const side of [-1, 1]) {
      g.box(side * (half - 0.3), 1.72, 0, 0.32, 0.12, LENGTH - 1, P.accent);
      for (let i = 0; i < 4; i++) {
        const z = -LENGTH / 2 + 2.5 + i * 3;
        v.box(side * (half + 0.55), 0, z, 0.7, 2.4 + (i % 2) * 0.8, 0.7, P.dark);
        v.box(side * (half + 0.3), 2.2 + (i % 2) * 0.8, z, 1.2, 0.7, 0.7, P.accent);
      }
    }
    v.box(0, 6.3 + ch * 0.45, consoleZ + 0.75, cw, 0.3, 0.1, P.accent); // a band across the console
  }
  if (L >= 3) {
    // spikes along both sides, dark with glowing tips
    for (const side of [-1, 1]) {
      for (let z = -LENGTH / 2 + 1.5; z < LENGTH / 2; z += 2.6) {
        const h = 2.4 + rnd() * 2;
        const lean = side * (0.3 + rnd() * 0.2);
        v.box(side * (half + 1.1), 0, z, 1.3, h, 1.3, '#1a1418', { rz: -lean });
        g.box(side * (half + 1.1 + Math.sin(lean) * h), Math.cos(lean) * h - 0.2, z, 0.5, 0.9, 0.5, P.glow, { rz: -lean });
      }
    }
  }
  if (L >= 4) {
    // an arch over the console carrying a big screen, and fins on the sides
    for (const side of [-1, 1]) {
      v.box(side * (half + 0.4), 0, consoleZ - 1.2, 1.2, 13 + L, 1.2, P.main);
      g.box(side * (half + 0.4), 2, consoleZ - 0.58, 0.3, 9 + L, 0.06, P.accent);
      v.box(side * (half + 1.6), 1, 1, 0.4, 3, 6, P.accent, { rz: side * -0.5 });
    }
    v.box(0, 13 + L, consoleZ - 1.2, WIDTH + 2.2, 1.2, 1.4, P.dark);
    v.box(0, 10 + L * 0.5, consoleZ - 1.2, WIDTH - 1.5, 3.2, 0.8, P.dark);
    g.box(0, 10.3 + L * 0.5, consoleZ - 0.78, WIDTH - 2.3, 2.6, 0.06, P.glow);
  }
  if (L >= 5) {
    // glowing purple crystals round the deck, runes on the belt edge, a halo over the arch
    for (const [x, z, h] of [[-half - 2.6, -4, 5], [half + 2.6, -3, 6], [-half - 2.4, 3, 4], [half + 2.4, 4.5, 4.5]]) {
      g.box(x, 0, z, 1.3, h, 1.3, P.glow, { ry: 0.7, rz: x > 0 ? -0.2 : 0.2 });
      g.box(x + (x > 0 ? 0.9 : -0.9), 0, z + 0.8, 0.8, h * 0.6, 0.8, '#e8b0ff', { ry: 0.7 });
    }
    for (let z = -LENGTH / 2 + 1; z < LENGTH / 2; z += 1.6) for (const side of [-1, 1]) g.box(side * (half - 0.3), 1.74, z, 0.6, 0.1, 0.6, '#ffffff');
    g.box(0, 15.5 + L, consoleZ - 1.2, 6, 0.5, 0.5, P.glow);
    for (const side of [-1, 1]) g.box(side * 3.2, 15.5 + L, consoleZ - 1.2, 0.5, 2, 0.5, P.glow, { rz: side * 0.6 });
  }

  const group = new THREE.Group();
  const lit = v.mesh();
  lit.castShadow = true;
  group.add(lit);
  if (g.positions.length) group.add(new THREE.Mesh(g.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  const texture = beltTexture();
  texture.repeat.set(1, 2);
  const belt = new THREE.Mesh(
    new THREE.PlaneGeometry(BELT_WIDTH - 0.2, LENGTH - 1.4),
    new THREE.MeshLambertMaterial({ map: texture, color: P.belt }),
  );
  belt.rotation.x = -Math.PI / 2;
  belt.position.set(0, BELT_TOP, 0);
  belt.receiveShadow = true;
  group.add(belt);
  return { group, belt: { texture } };
}

// ------------------------------------------------------------------ the frame's corner pillars

// Six pillars on the frame's main corners, each with a lantern on top. Returns { group, lamps }:
// lamps is the lanterns' light material, which the plot lights up in snow and rain.
export function buildPillars(level, spots) {
  const L = Math.min(5, Math.max(1, level));
  const P = lookOf(L);
  const v = new Voxels();
  const g = new Voxels();
  const rnd = seeded(31 + L);
  const H = [7.5, 13, 17, 21, 25][L - 1];
  const W = 1.8 + 0.35 * L;
  const lampAt = [];
  const wood = L === 1;
  for (const [x, z] of spots) {
    // base, shaft in bands, cap
    v.box(x, 0, z, W + 1.2, 1.4, W + 1.2, wood ? '#5a2a1a' : P.dark);
    const bands = Math.max(2, Math.round(H / 3));
    for (let i = 0; i < bands; i++) {
      const y = 1.4 + (i * (H - 1.4)) / bands;
      const h = (H - 1.4) / bands;
      const color = wood ? (i % 2 ? '#6e3120' : '#7f3a24') : (i % 2 ? P.accent : P.main);
      v.box(x, y, z, W - (i % 2 ? 0.2 : 0), h + 0.01, W - (i % 2 ? 0.2 : 0), color);
    }
    if (L >= 2) for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      // a glowing strip up each face
      g.box(x + sx * (W / 2 + 0.04), 2, z + sz * (W / 2 + 0.04), sz ? 0.35 : 0.08, H - 3, sx ? 0.35 : 0.08, P.glow);
    }
    if (L >= 3) for (let k = 0; k < 4; k++) {
      // spikes sticking out of the shaft
      const a = (k / 4) * Math.PI * 2 + rnd() * 0.4;
      const y = H * (0.35 + rnd() * 0.4);
      v.box(x + Math.cos(a) * (W / 2 + 0.6), y, z + Math.sin(a) * (W / 2 + 0.6), 0.8, 2.2, 0.8, '#1a1418', { ry: -a, rz: 0.9 });
    }
    if (L >= 4) for (const side of [-1, 1]) {
      // fins near the top
      v.box(x + side * (W / 2 + 0.6), H - 5, z, 0.4, 4, 2.4, P.accent, { rz: side * -0.35 });
    }
    v.box(x, H, z, W + 0.8, 0.8, W + 0.8, wood ? '#5a2a1a' : P.dark);
    // the lantern: four corner posts round a glass core, a roof and a finial
    const lw = W + 0.4, lh = 2.6 + L * 0.3;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(x + sx * (lw / 2 - 0.25), H + 0.8, z + sz * (lw / 2 - 0.25), 0.5, lh, 0.5, '#2c3038');
    v.box(x, H + 0.8 + lh, z, lw + 0.6, 0.7, lw + 0.6, wood ? '#2c3038' : P.main);
    v.box(x, H + 1.5 + lh, z, lw * 0.55, 0.9, lw * 0.55, wood ? '#ffcf33' : P.accent);
    lampAt.push({ x, y: H + 0.8 + lh / 2, z, w: lw - 0.7, h: lh - 0.1 });
    if (L >= 5) {
      // crystals on top
      g.box(x, H + 2.4 + lh, z, 0.9, 3, 0.9, P.glow, { ry: 0.7 });
      for (const s of [-1, 1]) g.box(x + s * 0.7, H + 2.2 + lh, z, 0.6, 1.8, 0.6, '#e8b0ff', { rz: s * -0.4 });
    }
  }
  const group = new THREE.Group();
  const lit = v.mesh();
  lit.castShadow = true;
  group.add(lit);
  if (g.positions.length) group.add(new THREE.Mesh(g.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  // the lantern cores: one material, coloured from "off" to the level's light colour
  const lamps = new THREE.MeshBasicMaterial({ color: '#8a9098' });
  const halos = [];
  for (const p of lampAt) {
    const core = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.w), lamps);
    core.position.set(p.x, p.y, p.z);
    group.add(core);
    halos.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  return { group, lamps, halos, light: wood ? '#ffe9a8' : P.glow };
}
