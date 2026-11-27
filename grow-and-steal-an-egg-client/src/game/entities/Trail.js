// The trail bought in the Trails Shop: a glowing ribbon streaming behind the player as they move,
// fading out at its tail. Lives in world space (added to the scene, not to the player).

import * as THREE from 'three';

const MAX_POINTS = 28;
const LIFE = 0.55;         // seconds a point of the ribbon lasts
const MIN_STEP = 0.35;     // world units moved before a new point is added
const BOTTOM = 0.5, TOP = 3.4;

export class TrailRibbon {
  constructor() {
    this.points = []; // { x, y, z, age }
    this.style = null;
    this.colors = [];
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_POINTS * 2 * 3);
    this.vertexColors = new Float32Array(MAX_POINTS * 2 * 4);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.vertexColors, 4));
    const index = [];
    for (let i = 0; i < MAX_POINTS - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;
  }

  // style: a TRAILS entry, or null for none
  setStyle(style) {
    if (style?.id === this.style?.id) return;
    this.style = style;
    this.colors = (style?.colors || []).map((c) => new THREE.Color(c));
    this.points.length = 0;
    this.mesh.visible = !!style;
  }

  update(dt, pos) {
    if (!this.style) return;
    for (const p of this.points) p.age += dt;
    while (this.points.length && this.points[0].age > LIFE) this.points.shift();
    const last = this.points[this.points.length - 1];
    if (!last || Math.hypot(pos.x - last.x, pos.z - last.z, pos.y - last.y) > MIN_STEP) {
      this.points.push({ x: pos.x, y: pos.y, z: pos.z, age: 0 });
      if (this.points.length > MAX_POINTS) this.points.shift();
    } else {
      last.x = pos.x; last.y = pos.y; last.z = pos.z; // the head follows the player
    }
    this.build();
  }

  build() {
    const n = this.points.length;
    const g = this.mesh.geometry;
    const zebra = this.style.id === 'zebra';
    for (let i = 0; i < MAX_POINTS; i++) {
      const p = this.points[Math.min(i, n - 1)] || { x: 0, y: -999, z: 0, age: LIFE };
      const k = i * 6;
      this.positions[k] = p.x; this.positions[k + 1] = p.y + BOTTOM; this.positions[k + 2] = p.z;
      this.positions[k + 3] = p.x; this.positions[k + 4] = p.y + TOP; this.positions[k + 5] = p.z;
      // colour along the ribbon (stripes for zebra, a blend for the others), fading at the tail
      // t: 0 at the tail .. 1 at the head. Clamped: the unused slots past the newest point (i >= n)
      // must not give a negative colour index (that threw every frame and froze the game).
      const t = n > 1 ? Math.min(1, i / (n - 1)) : 1;
      const count = this.colors.length;
      const c = zebra
        ? this.colors[Math.floor(i / 2) % 2]
        : this.colors[Math.max(0, Math.min(count - 1, Math.floor((1 - t) * count)))];
      const alpha = i < n ? Math.max(0, 1 - p.age / LIFE) * 0.85 * Math.min(1, t * 1.5 + 0.2) : 0;
      const ck = i * 8;
      for (const o of [0, 4]) {
        this.vertexColors[ck + o] = c.r; this.vertexColors[ck + o + 1] = c.g; this.vertexColors[ck + o + 2] = c.b;
        this.vertexColors[ck + o + 3] = o ? alpha * 0.55 : alpha; // a little lighter at the top edge
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
