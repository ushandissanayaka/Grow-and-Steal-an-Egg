// The giant forest animals. They wander around, show their mood above their head, and charge
// at anyone carrying eggs: "!" while they notice you, an angry face while they chase,
// and a smug face while they carry your egg home.

import * as THREE from 'three';
import { ANIMALS, DIFFICULTY_COLOR, ZONES, animalSize } from '../../shared/gameData.js';
import { canvasTexture, drawOutlinedText, FONT_UI } from '../util/canvasText.js';
import { createPetMesh } from './PetDisplay.js';
import { createItemMesh } from './Egg.js';
import { animateRig, createRig, hasRig } from './GuardRigs.js';

const DIFFICULTY = Object.fromEntries(ZONES.flatMap((z) => (z.animals || [z.animal]).map((a) => [a, z.difficulty])));
const LABEL_HEIGHT = 4.2;

// A round emoji-style face drawn on a canvas. kind: happy | neutral | worried | angry | smug
function drawFace(g, cx, cy, r, color, kind) {
  g.fillStyle = color;
  g.strokeStyle = '#2a1608';
  g.lineWidth = r * 0.12;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#2a1608';
  const eyeY = cy - r * 0.18;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + side * r * 0.36, eyeY, r * 0.11, r * 0.17, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.lineWidth = r * 0.1;
  g.lineCap = 'round';
  g.beginPath();
  if (kind === 'angry') {
    for (const side of [-1, 1]) {
      g.moveTo(cx + side * r * 0.6, eyeY - r * 0.42);
      g.lineTo(cx + side * r * 0.15, eyeY - r * 0.2);
    }
    g.moveTo(cx - r * 0.38, cy + r * 0.52);
    g.quadraticCurveTo(cx, cy + r * 0.2, cx + r * 0.38, cy + r * 0.52);
  } else if (kind === 'neutral') {
    g.moveTo(cx - r * 0.35, cy + r * 0.42);
    g.lineTo(cx + r * 0.35, cy + r * 0.42);
  } else if (kind === 'worried') {
    g.moveTo(cx - r * 0.35, cy + r * 0.5);
    g.quadraticCurveTo(cx, cy + r * 0.3, cx + r * 0.35, cy + r * 0.5);
  } else {
    g.moveTo(cx - r * 0.42, cy + r * 0.28);
    g.quadraticCurveTo(cx, cy + r * (kind === 'smug' ? 0.55 : 0.75), cx + r * 0.42, cy + r * 0.28);
  }
  g.stroke();
}

// ------------------------------------------------------------------ the difficulty badge
// A glossy rounded-square face and a big label above each animal, saying how hard its forest's
// trees are to chop. Shown when the player comes near (see AnimalView.update).

const BADGE = {
  Easy: { face: '#ffd21f', expr: 'happy' },
  Medium: { face: '#ff9a1f', expr: 'grumpy' },
  Hard: { face: '#ffd21f', expr: 'sweat' },
  'Extra Hard': { face: '#ff3b3b', expr: 'furious' },
  'Super Hard': { face: '#4ab8ff', expr: 'furious', spikes: true },
  Insane: { face: '#f4f2ee', expr: 'skull' },
  Nightmare: { face: '#7de83a', expr: 'dizzy' },
  Impossible: { face: '#b84aff', expr: 'furious', spikes: true },
  Mythical: { face: '#2fe6b8', expr: 'sweat' },
  Godly: { face: '#ffd21f', expr: 'happy', halo: true },
};
const BADGE_NEAR = 75;      // the badge shows within this distance of the player
const BADGE_HEIGHT = 8.5;   // world units

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawBadgeFace(g, cx, cy, s, difficulty) {
  const { face, expr, spikes, halo } = BADGE[difficulty] || BADGE.Easy;
  if (halo) {
    // a golden halo floating over the head
    g.lineWidth = s * 0.06;
    g.strokeStyle = '#14141a';
    g.beginPath();
    g.ellipse(cx, cy - s * 0.56, s * 0.36, s * 0.08, 0, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = s * 0.035;
    g.strokeStyle = '#ffe14a';
    g.stroke();
  }
  const x = cx - s / 2, y = cy - s / 2;
  // body: dark outline, colour, darker bottom, glossy top
  roundRect(g, x - 9, y - 9, s + 18, s + 18, s * 0.3);
  g.fillStyle = '#14141a';
  g.fill();
  const grad = g.createLinearGradient(0, y, 0, y + s);
  grad.addColorStop(0, face);
  grad.addColorStop(1, shade(face, -0.25));
  roundRect(g, x, y, s, s, s * 0.24);
  g.fillStyle = grad;
  g.fill();
  if (spikes) {
    // icy spikes across the top of the head
    g.fillStyle = '#e8f8ff';
    g.strokeStyle = '#14141a';
    g.lineWidth = s * 0.03;
    g.beginPath();
    g.moveTo(x + s * 0.12, y + s * 0.2);
    for (let i = 0; i < 6; i++) {
      const sx = x + s * 0.12 + (i + 0.5) * (s * 0.76 / 6);
      g.lineTo(sx, y + s * (i % 2 ? 0.02 : 0.08));
      g.lineTo(sx + s * 0.063, y + s * 0.2);
    }
    g.closePath();
    g.fill();
    g.stroke();
  }
  roundRect(g, x + s * 0.12, y + s * 0.06, s * 0.76, s * 0.22, s * 0.1);
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fill();
  if (expr === 'skull' || expr === 'dizzy') return drawSpecialFace(g, cx, cy, s, expr);
  // blush
  g.fillStyle = 'rgba(255,90,110,0.45)';
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + side * s * 0.3, cy + s * 0.14, s * 0.1, s * 0.06, 0, 0, Math.PI * 2);
    g.fill();
  }
  // eyes (big and shiny when happy, narrowed when angry)
  const eyeY = cy - s * 0.06;
  g.fillStyle = '#14141a';
  for (const side of [-1, 1]) {
    g.beginPath();
    const tall = expr === 'happy' ? 0.12 : 0.08;
    g.ellipse(cx + side * s * 0.18, eyeY, s * 0.06, s * tall, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(cx + side * s * 0.18 - s * 0.015, eyeY - s * 0.04, s * 0.022, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#14141a';
  }
  g.strokeStyle = '#14141a';
  g.lineCap = 'round';
  g.lineWidth = s * 0.05;
  // brows
  if (expr === 'grumpy' || expr === 'furious' || expr === 'sweat') {
    g.beginPath();
    for (const side of [-1, 1]) {
      const inner = expr === 'sweat' ? -0.04 : 0.06; // worried brows tilt the other way
      g.moveTo(cx + side * s * 0.3, eyeY - s * 0.2 + (expr === 'sweat' ? s * 0.05 : 0));
      g.lineTo(cx + side * s * 0.08, eyeY - s * 0.14 + s * inner);
    }
    g.stroke();
  }
  // mouth
  g.beginPath();
  const my = cy + s * 0.24;
  if (expr === 'happy') {
    g.fillStyle = '#c8203a';
    g.moveTo(cx - s * 0.16, my - s * 0.04);
    g.quadraticCurveTo(cx, my + s * 0.22, cx + s * 0.16, my - s * 0.04);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (expr === 'grumpy') {
    g.moveTo(cx - s * 0.12, my + s * 0.04);
    g.quadraticCurveTo(cx, my - s * 0.08, cx + s * 0.12, my + s * 0.04);
    g.stroke();
  } else if (expr === 'sweat') {
    g.moveTo(cx - s * 0.12, my);
    g.quadraticCurveTo(cx - s * 0.06, my - s * 0.06, cx, my);
    g.quadraticCurveTo(cx + s * 0.06, my + s * 0.06, cx + s * 0.12, my);
    g.stroke();
    // a drop of sweat
    g.fillStyle = '#4ac8ff';
    g.beginPath();
    g.moveTo(cx + s * 0.4, y + s * 0.12);
    g.quadraticCurveTo(cx + s * 0.48, y + s * 0.3, cx + s * 0.4, y + s * 0.33);
    g.quadraticCurveTo(cx + s * 0.32, y + s * 0.3, cx + s * 0.4, y + s * 0.12);
    g.fill();
    g.lineWidth = s * 0.02;
    g.stroke();
  } else {
    // gritted teeth
    roundRect(g, cx - s * 0.17, my - s * 0.07, s * 0.34, s * 0.14, s * 0.04);
    g.fillStyle = '#fff';
    g.fill();
    g.lineWidth = s * 0.03;
    g.stroke();
    g.beginPath();
    for (let i = 1; i < 4; i++) {
      g.moveTo(cx - s * 0.17 + i * s * 0.085, my - s * 0.07);
      g.lineTo(cx - s * 0.17 + i * s * 0.085, my + s * 0.07);
    }
    g.moveTo(cx - s * 0.17, my);
    g.lineTo(cx + s * 0.17, my);
    g.stroke();
  }
}

// Insane: a skull with glowing orange eyes. Nightmare: a dizzy face with X eyes, stars and a tongue.
function drawSpecialFace(g, cx, cy, s, expr) {
  g.lineCap = 'round';
  if (expr === 'skull') {
    g.fillStyle = '#14141a';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + side * s * 0.19, cy - s * 0.06, s * 0.13, s * 0.14, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#ff8a1a';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.arc(cx + side * s * 0.19, cy - s * 0.05, s * 0.045, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#14141a';
    g.beginPath(); // the nose
    g.moveTo(cx, cy + s * 0.07);
    g.lineTo(cx - s * 0.05, cy + s * 0.15);
    g.lineTo(cx + s * 0.05, cy + s * 0.15);
    g.closePath();
    g.fill();
    for (let i = 0; i < 4; i++) roundRect(g, cx - s * 0.18 + i * s * 0.095, cy + s * 0.22, s * 0.07, s * 0.12, s * 0.015);
    g.fill(); // the teeth
    return;
  }
  // dizzy
  g.strokeStyle = '#14141a';
  g.lineWidth = s * 0.05;
  g.beginPath();
  for (const side of [-1, 1]) {
    const ex = cx + side * s * 0.19, ey = cy - s * 0.06, k = s * 0.08;
    g.moveTo(ex - k, ey - k); g.lineTo(ex + k, ey + k);
    g.moveTo(ex + k, ey - k); g.lineTo(ex - k, ey + k);
  }
  g.stroke();
  g.fillStyle = 'rgba(255,120,120,0.5)';
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + side * s * 0.3, cy + s * 0.14, s * 0.09, s * 0.055, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath(); // grin with a tongue
  g.fillStyle = '#14141a';
  g.moveTo(cx - s * 0.14, cy + s * 0.18);
  g.quadraticCurveTo(cx, cy + s * 0.38, cx + s * 0.14, cy + s * 0.18);
  g.closePath();
  g.fill();
  g.fillStyle = '#ff6a8a';
  g.beginPath();
  g.ellipse(cx, cy + s * 0.27, s * 0.06, s * 0.045, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffe14a'; // little stars spinning round the head
  for (const [sx, sy] of [[-0.36, -0.36], [0.38, -0.34]]) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.025 : s * 0.06, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(cx + sx * s + Math.cos(a) * r, cy + sy * s + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.lineWidth = s * 0.012;
    g.stroke();
  }
}

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

const badgeTextures = new Map();
function difficultyBadge(difficulty) {
  if (!badgeTextures.has(difficulty)) {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 420;
    const g = c.getContext('2d');
    drawBadgeFace(g, 320, 120, 190, difficulty);
    const text = difficulty.includes(' ') || difficulty.length > 8 ? difficulty.toUpperCase() : difficulty;
    const big = Math.min(118, Math.floor(960 / text.length)); // long words get smaller so they fit
    drawOutlinedText(g, text, 320, 340, {
      size: big, weight: 800, fill: DIFFICULTY_COLOR[difficulty], stroke: '#14141a', strokeWidth: 16, font: FONT_UI, skewX: -0.2,
    });
    badgeTextures.set(difficulty, canvasTexture(c));
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTextures.get(difficulty), transparent: true, depthWrite: false }));
  sprite.scale.set(BADGE_HEIGHT * (640 / 420), BADGE_HEIGHT, 1);
  sprite.renderOrder = 6;
  sprite.userData.badge = true;
  return sprite;
}

function moodSprite(type, mood) {
  if (mood !== 'alert' && mood !== 'chase' && mood !== 'carry') return difficultyBadge(DIFFICULTY[type] || 'Easy');
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (mood === 'alert') {
    drawOutlinedText(g, '!', 128, 120, { size: 200, fill: '#ffd21f', stroke: '#2a1608', strokeWidth: 16, font: FONT_UI });
  } else if (mood === 'chase') {
    drawFace(g, 128, 96, 70, '#ff3b3b', 'angry');
    drawOutlinedText(g, '!!', 128, 210, { size: 76, fill: '#ff3b3b', stroke: '#2a1608', strokeWidth: 8, font: FONT_UI });
  } else {
    drawFace(g, 128, 96, 70, '#ffd21f', 'smug');
    drawOutlinedText(g, 'Mine!', 128, 210, { size: 58, fill: '#ffffff', stroke: '#2a1608', strokeWidth: 7, font: FONT_UI });
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false }));
  sprite.scale.setScalar(LABEL_HEIGHT);
  sprite.renderOrder = 6;
  return sprite;
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class AnimalView {
  static smoothing = 10;
  static viewer = null; // the local player's position (set by Game), for showing the difficulty badge

  constructor(state, scene) {
    const def = ANIMALS[state.type];
    this.type = state.type;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    // the stage guards have joints (legs, arms, wings, claws move); anything else is one piece
    if (hasRig(state.type)) {
      const rig = createRig(state.type);
      this.mesh = rig.group;
      this.limbs = rig.limbs;
    } else this.mesh = createPetMesh(state.type);
    this.mesh.scale.setScalar(def.scale * animalSize(state.type)); // bigger in each forest further out
    this.body.add(this.mesh);
    this.root.add(this.body);
    this.height = new THREE.Box3().setFromObject(this.mesh).max.y;
    this.root.position.set(state.x, 0, state.z);
    this.root.rotation.y = state.ry;
    this.target = new THREE.Vector3(state.x, 0, state.z);
    this.targetRy = state.ry;
    this.labelKey = '';
    this.carryKey = '';
    this.t = Math.random() * 10;
    this.speed = 0;
    scene.add(this.root);
  }

  setState(s) {
    this.target.set(s.x, 0, s.z);
    this.targetRy = s.ry;
    this.mood = s.mood;
    const label = s.carrying ? 'carry' : s.mood === 'return' ? 'idle' : s.mood;
    if (label !== this.labelKey) {
      this.labelKey = label;
      if (this.label) {
        this.root.remove(this.label);
        if (!this.label.userData.badge) this.label.material.map.dispose(); // badge images are shared
        this.label.material.dispose();
      }
      this.label = moodSprite(this.type, label);
      this.badgeK = 0;
      this.label.position.y = this.labelY();
      this.root.add(this.label);
    }
    if (s.carrying !== this.carryKey) {
      this.carryKey = s.carrying;
      if (this.egg) this.body.remove(this.egg);
      this.egg = null;
      if (s.carrying) {
        this.egg = createItemMesh(JSON.parse(s.carrying), 1.3); // the pet it took back
        this.egg.position.set(0, this.height * 0.75, -this.height * 0.15);
        this.body.add(this.egg);
      }
    }
  }

  update(dt) {
    const before = this.root.position.clone();
    if (this.root.position.distanceTo(this.target) > 40) this.root.position.copy(this.target);
    else this.root.position.lerp(this.target, 1 - Math.exp(-dt * AnimalView.smoothing));
    this.root.rotation.y = lerpAngle(this.root.rotation.y, this.targetRy, 1 - Math.exp(-dt * AnimalView.smoothing));
    this.speed = dt > 0 ? before.distanceTo(this.root.position) / dt : 0;

    // a walk cycle that runs faster with speed; jointed guards walk with their limbs and only bob a
    // little, the others hop
    this.t += dt * (2 + this.speed * 0.35);
    this.time = (this.time || 0) + dt;
    const moving = Math.min(1, this.speed / 6);
    this.move = (this.move || 0) + (moving - (this.move || 0)) * Math.min(1, dt * 6);
    if (this.limbs) {
      animateRig(this.limbs, this.t, this.move, this.mood === 'chase', this.time);
      this.body.position.y = Math.abs(Math.sin(this.t)) * 0.35 * this.move;
    } else {
      const hop = this.speed > 0.5 ? Math.abs(Math.sin(this.t)) * Math.min(1.6, 0.25 + this.speed * 0.03) : 0;
      this.body.position.y = hop;
    }
    this.body.rotation.x = this.mood === 'chase' ? 0.12 : 0;
    if (!this.label) return;
    this.label.position.y = this.labelY() + (this.mood === 'alert' ? Math.abs(Math.sin(this.t * 3)) * 0.8 : 0);
    if (this.label.userData.badge) {
      // the difficulty badge pops in when the player comes near, and fades away again
      const v = AnimalView.viewer;
      const near = v ? Math.hypot(v.x - this.root.position.x, v.z - this.root.position.z) < BADGE_NEAR : false;
      this.badgeK += ((near ? 1 : 0) - this.badgeK) * Math.min(1, dt * 6);
      const k = this.badgeK;
      this.label.visible = k > 0.02;
      this.label.material.opacity = k;
      const pop = 0.6 + 0.4 * k + Math.sin(k * Math.PI) * 0.15;
      this.label.scale.set(BADGE_HEIGHT * (640 / 420) * pop, BADGE_HEIGHT * pop, 1);
    }
  }

  labelY() {
    return this.height + (this.label?.userData.badge ? BADGE_HEIGHT * 0.62 : LABEL_HEIGHT * 0.65);
  }
}
