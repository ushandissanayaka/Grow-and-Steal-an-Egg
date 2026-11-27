// The giant floating cakes around the map: sponge tiers, dripping icing, a cherry on top,
// with pink clouds below them and donuts, lollipops and balloons in the air.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { lambert } from '../util/materials.js';
import { stripeTexture, swirlTexture } from '../util/textures.js';

const SPONGES = ['#c8354a', '#a94a2c', '#e0533f'];
const ICINGS = ['#ff4fb0', '#ff78c4', '#ffe0ef', '#7fe0d8'];
const CENTER = { x: 0, z: -352 };

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function addIcedLayer(v, rnd, x, y, z, w, h, sponge, icing) {
  v.box(x, y, z, w, h, w, sponge);
  v.box(x, y + h * 0.42, z, w + 0.6, h * 0.14, w + 0.6, '#fff0dc'); // cream filling
  const capH = h * 0.2;
  v.box(x, y + h - capH * 0.2, z, w + 2.4, capH, w + 2.4, icing);

  // icing running down all four sides in uneven drips
  const step = 9;
  const half = w / 2 + 1;
  for (let a = -half + step / 2; a < half; a += step) {
    for (const side of [-1, 1]) {
      const len = h * (0.18 + rnd() * 0.42);
      v.box(x + a, y + h - len, z + side * half, step * 0.72, len, 1.8, icing);
      v.box(x + side * half, y + h - len, z + a, 1.8, len, step * 0.72, icing);
    }
  }
}

function addCake(v, rnd, cherries, x, y, z, scale) {
  // pink cloud the cake sits on
  for (let i = 0; i < 16; i++) {
    const size = (24 + rnd() * 34) * scale;
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 62 * scale;
    v.box(
      x + Math.cos(a) * r, y - size * (0.6 + rnd() * 0.5), z + Math.sin(a) * r,
      size, size * 0.72, size, rnd() < 0.5 ? '#ffb3dd' : '#ffd0ec', { ry: rnd() * 1.5 },
    );
  }

  const tiers = 2 + Math.floor(rnd() * 2);
  let cy = y;
  let w = (92 + rnd() * 26) * scale;
  const sponge = SPONGES[Math.floor(rnd() * SPONGES.length)];
  const icing = ICINGS[Math.floor(rnd() * ICINGS.length)];
  for (let t = 0; t < tiers; t++) {
    const h = (28 + rnd() * 10) * scale;
    addIcedLayer(v, rnd, x, cy, z, w, h, t % 2 ? '#fff0dc' : sponge, t % 2 ? ICINGS[(ICINGS.indexOf(icing) + 1) % ICINGS.length] : icing);
    cy += h;
    w *= 0.68;
  }

  // whipped cream rosettes around the top, and the cherry in the middle
  const top = cy + 4 * scale;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = w * 0.56;
    v.box(x + Math.cos(a) * r, top - 2 * scale, z + Math.sin(a) * r, 7 * scale, 5 * scale, 7 * scale, '#fff6ea', { ry: a });
  }
  v.box(x, top - 2 * scale, z, 13 * scale, 4 * scale, 13 * scale, '#fff6ea', { ry: 0.5 });
  cherries.push({ x, y: top + 8 * scale, z, r: 9 * scale });
}

function ringPosition(i, count, rnd) {
  const a = (i / count) * Math.PI * 2 + rnd() * 0.12;
  const r = 1080 + rnd() * 160;
  return { x: CENTER.x + Math.sin(a) * r, z: CENTER.z + Math.cos(a) * r };
}

export class CandyIslands {
  constructor() {
    this.group = new THREE.Group();
    const rnd = seeded(777001);
    const v = new Voxels();
    const cherries = [];

    const cakes = 26;
    for (let i = 0; i < cakes; i++) {
      const { x, z } = ringPosition(i, cakes, rnd);
      addCake(v, rnd, cherries, x, 125 + rnd() * 90, z, 1.45 + rnd() * 0.9); // base stays above the walls
    }
    this.group.add(v.mesh({ castShadow: false, receiveShadow: false }));

    this.addCherries(cherries);
    this.floating = [];
    this.addDonuts(rnd);
    this.addLollipops(rnd);
    this.addBalloons(rnd);
  }

  addCherries(list) {
    const geo = new THREE.SphereGeometry(1, 20, 16);
    const mat = lambert('#d4122e', { emissive: '#3a0410' });
    const stem = new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6);
    const stemMat = lambert('#4d7a22');
    for (const c of list) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(c.x, c.y, c.z);
      m.scale.setScalar(c.r);
      const s = new THREE.Mesh(stem, stemMat);
      s.position.set(0.3, 1.4, 0);
      s.rotation.z = -0.4;
      m.add(s);
      this.group.add(m);
    }
  }

  float(mesh, spin = 0) {
    this.floating.push({ mesh, y: mesh.position.y, phase: mesh.position.x * 0.13, spin });
    this.group.add(mesh);
  }

  addDonuts(rnd) {
    const geo = new THREE.TorusGeometry(1, 0.46, 12, 28);
    const colors = ['#e8703a', '#ff5fa8', '#7a3f1d'];
    for (let i = 0; i < 9; i++) {
      const { x, z } = ringPosition(i + 0.5, 9, rnd);
      const m = new THREE.Mesh(geo, lambert(colors[i % colors.length]));
      m.position.set(x * 0.9, 190 + rnd() * 90, z * 0.9);
      m.scale.setScalar(16 + rnd() * 10);
      m.rotation.set(rnd(), rnd(), rnd());
      this.float(m, 0.15);
    }
  }

  addLollipops(rnd) {
    const palettes = [['#ff4fa3', '#ffffff'], ['#35c8ff', '#ffffff'], ['#ffd21f', '#ff5a3c']];
    for (let i = 0; i < 10; i++) {
      const { x, z } = ringPosition(i + 0.25, 10, rnd);
      const group = new THREE.Group();
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.28, 32),
        [lambert('#ffffff'), new THREE.MeshLambertMaterial({ map: swirlTexture(palettes[i % 3]) }), new THREE.MeshLambertMaterial({ map: swirlTexture(palettes[i % 3]) })],
      );
      disc.rotation.x = Math.PI / 2;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), lambert('#fff6ea'));
      stick.position.y = -1.9;
      group.add(disc, stick);
      group.position.set(x * 0.82, 160 + rnd() * 80, z * 0.82);
      group.scale.setScalar(14 + rnd() * 10);
      group.rotation.z = (rnd() - 0.5) * 0.7;
      group.rotation.y = rnd() * Math.PI;
      this.float(group);
    }
  }

  addBalloons(rnd) {
    const mats = [['#ff3f9e', '#ffffff'], ['#ff6a3c', '#ffd21f'], ['#35c8ff', '#ffffff']]
      .map((c) => new THREE.MeshLambertMaterial({ map: stripeTexture(c, 12) }));
    const envelope = new THREE.SphereGeometry(1, 20, 16);
    const basket = new THREE.BoxGeometry(0.5, 0.42, 0.5);
    for (let i = 0; i < 12; i++) {
      const { x, z } = ringPosition(i + 0.7, 12, rnd);
      const group = new THREE.Group();
      const e = new THREE.Mesh(envelope, mats[i % mats.length]);
      e.scale.set(1, 1.25, 1);
      const b = new THREE.Mesh(basket, lambert('#2fb8a6'));
      b.position.y = -1.7;
      group.add(e, b);
      group.position.set(x * 0.62, 95 + rnd() * 90, z * 0.62);
      group.scale.setScalar(8 + rnd() * 5);
      this.float(group);
    }
  }

  update(time) {
    for (const f of this.floating) {
      f.mesh.position.y = f.y + Math.sin(time * 0.35 + f.phase) * 5;
      if (f.spin) f.mesh.rotation.y += f.spin * 0.016;
    }
  }
}
