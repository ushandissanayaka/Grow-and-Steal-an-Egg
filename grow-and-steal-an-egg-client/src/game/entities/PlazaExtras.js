// More things by the start of the track (from the reference video):
//  - the Inferno Dragon: a huge red-and-gold dragon standing on a fiery pad, for sale (limited);
//  - the Fuse Machine: a dark block machine with a big "?" screen, a star panel, a heart panel and
//    an antenna; it shows how many pets of one kind you have towards a fusion ("2/3");
//  - the Feedback mailbox: a black mailbox on a post on a glowing pad (send ideas, get a reward);
//  - the eggs at the Sell Shop: a small egg on the counter, a big white egg beside it, white tiles;
//  - the weather sign: a tall post with a board saying when the next rain and snowfall start.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { canvasTexture, drawOutlinedText, makeBillboard, FONT_TITLE, FONT_UI } from '../util/canvasText.js';
import { glowMap } from './Effects.js';
import { addGlowRing } from './Shops.js';
import { createPetMesh } from './PetDisplay.js';
import { liveLabel } from './WinterFusion.js';

const K = 2.4;

function sparks(scene, count, color, size) {
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
    map: glowMap(), size, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  return { positions, geometry };
}

// ------------------------------------------------------------------ the Inferno Dragon

export function addInfernoDragon(scene, physics, x, z) {
  const SCALE = 4.6;
  const dragon = createPetMesh('infernoDragon');
  dragon.scale.setScalar(SCALE);
  dragon.position.set(x, 0.3, z);
  dragon.castShadow = true;
  scene.add(dragon);
  // the fiery pad
  const pad = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.75 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(x, 0.14, z);
  scene.add(pad);
  const ring = addGlowRing(scene, x, z, 16, '#ffb21f');
  physics.addBox(x - 12, x + 12, z - 14, z + 14);
  // flames licking up around it
  const fire = sparks(scene, 46, '#ff7a1a', 4);
  const embers = sparks(scene, 20, '#ffe14a', 2.2);
  const label = liveLabel(scene, 720, 400, 30);
  label.sprite.position.set(x, 64, z);
  return (time, info = {}) => {
    ring(time);
    dragon.position.y = 0.3 + Math.max(0, Math.sin(time * 1.3)) * 0.6;
    dragon.rotation.y = Math.sin(time * 0.4) * 0.15;
    for (let i = 0; i < 46; i++) {
      const t = (time * 0.7 + i / 46) % 1;
      const a = i * 2.39;
      const r = 6 + (i % 5) * 2.2;
      fire.positions[i * 3] = x + Math.cos(a) * r * (1 - t * 0.5);
      fire.positions[i * 3 + 1] = 1 + t * 26;
      fire.positions[i * 3 + 2] = z + Math.sin(a) * r * (1 - t * 0.5);
    }
    fire.geometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < 20; i++) {
      const t = (time * 0.25 + i / 20) % 1;
      const a = i * 1.7 + time * 0.5;
      embers.positions[i * 3] = x + Math.cos(a) * 14;
      embers.positions[i * 3 + 1] = 2 + t * 45;
      embers.positions[i * 3 + 2] = z + Math.sin(a) * 14;
    }
    embers.geometry.attributes.position.needsUpdate = true;
    label.draw([
      { text: 'SPECIAL', size: 54, fill: '#ff3a3a' },
      { text: 'Inferno Dragon', size: 84, fill: '#ff8a1a' },
      { text: '300% Best Pet', size: 54, fill: '#ff5fd8' },
      { text: info.price ? `Only $${info.price}!` : 'Only a few!', size: 62, fill: '#7dff3f' },
      { text: info.left === 0 ? 'SOLD OUT!' : `Only ${info.left ?? 8} left!`, size: 58, fill: '#ff3a3a' },
    ]);
  };
}

// ------------------------------------------------------------------ the Fuse Machine

function questionScreen() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#dff4ff');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  drawOutlinedText(g, '?', 128, 136, { size: 210, fill: '#2f8fe8', font: FONT_TITLE, stroke: '#1f5aa8', strokeWidth: 8 });
  return canvasTexture(c);
}

export function addFuseMachine(scene, v, glow, physics, x, z) {
  const b = (bx, by, bz, w, h, d, color, opts) => v.box(x + bx * K, by * K, z + bz * K, w * K, h * K, d * K, color, opts);
  const g = (bx, by, bz, w, h, d, color, opts) => glow.box(x + bx * K, by * K, z + bz * K, w * K, h * K, d * K, color, opts);
  const DARK = '#1a1e2a', NAVY = '#203070', GREY = '#8a909c', BLUE = '#2f6ae8', CYAN = '#5fe8ff';
  // base step, the big body with rounded top, the grey-framed screen
  b(0, 0, 0, 14, 1, 10, '#2a2e3a');
  b(0, 1, -0.5, 11, 9, 7, DARK);
  b(0, 10, -0.5, 9, 1, 6, DARK);
  b(0, 11, -0.5, 6, 0.8, 4, DARK);
  g(0, 11.8, -0.5, 2.6, 0.6, 1.6, CYAN);                       // the light on top
  b(-1, 2, 3.05, 7.6, 7.2, 0.4, GREY);                          // screen frame
  b(4.1, 2, 2.6, 1.8, 7.2, 1.2, BLUE);                           // blue side panel
  g(4.6, 3, 3.25, 0.6, 5, 0.1, CYAN);                           // the light strip
  b(-5.2, 1, 2.6, 0.6, 9, 1.2, BLUE);
  // the console on the left: star panel, heart panel, antenna
  b(-8.2, 1, 1.5, 5, 3.2, 4, '#2a2e3a');
  b(-9.2, 4.2, 1.5, 2.6, 2.6, 0.6, '#0c0e14');
  for (const [sx, sy] of [[-0.6, 1], [0.5, 0.4], [-0.2, -0.4]]) g(-9.2 + sx, 5.2 + sy, 1.85, 0.5, 0.5, 0.1, '#ffffff', { rz: 0.785 });
  b(-6.6, 4.2, 1.5, 1.4, 2.8, 0.6, '#d8202e');
  for (let i = 0; i < 3; i++) g(-6.6, 4.5 + i * 0.8, 1.85, 0.6, 0.5, 0.1, '#ffd8e0');
  b(-10.2, 4.2, 0.6, 0.3, 4, 0.3, '#14141a');
  b(-10.2, 8.2, 0.6, 0.7, 0.7, 0.7, '#14141a');

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(7 * K, 6.6 * K), new THREE.MeshBasicMaterial({ map: questionScreen() }));
  screen.position.set(x - 1 * K, 5.6 * K, z + 3.3 * K);
  scene.add(screen);
  const ring = addGlowRing(scene, x, z, 9 * K, CYAN);
  physics.addBox(x - 11 * K, x + 7.5 * K, z - 4.5 * K, z + 5.5 * K);

  const tag = makeBillboard([{ text: 'NEW!', size: 64, fill: { gradient: [[0, '#ff5a5a'], [1, '#d8202e']] }, font: FONT_TITLE, stroke: '#ffffff', strokeWidth: 12 }], 2.2 * K);
  tag.position.set(x, 21.5 * K, z);
  scene.add(tag);
  const label = liveLabel(scene, 760, 260, 9 * K);
  label.sprite.position.set(x, 17.5 * K, z);
  return (time, info = {}) => {
    ring(time);
    screen.scale.setScalar(1 + Math.sin(time * 3) * 0.015);
    label.draw([
      { text: 'Fuse Machine', size: 104, fill: '#5fc8ff' },
      { text: `${info.have ?? 0}/3`, size: 80, fill: '#ffffff' },
    ]);
  };
}

// ------------------------------------------------------------------ the Feedback mailbox

export function addFeedbackBox(scene, v, physics, x, z) {
  const BLACK = '#161a26';
  v.box(x, 0, z, 1.6, 9, 1.6, BLACK);                              // the post
  v.box(x, 9, z, 6, 4.4, 9, BLACK);                                // the box
  v.box(x, 13.4, z, 5, 1.2, 9, BLACK);                             // its rounded top
  v.box(x, 14.6, z, 3, 0.8, 9, BLACK);
  v.box(x + 3.1, 12, z - 2, 0.4, 3.6, 0.6, '#d8202e');             // the little red flag
  v.box(x + 3.1, 14.8, z - 2.6, 0.4, 1.4, 1.8, '#d8202e');
  const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.55 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(x, 0.14, z);
  scene.add(pad);
  const ring = addGlowRing(scene, x, z, 9, '#7fe8ff');
  physics.addBox(x - 3, x + 3, z - 4.5, z + 4.5);
  const label = makeBillboard([
    { text: 'FREE REWARD!', size: 56, fill: '#7dff3f', font: FONT_TITLE },
    { text: '✉ FEEDBACK ✉', size: 78, fill: '#ffffff', font: FONT_TITLE },
    { text: 'Ideas, bugs or wishes? Tell us!', size: 40, fill: '#ffffff', font: FONT_UI },
  ], 18);
  label.position.set(x, 30, z);
  scene.add(label);
  return (time) => ring(time);
}

// ------------------------------------------------------------------ the Sell Shop's eggs

function eggVoxels(v, x, y, z, s, color, spot) {
  // an egg from stacked slices, widest a little below the middle
  const rows = [[0, 0.62], [0.12, 0.86], [0.26, 0.98], [0.42, 1], [0.58, 0.92], [0.72, 0.78], [0.84, 0.58], [0.94, 0.34]];
  const H = 2.6 * s;
  rows.forEach(([t, w], i) => {
    const next = rows[i + 1]?.[0] ?? 1;
    v.box(x, y + t * H, z, w * 1.8 * s, (next - t) * H + 0.02, w * 1.8 * s, color);
  });
  if (spot) v.box(x, y + 0.5 * H, z + 0.9 * s, 0.5 * s, 0.4 * s, 0.1, spot);
}

export function addSellExtras(v, x, z) {
  // white tiles in front of the stall
  for (let i = -2; i <= 2; i++) for (let j = 0; j < 2; j++) v.box(x + i * 8.4, 0, z + 14 + j * 8.4, 8, 0.6, 8, j % 2 === i % 2 ? '#f4f6f8' : '#e2e6ec');
  eggVoxels(v, x - 4, 8.2, z + 5, 1.6, '#f2dcb0');           // on the counter
  eggVoxels(v, x + 17, 0.6, z + 14, 4.4, '#f8f8fa');          // the big white egg beside it
}

// ------------------------------------------------------------------ the weather sign

function weatherIcon(g, kind, x, y, s) {
  if (kind === 'rain') {
    g.fillStyle = '#e8eef8';
    for (const [cx, cy, r] of [[-18, 4, 20], [6, -8, 26], [28, 6, 18]]) { g.beginPath(); g.arc(x + cx * s, y + cy * s, r * s, 0, Math.PI * 2); g.fill(); }
    g.fillRect(x - 36 * s, y + 4 * s, 82 * s, 20 * s);
    g.strokeStyle = '#35a8ff';
    g.lineWidth = 7 * s;
    for (const dx of [-20, 0, 20]) { g.beginPath(); g.moveTo(x + dx * s, y + 34 * s); g.lineTo(x + (dx - 6) * s, y + 52 * s); g.stroke(); }
  } else {
    g.strokeStyle = '#9fe8ff';
    g.lineWidth = 9 * s;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      g.beginPath();
      g.moveTo(x - Math.cos(a) * 36 * s, y - Math.sin(a) * 36 * s);
      g.lineTo(x + Math.cos(a) * 36 * s, y + Math.sin(a) * 36 * s);
      g.stroke();
    }
  }
}

export function addWeatherSign(scene, v, x, z) {
  const POST = '#3a3e48';
  v.box(x, 0, z, 2.4, 52, 2.4, POST);
  v.box(x, 0, z, 5, 1.4, 5, POST);
  const W = 30, H = 36, top = 50;
  v.box(x, top - H - 1, z - 0.8, W + 2, H + 2, 1.2, POST);
  v.box(x, top + 1, z - 0.8, W + 3, 1.6, 2, '#5a3520');
  const c = document.createElement('canvas');
  c.width = 500;
  c.height = 600;
  const texture = canvasTexture(c);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: texture }));
  face.position.set(x, top - H / 2, z + 0.05);
  scene.add(face);
  let last = '';
  // rain / snow: "m:ss" until it starts, or '' when it is on now
  return (rain, snow) => {
    const key = `${rain}|${snow}`;
    if (key === last) return;
    last = key;
    const g = c.getContext('2d');
    g.fillStyle = '#111318';
    g.fillRect(0, 0, 500, 600);
    const row = (y, kind, title, time) => {
      g.fillStyle = '#1c1f27';
      g.fillRect(20, y, 460, 270);
      weatherIcon(g, kind, 100, y + 120, 1.1);
      drawOutlinedText(g, title, 190, y + 70, { size: 46, fill: kind === 'rain' ? '#7fd0ff' : '#c8f4ff', align: 'left', font: FONT_UI, weight: 800 });
      drawOutlinedText(g, time ? 'Starts in' : 'Falling now!', 190, y + 128, { size: 40, fill: '#ffffff', align: 'left', font: FONT_UI, weight: 700 });
      if (time) drawOutlinedText(g, time, 190, y + 210, { size: 96, fill: '#ffffff', align: 'left', font: FONT_TITLE });
    };
    row(20, 'rain', 'Growth Rain', rain);
    row(310, 'snow', 'Snowfall', snow);
    texture.needsUpdate = true;
  };
}
