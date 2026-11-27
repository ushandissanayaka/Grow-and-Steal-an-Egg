// The board above each frame: the owner's profile picture and name. Your own board says
// "YOUR BASE" and has a bouncing arrow over it for a while after you join.

import * as THREE from 'three';
import { canvasTexture, drawOutlinedText, FONT_TITLE, FONT_UI, measure } from '../util/canvasText.js';
import { lambert } from '../util/materials.js';

const W = 560;
const H = 520;
const PIC = 290;      // the round profile picture's diameter, in canvas pixels
const PIC_CY = 175;   // its centre
const SIGN_HEIGHT = 22; // world units, before the plot scale
const ARROW_SECONDS = 12;

const pictures = new Map(); // url -> Promise<HTMLImageElement | null>
function loadPicture(url) {
  if (!url) return Promise.resolve(null);
  if (!pictures.has(url)) {
    pictures.set(url, new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // keeps the canvas usable as a WebGL texture
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return pictures.get(url);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function fitName(name, maxWidth) {
  let size = 70;
  while (size > 30 && measure(name, size, FONT_UI, 700) > maxWidth) size -= 2;
  return size;
}

// A round profile picture on top, the owner's name underneath. Your own frame gets a green ring
// and a small "YOUR BASE" tag; everyone else's is gold.
function draw(g, { name, mine }, img) {
  g.clearRect(0, 0, W, H);
  const accent = mine ? '#46e24a' : '#ffc531';
  const cx = W / 2, cy = PIC_CY, r = PIC / 2;

  // soft shadow and a white outer rim, then the coloured ring
  g.save();
  g.shadowColor = 'rgba(0, 0, 0, 0.45)';
  g.shadowBlur = 22;
  g.shadowOffsetY = 8;
  g.beginPath();
  g.arc(cx, cy, r + 20, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
  g.beginPath();
  g.arc(cx, cy, r + 12, 0, Math.PI * 2);
  g.fillStyle = accent;
  g.fill();

  // the picture itself (a light sky tint while it loads, or if there is none)
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  const sky = g.createLinearGradient(0, cy - r, 0, cy + r);
  sky.addColorStop(0, '#bfe6ff');
  sky.addColorStop(1, '#e9f6ff');
  g.fillStyle = sky;
  g.fill();
  g.clip();
  if (img) g.drawImage(img, cx - r, cy - r, PIC, PIC);
  g.restore();

  // "YOUR BASE" tag sitting on the bottom of the ring
  if (mine) {
    const tagW = 236, tagH = 54, tagY = cy + r - 6;
    roundRect(g, cx - tagW / 2, tagY, tagW, tagH, tagH / 2);
    g.fillStyle = accent;
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#ffffff';
    g.stroke();
    drawOutlinedText(g, 'YOUR BASE', cx, tagY + tagH / 2 + 2, {
      size: 36, fill: '#ffffff', font: FONT_TITLE, weight: 400, stroke: '#1d5a12', strokeWidth: 5,
    });
  }

  // the name under the picture
  drawOutlinedText(g, name, cx, H - 62, { size: fitName(name, W - 40), fill: '#ffffff', stroke: '#0b0c10', strokeWidth: 9 });
}

export class OwnerSign {
  constructor(parent, position) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = canvasTexture(this.canvas);
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, depthTest: false })); // always on top
    this.sprite.scale.set(SIGN_HEIGHT * (W / H), SIGN_HEIGHT, 1);
    this.sprite.position.copy(position);
    this.sprite.renderOrder = 8;
    this.sprite.visible = false;
    parent.add(this.sprite);

    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.2, 4), lambert('#46e24a', { emissive: '#1c5a10' }));
    this.arrow.rotation.x = Math.PI;
    this.arrow.visible = false;
    parent.add(this.arrow);
    this.arrowBase = position.clone().add(new THREE.Vector3(0, SIGN_HEIGHT / 2 + 4, 0));
    this.key = '';
    this.time = 0;
    this.arrowLeft = 0;
  }

  // owner: { name, pfp, mine } or null for a free frame
  set(owner) {
    const key = owner ? `${owner.name}|${owner.pfp}|${owner.mine}` : '';
    if (key === this.key) return;
    const wasMine = this.key.endsWith('|true');
    this.key = key;
    this.sprite.visible = !!owner;
    if (!owner) return void (this.arrowLeft = 0);
    if (owner.mine && !wasMine) this.arrowLeft = ARROW_SECONDS;

    const g = this.canvas.getContext('2d');
    draw(g, owner, null);
    this.texture.needsUpdate = true;
    loadPicture(owner.pfp).then((img) => {
      if (!img || this.key !== key) return;
      draw(g, owner, img);
      this.texture.needsUpdate = true;
    });
  }

  update(dt) {
    this.time += dt;
    this.arrowLeft = Math.max(0, this.arrowLeft - dt);
    this.arrow.visible = this.arrowLeft > 0;
    if (!this.arrow.visible) return;
    this.arrow.position.copy(this.arrowBase).setY(this.arrowBase.y + Math.abs(Math.sin(this.time * 4)) * 2);
    this.arrow.rotation.y = this.time * 2;
  }
}
