// The weather around the player: snow (small blue-edged snowflakes drifting down) or a storm
// (rain streaks pouring down, lightning flashes). The server picks which, every 5 minutes; this
// only draws it. Both fade in and out over a few seconds, and they live in a box that follows the
// camera, so there is never more of it than you can see. How much falls depends on the quality tier.

import * as THREE from 'three';

const BOX = { half: 70, height: 60 };        // the box of weather around the camera
const COUNTS = {                              // snowflakes / raindrops per quality tier
  ultra: [1400, 2200], high: [1000, 1600], medium: [650, 1000], low: [300, 450],
};
const FADE = 0.35;                            // weather fades in / out at this rate per second
const SNOW_FALL = [4, 8];                     // snowflake fall speed, min / max
const RAIN_FALL = 95;
const RAIN_LEN = 3.2;

// The snowflake from the reference: white arms with a blue outline and a soft pale-blue glow.
function snowflakeTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.translate(size / 2, size / 2);
  const glow = g.createRadialGradient(0, 0, 4, 0, 0, size / 2);
  glow.addColorStop(0, 'rgba(220, 245, 255, 0.55)');
  glow.addColorStop(1, 'rgba(220, 245, 255, 0)');
  g.fillStyle = glow;
  g.fillRect(-size / 2, -size / 2, size, size);
  const arm = (width, color) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      g.save();
      g.rotate((i * Math.PI) / 3);
      g.beginPath();
      g.moveTo(0, -22); g.lineTo(0, 22);                       // the arm
      for (const s of [-1, 1]) {                               // the little V at each end
        g.moveTo(-7, s * 17); g.lineTo(0, s * 11); g.lineTo(7, s * 17);
      }
      g.stroke();
      g.restore();
    }
  };
  arm(9, '#1f6ad6');   // blue outline
  arm(4.5, '#ffffff'); // white inside
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Weather {
  constructor(scene, tier = 'high') {
    this.scene = scene;
    this.snowK = 0;   // 0..1 how much snow is showing
    this.rainK = 0;   // 0..1 how stormy it is
    this.want = 'snow';
    this.flash = 0;   // lightning brightness, 0..1
    this.nextBolt = 6;
    this.onThunder = null; // (delaySeconds, loudness) => play the thunder
    this.build(tier);
  }

  build(tier) {
    const [nSnow, nRain] = COUNTS[tier] || COUNTS.high;
    this.dispose();
    // snow: points with the snowflake picture
    this.snowPos = new Float32Array(nSnow * 3);
    this.snowSeed = new Float32Array(nSnow * 2); // fall speed, sway phase
    for (let i = 0; i < nSnow; i++) {
      this.snowPos.set([(Math.random() - 0.5) * 2 * BOX.half, Math.random() * BOX.height, (Math.random() - 0.5) * 2 * BOX.half], i * 3);
      this.snowSeed.set([SNOW_FALL[0] + Math.random() * (SNOW_FALL[1] - SNOW_FALL[0]), Math.random() * Math.PI * 2], i * 2);
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.snowMat = new THREE.PointsMaterial({
      map: snowflakeTexture(), size: 1.5, sizeAttenuation: true, transparent: true, depthWrite: false, opacity: 0, fog: true,
    });
    this.snow = new THREE.Points(snowGeo, this.snowMat);
    // rain: short slanted line streaks
    this.rainTop = new Float32Array(nRain * 3); // each drop's head, in box space
    this.rainPos = new Float32Array(nRain * 6);
    for (let i = 0; i < nRain; i++) this.rainTop.set([(Math.random() - 0.5) * 2 * BOX.half, Math.random() * BOX.height, (Math.random() - 0.5) * 2 * BOX.half], i * 3);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.rainMat = new THREE.LineBasicMaterial({ color: '#b8c8e0', transparent: true, opacity: 0, depthWrite: false, fog: true });
    this.rain = new THREE.LineSegments(rainGeo, this.rainMat);
    for (const o of [this.snow, this.rain]) {
      o.frustumCulled = false;
      o.visible = false;
      this.scene.add(o);
    }
    this.tier = tier;
  }

  setTier(tier) {
    if (tier !== this.tier) this.build(tier);
  }

  set(kind) {
    this.want = kind === 'rain' || kind === 'day' ? kind : 'snow'; // a sunny day: neither
  }

  update(dt, camera) {
    const fade = Math.min(1, dt * FADE);
    this.snowK += ((this.want === 'snow' ? 1 : 0) - this.snowK) * fade * 3;
    this.rainK += ((this.want === 'rain' ? 1 : 0) - this.rainK) * fade * 3;
    if (this.snowK < 0.01) this.snowK = this.want === 'snow' ? this.snowK : 0;
    if (this.rainK < 0.01) this.rainK = this.want === 'rain' ? this.rainK : 0;
    const c = camera.position;
    const wrap = (v, half) => ((((v + half) % (half * 2)) + half * 2) % (half * 2)) - half;

    // snow
    this.snow.visible = this.snowK > 0.01;
    if (this.snow.visible) {
      this.snowMat.opacity = this.snowK;
      const t = performance.now() / 1000;
      const p = this.snowPos;
      for (let i = 0, n = p.length / 3; i < n; i++) {
        const k = i * 3;
        p[k + 1] -= this.snowSeed[i * 2] * dt;
        p[k] += Math.sin(t * 0.9 + this.snowSeed[i * 2 + 1]) * 1.2 * dt;
        if (p[k + 1] < 0) p[k + 1] += BOX.height;
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
      // the box follows the camera: points are stored relative to it and wrapped round
      this.snow.position.set(c.x - wrap(c.x, BOX.half), Math.max(0, c.y - BOX.height * 0.45), c.z - wrap(c.z, BOX.half));
      this.shift(this.snow, p, c);
    }

    // rain
    this.rain.visible = this.rainK > 0.01;
    if (this.rain.visible) {
      this.rainMat.opacity = 0.55 * this.rainK;
      const top = this.rainTop;
      const out = this.rainPos;
      const ox = c.x, oz = c.z, base = Math.max(0, c.y - BOX.height * 0.45);
      for (let i = 0, n = top.length / 3; i < n; i++) {
        const k = i * 3;
        top[k + 1] -= RAIN_FALL * dt;
        if (top[k + 1] < 0) {
          top[k + 1] += BOX.height;
          top[k] = (Math.random() - 0.5) * 2 * BOX.half;
          top[k + 2] = (Math.random() - 0.5) * 2 * BOX.half;
        }
        const x = ox + top[k], y = base + top[k + 1], z = oz + top[k + 2];
        out.set([x, y, z, x + 0.5, y + RAIN_LEN, z + 0.2], i * 6);
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // lightning: now and then while it storms; the thunder follows a moment later
    this.flash = Math.max(0, this.flash - dt * 2.8);
    if (this.boltSteps?.length && performance.now() >= this.boltSteps[0][0]) this.flash = Math.max(this.flash, this.boltSteps.shift()[1]);
    if (this.rainK > 0.8) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 7 + Math.random() * 12;
        const now = performance.now();
        this.flash = 1;
        this.boltSteps = [[now + 120, 0.45], [now + 220, 0.9]]; // the flicker of a real bolt
        const far = Math.random();
        this.onThunder?.(0.3 + far * 1.6, 1 - far * 0.55);
      }
    } else this.nextBolt = 4 + Math.random() * 4;
  }

  // Snowflakes are stored relative to a box that only moves in whole box steps, so as the camera
  // moves they wrap round its edges instead of all sliding with it.
  shift(points, p, c) {
    const bx = points.position.x, bz = points.position.z;
    for (let i = 0, n = p.length / 3; i < n; i++) {
      const k = i * 3;
      const wx = bx + p[k], wz = bz + p[k + 2];
      if (wx < c.x - BOX.half) p[k] += BOX.half * 2; else if (wx > c.x + BOX.half) p[k] -= BOX.half * 2;
      if (wz < c.z - BOX.half) p[k + 2] += BOX.half * 2; else if (wz > c.z + BOX.half) p[k + 2] -= BOX.half * 2;
    }
  }

  dispose() {
    for (const o of [this.snow, this.rain]) {
      if (!o) continue;
      this.scene.remove(o);
      o.geometry.dispose();
      o.material.map?.dispose();
      o.material.dispose();
    }
  }
}
