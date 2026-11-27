// Three things by the start of the track:
//  - the Winter Fusion machine: a dark-blue throne of blocks with glowing ice-blue panels, a glass
//    tank holding a big ice crystal, curved pipes, steps up the front, snow caps and ice shards;
//  - the Alien Crate: a black rounded crate with two glowing magenta bands, floating and turning
//    over a magenta pad, with its stock and countdown above it;
//  - the "Watch an ad" board on the front wall: green, with the cash it pays and a WATCH AD button
//    (click the board). Its text changes with what it pays and when it is ready again.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { canvasTexture, drawOutlinedText, makeBillboard, FONT_TITLE, FONT_UI } from '../util/canvasText.js';
import { glowMap } from './Effects.js';
import { addGlowRing } from './Shops.js';

const K = 2.4; // the machine's block scale (the same as the shops)

const NAVY = '#16204a', NAVY_DARK = '#0c1230', NAVY_LIGHT = '#24346e';
const ICE = '#5fd8ff', ICE_LIGHT = '#bff4ff', SNOW = '#f4f8ff';

// ------------------------------------------------------------------ Winter Fusion

// v: lit blocks, glow: unlit (glowing) blocks. Faces south (+z), towards the spawn.
export function addWinterFusion(scene, v, glow, physics, x, z) {
  const b = (bx, by, bz, w, h, d, color, opts) => v.box(x + bx * K, by * K, z + bz * K, w * K, h * K, d * K, color, opts);
  const g = (bx, by, bz, w, h, d, color, opts) => glow.box(x + bx * K, by * K, z + bz * K, w * K, h * K, d * K, color, opts);

  // the base and the steps up the front, each step with a glowing edge
  b(0, 0, 0, 18, 1.4, 14, NAVY_DARK);
  for (let i = 0; i < 3; i++) {
    b(0, 1.4 + i * 0.8, 5.6 - i * 1.4, 8 - i * 0.6, 0.8, 2, NAVY);
    g(0, 1.4 + i * 0.8 + 0.62, 6.62 - i * 1.4, 7.4 - i * 0.6, 0.2, 0.1, ICE);
  }
  // the body: a big block with a glowing panel and a snowflake emblem
  b(0, 1.4, -0.5, 12, 6, 8, NAVY);
  g(0, 2.4, 3.52, 6, 3.8, 0.1, '#2a7ad6');
  const flake = (len, w) => { for (const r of [0, Math.PI / 3, -Math.PI / 3]) g(0, 4.3 - len / 2, 3.6, w, len, 0.1, ICE_LIGHT, { rz: r }); };
  flake(2.8, 0.45);
  b(0, 7.4, -0.5, 13, 0.8, 9, NAVY_LIGHT);
  for (const sx of [-1, 1]) b(sx * 6.2, 1.4, 3.2, 0.8, 6, 1, NAVY_LIGHT); // corner trims

  // the tank on top: glass sides (see below), a big ice crystal inside, a snowy lid
  b(0, 8.2, -0.5, 9, 0.8, 7, NAVY_DARK);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(sx * 4.1, 9, -0.5 + sz * 3.1, 0.8, 7, 0.8, NAVY);
  g(0, 9.4, -0.5, 2.6, 5.2, 2.6, ICE, { ry: Math.PI / 4 });
  g(0, 14.6, -0.5, 1.6, 1.6, 1.6, ICE_LIGHT, { ry: Math.PI / 4 });
  for (const s of [-1, 1]) g(s * 1.7, 9.6, -0.5, 1.2, 3.4, 1.2, ICE_LIGHT, { ry: Math.PI / 4, rz: s * -0.35 });
  b(0, 16, -0.5, 10, 1, 8, NAVY);
  b(0, 17, -0.5, 10.6, 1, 8.6, SNOW);
  // icicles under the lid's front edge
  for (let i = -4; i <= 4; i += 1.4) b(i, 15.2 - Math.abs(i % 2) * 0.3, 3.3, 0.5, 0.9 + Math.abs(i % 3) * 0.3, 0.5, ICE_LIGHT);

  // the two side towers with glowing windows and snow caps, and the curved pipes into the tank
  for (const sx of [-1, 1]) {
    const tx = sx * 8;
    b(tx, 1.4, 1, 4.4, 7.4, 4.4, NAVY);
    g(tx, 3, 3.22, 2.6, 3.4, 0.1, '#2a7ad6');
    g(tx, 4, 3.3, 0.5, 1.4, 0.1, ICE_LIGHT);
    b(tx, 8.8, 1, 5, 1, 5, SNOW);
    for (let i = -1.5; i <= 1.5; i += 1.5) b(tx + i, 8, 3.4, 0.5, 0.8, 0.5, ICE_LIGHT);
    // the pipe: up from the tower, then bending in over the top of the tank
    const pipe = [[0, 9.8, 0, 2], [0.4, 11.8, -0.2, 2], [1.4, 13.4, -0.5, 1.6], [2.8, 14.2, -0.5, 1.5]];
    pipe.forEach(([px, py, pz, h], i) => b(tx - sx * px, py, 1 + pz, 1.8, h, 1.8, i % 2 ? NAVY_LIGHT : NAVY, { rz: sx * i * 0.35 }));
    g(tx - sx * 0.2, 11, 1.95, 0.3, 1.6, 0.1, ICE);
    // ice shards at its foot
    g(tx + sx * 2.4, 0, 4.6, 0.9, 3.2, 0.9, ICE, { rz: sx * -0.4 });
    g(tx + sx * 3.2, 0, 3.2, 0.8, 2.2, 0.8, ICE_LIGHT, { rz: sx * -0.6 });
  }

  // the glass of the tank
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(8.2 * K, 7 * K, 6.2 * K),
    new THREE.MeshLambertMaterial({ color: '#cff4ff', transparent: true, opacity: 0.25, depthWrite: false }),
  );
  glass.position.set(x, 12.5 * K, z - 0.5 * K);
  scene.add(glass);

  const tag = makeBillboard([{ text: 'NEW!', size: 64, fill: { gradient: [[0, '#ff5a5a'], [1, '#d8202e']] }, font: FONT_TITLE, stroke: '#ffffff', strokeWidth: 12 }], 2.4 * K);
  tag.position.set(x, 24.5 * K, z);
  scene.add(tag);
  const label = makeBillboard([{ text: 'WINTER FUSION', size: 72, fill: { gradient: [[0, '#ffffff'], [1, '#d4ecff']] }, font: FONT_TITLE }], 3 * K, { stroke: '#1c2a4a' });
  label.position.set(x, 21.5 * K, z);
  scene.add(label);
  physics.addBox(x - 10 * K, x + 10 * K, z - 5 * K, z + 7 * K);

  // snow sparkles drifting up out of the tank
  const COUNT = 30;
  const positions = new Float32Array(COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sparkles = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: glowMap(), size: 2.4, color: ICE_LIGHT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(sparkles);
  const ring = addGlowRing(scene, x, z + 1 * K, 11 * K, ICE);
  return (time) => {
    ring(time);
    for (let i = 0; i < COUNT; i++) {
      const t = (time * 0.3 + i / COUNT) % 1;
      const a = i * 2.4 + time;
      const r = (0.8 + (i % 4) * 0.7) * K;
      positions[i * 3] = x + Math.cos(a) * r;
      positions[i * 3 + 1] = (9.5 + t * 7) * K;
      positions[i * 3 + 2] = z - 0.5 * K + Math.sin(a) * r;
    }
    geometry.attributes.position.needsUpdate = true;
  };
}

// ------------------------------------------------------------------ a label whose text changes

// A camera-facing label redrawn only when its text changes. lines: [{ text, size, fill, font }].
export function liveLabel(scene, width, height, worldHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = canvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(worldHeight * (width / height), worldHeight, 1);
  sprite.renderOrder = 5;
  scene.add(sprite);
  let last = '';
  return {
    sprite,
    draw(lines) {
      const key = JSON.stringify(lines);
      if (key === last) return;
      last = key;
      ctx.clearRect(0, 0, width, height);
      let y = 0;
      for (const l of lines) {
        y += l.size * 0.62;
        drawOutlinedText(ctx, l.text, width / 2, y, { size: l.size, fill: l.fill, font: l.font || FONT_TITLE, stroke: l.stroke || '#14141a', strokeWidth: l.size * 0.16 });
        y += l.size * 0.62;
      }
      texture.needsUpdate = true;
    },
  };
}

// ------------------------------------------------------------------ the Alien Crate

function buildCrate() {
  const v = new Voxels();
  const BLACK = '#17121f', DARK = '#221a2e';
  // a rounded block: a core with bevelled edges, wider in the middle
  v.box(0, 0, 0, 7, 9, 7, BLACK);
  v.box(0, 0.6, 0, 8, 7.8, 6, DARK);
  v.box(0, 0.6, 0, 6, 7.8, 8, DARK);
  v.box(0, -0.4, 0, 6, 9.8, 6, BLACK);
  v.box(0, 9, 0, 5, 0.6, 5, DARK);
  return v.mesh({ receiveShadow: false });
}

function buildCrateBands() {
  const v = new Voxels();
  const PINK = '#ff2ad8';
  // two glowing bands round the middle, each with a step in it like the reference
  for (const [y, step] of [[3, 0.5], [5.6, -0.5]]) {
    v.box(0, y, 0, 8.1, 0.55, 8.1 - 0.01, PINK);
    v.box(2, y + step, 4.06, 3.6, 0.55, 0.1, PINK);
    v.box(-2, y - step * 0.6, -4.06, 3.6, 0.55, 0.1, PINK);
  }
  return new THREE.Mesh(v.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true })); // unlit: the bands glow
}

export function addAlienCrate(scene, physics, x, z) {
  const S = 2.2;
  const group = new THREE.Group();
  const crate = buildCrate();
  const bands = buildCrateBands();
  group.add(crate, bands);
  group.scale.setScalar(S);
  group.position.set(x, 4, z);
  scene.add(group);

  // the magenta pad and its glow
  const pad = new THREE.Mesh(new THREE.CircleGeometry(7 * S, 40), new THREE.MeshBasicMaterial({ color: '#c42aa8', transparent: true, opacity: 0.85 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(x, 0.14, z);
  scene.add(pad);
  const ring = addGlowRing(scene, x, z, 7 * S, '#ff4ae0');
  const COUNT = 24;
  const positions = new Float32Array(COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
    map: glowMap(), size: 2, color: '#ff7aec', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  physics.addBox(x - 5 * S, x + 5 * S, z - 5 * S, z + 5 * S);

  const label = liveLabel(scene, 640, 300, 12 * S);
  label.sprite.position.set(x, 33 * S, z);
  // update(time, { left, ends }): stock left for this player and the time until the crate goes
  return (time, info = {}) => {
    ring(time);
    group.rotation.y = time * 0.6;
    group.position.y = 4 + Math.sin(time * 1.6) * 1.2;
    for (let i = 0; i < COUNT; i++) {
      const t = (time * 0.4 + i / COUNT) % 1;
      const a = i * 2.6 + time * 0.8;
      positions[i * 3] = x + Math.cos(a) * 5.5 * S;
      positions[i * 3 + 1] = 1 + t * 22;
      positions[i * 3 + 2] = z + Math.sin(a) * 5.5 * S;
    }
    geometry.attributes.position.needsUpdate = true;
    label.draw([
      { text: info.left === 0 ? 'SOLD OUT!' : `${info.left ?? 13} Left!`, size: 62, fill: '#ffd21f' },
      { text: 'ALIEN CRATE', size: 96, fill: '#e2c8ff' },
      { text: info.ends || '', size: 64, fill: '#ff3a3a' },
    ]);
  };
}

// ------------------------------------------------------------------ the Watch Ad board

const AD_W = 100, AD_H = 56;
const AD_CANVAS_W = 1200, AD_CANVAS_H = Math.round(AD_CANVAS_W * AD_H / AD_W);

function drawCash(g, x, y, s) {
  // a stack of bills with a gold band and a "$" coin, like the reference
  for (let i = 3; i >= 0; i--) {
    const yy = y + i * 18 * s;
    g.save();
    g.translate(x, yy);
    g.rotate(-0.18);
    g.fillStyle = i % 2 ? '#2f9a2f' : '#3fbf3f';
    g.strokeStyle = '#14141a';
    g.lineWidth = 8 * s;
    g.beginPath();
    g.roundRect(-150 * s, -60 * s, 300 * s, 120 * s, 14 * s);
    g.fill();
    g.stroke();
    if (i === 0) {
      g.fillStyle = '#ffcf33';
      g.fillRect(-28 * s, -64 * s, 56 * s, 128 * s);
      g.strokeRect(-28 * s, -64 * s, 56 * s, 128 * s);
    }
    g.restore();
  }
  g.fillStyle = '#5fd63a';
  g.strokeStyle = '#14141a';
  g.lineWidth = 7 * s;
  g.beginPath();
  g.arc(x + 110 * s, y - 80 * s, 48 * s, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  drawOutlinedText(g, '$', x + 110 * s, y - 78 * s, { size: 66 * s, fill: '#ffffff', font: FONT_TITLE, strokeWidth: 8 * s });
}

function adBoardTexture() {
  const c = document.createElement('canvas');
  c.width = AD_CANVAS_W;
  c.height = AD_CANVAS_H;
  return { canvas: c, texture: canvasTexture(c) };
}

function drawAdBoard({ canvas, texture }, amount, wait) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  // green panel with little studs and a dark green border
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#5fe33a');
  bg.addColorStop(1, '#2fb52a');
  g.fillStyle = '#1f6a1f';
  g.fillRect(0, 0, W, H);
  g.fillStyle = bg;
  g.fillRect(18, 18, W - 36, H - 36);
  g.fillStyle = 'rgba(0, 0, 0, 0.07)';
  for (let y = 40; y < H - 20; y += 34) for (let x = 40; x < W - 20; x += 34) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }
  drawOutlinedText(g, 'Watch an ad, get', 80, 110, { size: 64, fill: '#ffffff', align: 'left', font: FONT_UI, weight: 800, strokeWidth: 10 });
  drawOutlinedText(g, `+$${amount}`, 76, 270, { size: 190, fill: '#ffe066', align: 'left', font: FONT_TITLE, strokeWidth: 26 });
  // the button
  const bx = 80, by = 420, bw = 470, bh = 150;
  g.fillStyle = '#14141a';
  g.beginPath(); g.roundRect(bx - 6, by - 6, bw + 12, bh + 18, 22); g.fill();
  g.fillStyle = wait ? '#b8bcc4' : '#ffd21f';
  g.beginPath(); g.roundRect(bx, by, bw, bh, 18); g.fill();
  drawOutlinedText(g, wait ? wait : '▸ WATCH AD', bx + bw / 2, by + bh / 2 + 4, { size: wait ? 74 : 70, fill: '#ffffff', font: FONT_TITLE, strokeWidth: 12 });
  drawCash(g, W - 290, H / 2 + 20, 1.15);
  texture.needsUpdate = true;
}

// On the front wall's face (z = wallZ, facing the spawn). Returns { mesh (for clicks), update(amount, wait) }.
export function addAdBoard(scene, v, { x, wallZ, baseY }) {
  v.box(x, baseY - 2, wallZ + 0.6, AD_W + 4, AD_H + 4, 1.2, '#14141a');
  const tex = adBoardTexture();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(AD_W, AD_H), new THREE.MeshBasicMaterial({ map: tex.texture }));
  face.position.set(x, baseY + AD_H / 2, wallZ + 1.3);
  scene.add(face);
  let last = '';
  return {
    mesh: face,
    update(amount, wait) {
      const key = `${amount}|${wait}`;
      if (key === last) return;
      last = key;
      drawAdBoard(tex, amount, wait);
    },
  };
}
