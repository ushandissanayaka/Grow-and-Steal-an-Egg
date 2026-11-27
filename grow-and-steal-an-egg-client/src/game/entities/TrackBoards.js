// The two big boards standing on the north wall, one on each side of where the track starts:
// "HOW TO PLAY" on the left and "BIOMES" (each biome with the speed it needs) on the right.
// Both face south, so players see them from the spawn. Chasing bulbs run around their frames.

import * as THREE from 'three';
import { canvasTexture, drawOutlinedText, FONT_TITLE, FONT_UI, RAINBOW } from '../util/canvasText.js';
import { DIFFICULTY_COLOR, ZONES, formatNumber } from '../../shared/gameData.js';
import { addBulbs } from './Shops.js';

const BOARD_W = 104;
const BOARD_H = 60;
const FRAME = 3;          // thickness of the wooden frame around the face
const LIFT = 8;           // gap between the wall top and the board's bottom
const LEG_W = 4;
const BULB_STEP = 5.2;
const CANVAS_W = 1536;
const CANVAS_H = Math.round(CANVAS_W * BOARD_H / BOARD_W);

const WOOD = '#5a3520';
const WOOD_DARK = '#3d2314';
const TRIM = '#ffcf3a';

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Night-sky face with a big title, shared by both boards.
function boardCanvas(title, titleFill) {
  const c = document.createElement('canvas');
  c.width = CANVAS_W;
  c.height = CANVAS_H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, '#1d2a6b');
  bg.addColorStop(1, '#0c1233');
  g.fillStyle = bg;
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // a few soft stars
  g.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let i = 0; i < 70; i++) {
    const x = (i * 211) % CANVAS_W, y = (i * 97) % CANVAS_H, s = 2 + (i % 3) * 2;
    g.fillRect(x, y, s, s);
  }
  drawOutlinedText(g, title, CANVAS_W / 2, 98, {
    size: 118, font: FONT_TITLE, weight: 400, fill: titleFill, stroke: '#0a0d22', strokeWidth: 14,
    shadow: { color: 'rgba(0,0,0,0.45)', x: 0, y: 8 },
  });
  return { c, g };
}

// Small round icon badges drawn in front of each row.
const ICONS = {
  scythe(g, x, y) {
    g.strokeStyle = '#8a5a32'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 16, y + 24); g.lineTo(x + 12, y - 22); g.stroke();
    g.fillStyle = '#dfe7ef'; g.strokeStyle = '#1b1f2a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x + 12, y - 22); g.quadraticCurveTo(x - 6, y - 34, x - 30, y - 14);
    g.quadraticCurveTo(x - 6, y - 22, x + 8, y - 12); g.closePath(); g.fill(); g.stroke();
  },
  egg(g, x, y) {
    g.fillStyle = '#fff1dc'; g.strokeStyle = '#1b1f2a'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(x, y + 2, 20, 26, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#ff9fd2';
    for (const [dx, dy] of [[-7, -8], [8, 4], [-4, 12]]) { g.beginPath(); g.arc(x + dx, y + dy, 4, 0, Math.PI * 2); g.fill(); }
  },
  run(g, x, y) {
    g.fillStyle = '#ffe14a'; g.strokeStyle = '#1b1f2a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x + 4, y - 30); g.lineTo(x - 14, y + 4); g.lineTo(x, y + 4); g.lineTo(x - 6, y + 30);
    g.lineTo(x + 16, y - 6); g.lineTo(x + 2, y - 6); g.closePath(); g.fill(); g.stroke();
  },
  clover(g, x, y) {
    g.fillStyle = '#3fd25a'; g.strokeStyle = '#1b1f2a'; g.lineWidth = 4;
    for (const [dx, dy] of [[0, -12], [12, 0], [0, 12], [-12, 0]]) { g.beginPath(); g.arc(x + dx, y + dy, 11, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillStyle = '#2fb64a'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
  },
  coin(g, x, y) {
    g.fillStyle = '#ffcf33'; g.strokeStyle = '#1b1f2a'; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill(); g.stroke();
    drawOutlinedText(g, '$', x, y + 2, { size: 34, fill: '#fff6c8', stroke: '#a26a00', strokeWidth: 4 });
  },
};

function howToPlayTexture() {
  const { c, g } = boardCanvas('HOW TO PLAY', RAINBOW);
  const steps = [
    ['scythe', 'Swing your scythe to grow giant eggs', '#7fd8ff'],
    ['egg', 'Hatch them and steal the pets inside', '#ffb7dc'],
    ['run', 'Run back to your base before you get caught', '#ffe14a'],
    ['clover', 'Use Lucky Dust to get rarer pets', '#7dff8a'],
    ['coin', 'Collect cash and buy better scythes', '#ffd76a'],
  ];
  const top = 200, rowH = (CANVAS_H - top - 40) / steps.length;
  steps.forEach(([icon, text, color], i) => {
    const y = top + i * rowH;
    roundRect(g, 70, y + 8, CANVAS_W - 140, rowH - 18, 26);
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.fill();
    const cy = y + 8 + (rowH - 18) / 2;
    g.beginPath(); g.arc(150, cy, 44, 0, Math.PI * 2);
    g.fillStyle = color; g.fill();
    g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
    ICONS[icon](g, 150, cy);
    drawOutlinedText(g, `${i + 1}.`, 240, cy, { size: 64, align: 'left', fill: color, stroke: '#0a0d22', strokeWidth: 8, font: FONT_TITLE, weight: 400 });
    drawOutlinedText(g, text, 320, cy, { size: 64, align: 'left', fill: '#ffffff', stroke: '#0a0d22', strokeWidth: 8, font: FONT_UI });
  });
  return canvasTexture(c);
}

function biomesTexture() {
  const { c, g } = boardCanvas('BIOMES', { gradient: [[0, '#fff27a'], [1, '#ff9a1f']] });
  const cols = 2, rows = Math.ceil(ZONES.length / cols);
  const top = 200, colW = (CANVAS_W - 140) / cols, rowH = (CANVAS_H - top - 40) / rows;
  ZONES.forEach((zone, i) => {
    const col = Math.floor(i / rows), row = i % rows;
    const x = 70 + col * colW, y = top + row * rowH;
    roundRect(g, x + 10, y + 6, colW - 20, rowH - 14, 22);
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.fill();
    const cy = y + 6 + (rowH - 14) / 2;
    const swatch = zone.ground?.[0] || '#ffffff';
    roundRect(g, x + 34, cy - 30, 60, 60, 14);
    g.fillStyle = swatch; g.fill();
    g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke();
    drawOutlinedText(g, zone.name, x + 118, cy - 18, { size: 48, align: 'left', fill: '#ffffff', stroke: '#0a0d22', strokeWidth: 7 });
    drawOutlinedText(g, zone.difficulty, x + 118, cy + 30, { size: 34, align: 'left', fill: DIFFICULTY_COLOR[zone.difficulty] || '#ffffff', stroke: '#0a0d22', strokeWidth: 5 });
    drawOutlinedText(g, `⚡ ${formatNumber(zone.speed)}`, x + colW - 40, cy, { size: 52, align: 'right', fill: '#ffe14a', stroke: '#0a0d22', strokeWidth: 7 });
  });
  return canvasTexture(c);
}

// One board on the wall top at (x, wallTop, z), facing +z. Returns its bulbs' update(time).
function addBoard(scene, v, x, wallTop, z, texture, bulbColors) {
  const bottom = wallTop + LIFT;
  // two thick legs down to the wall top, with feet
  for (const side of [-1, 1]) {
    const lx = x + side * (BOARD_W / 2 - 14);
    v.box(lx, wallTop, z - 1.5, LEG_W, LIFT + BOARD_H * 0.6, LEG_W, WOOD_DARK);
    v.box(lx, wallTop, z - 1.5, LEG_W + 3, 1.6, LEG_W + 6, WOOD_DARK);
  }
  // the frame: a dark back, a wooden border and a gold trim line
  v.box(x, bottom - FRAME, z - 0.8, BOARD_W + FRAME * 2, BOARD_H + FRAME * 2, 1.6, WOOD_DARK);
  for (const [bx, by, bw, bh] of [
    [x, bottom - FRAME, BOARD_W + FRAME * 2, FRAME],
    [x, bottom + BOARD_H, BOARD_W + FRAME * 2, FRAME],
    [x - BOARD_W / 2 - FRAME / 2, bottom, FRAME, BOARD_H],
    [x + BOARD_W / 2 + FRAME / 2, bottom, FRAME, BOARD_H],
  ]) v.box(bx, by, z + 0.4, bw, bh, 1.4, WOOD);
  v.box(x, bottom + BOARD_H + FRAME, z + 0.2, BOARD_W * 0.4, 1, 1.2, TRIM);

  const face = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W, BOARD_H), new THREE.MeshBasicMaterial({ map: texture }));
  face.position.set(x, bottom + BOARD_H / 2, z + 0.15);
  scene.add(face);

  const points = [];
  const left = x - BOARD_W / 2 - FRAME / 2, right = x + BOARD_W / 2 + FRAME / 2;
  const low = bottom - FRAME / 2, high = bottom + BOARD_H + FRAME / 2;
  const bz = z + 1.4;
  for (let a = left; a <= right; a += BULB_STEP) points.push(new THREE.Vector3(a, high, bz));
  for (let a = high - BULB_STEP; a >= low; a -= BULB_STEP) points.push(new THREE.Vector3(right, a, bz));
  for (let a = right - BULB_STEP; a >= left; a -= BULB_STEP) points.push(new THREE.Vector3(a, low, bz));
  for (let a = low + BULB_STEP; a < high; a += BULB_STEP) points.push(new THREE.Vector3(left, a, bz));
  return addBulbs(scene, points, bulbColors);
}

// x: distance of each board's centre from the middle of the track; z: where its back stands.
export function addTrackBoards(scene, v, { x, z, wallTop }) {
  const left = addBoard(scene, v, -x, wallTop, z, howToPlayTexture(), ['#fff4b8', '#7fd8ff', '#ff8fc4']);
  const right = addBoard(scene, v, x, wallTop, z, biomesTexture(), ['#fff4b8', '#ffd21f', '#ff8a3a']);
  return (time) => { left(time); right(time); };
}
