// Soft, shaded smoke rising from the machine chimneys. Every puff is a camera-facing quad in one
// instanced draw call, sorted back to front so overlapping puffs blend correctly.

import * as THREE from 'three';

const PUFFS_PER_EMITTER = 36;
const PREWARM_SECONDS = 6;
const WIND = new THREE.Vector3(2.2, 0, -1.1);
const _forward = new THREE.Vector3();

const vertexShader = /* glsl */ `
  attribute vec3 iOffset;
  attribute vec4 iData; // size, opacity, rotation, brightness
  varying vec2 vUv;
  varying vec2 vTurn;
  varying float vOpacity;
  varying float vBright;

  void main() {
    vUv = uv;
    vTurn = vec2(cos(iData.z), sin(iData.z));
    vOpacity = iData.y;
    vBright = iData.w;
    vec4 view = viewMatrix * vec4(iOffset, 1.0);
    view.xy += position.xy * iData.x;
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec2 vTurn;
  varying float vOpacity;
  varying float vBright;

  void main() {
    // spin only the puff's shape; the light keeps coming from above
    vec2 c = vUv - 0.5;
    vec2 turned = vec2(c.x * vTurn.x - c.y * vTurn.y, c.x * vTurn.y + c.y * vTurn.x) + 0.5;
    vec4 puff = texture2D(uMap, turned);
    float lit = smoothstep(0.08, 0.95, vUv.y * 0.72 + puff.r * 0.42);
    // white smoke with ash-grey shadows (linear values: ~#8a8c90 in the shade, near-white where lit)
    vec3 color = mix(vec3(0.25, 0.255, 0.27), vec3(0.94, 0.94, 0.95), lit) * vBright;
    gl_FragColor = vec4(color, puff.a * vOpacity);
    if (gl_FragColor.a < 0.003) discard;
    #include <colorspace_fragment>
  }
`;

// A billowy cloud shape: many soft lobes inside a circle, each with its own lightness.
function puffTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  let seed = 4711;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 90; i++) {
    const angle = rnd() * Math.PI * 2;
    const distance = Math.sqrt(rnd()) * size * 0.27;
    const x = size / 2 + Math.cos(angle) * distance;
    const y = size / 2 + Math.sin(angle) * distance;
    const radius = size * (0.07 + rnd() * 0.14);
    const shade = Math.round(120 + rnd() * 135);
    const lobe = g.createRadialGradient(x, y, 0, x, y, radius);
    lobe.addColorStop(0, `rgba(${shade},${shade},${shade},0.34)`);
    lobe.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
    g.fillStyle = lobe;
    g.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export class SmokeSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
    this.puffs = [];
    this.time = 0;
  }

  // energy (0..1) makes the emitter's new puffs thicker and faster.
  addEmitter(x, y, z) {
    const emitter = { position: new THREE.Vector3(x, y, z), energy: 0 };
    this.emitters.push(emitter);
    for (let i = 0; i < PUFFS_PER_EMITTER; i++) {
      const puff = { emitter, position: new THREE.Vector3() };
      this.reset(puff);
      puff.age = Math.random() * puff.life;
      this.puffs.push(puff);
    }
    return emitter;
  }

  reset(puff) {
    puff.position.copy(puff.emitter.position);
    puff.position.x += (Math.random() - 0.5) * 0.7;
    puff.position.z += (Math.random() - 0.5) * 0.7;
    puff.age = 0;
    puff.life = 3.6 + Math.random() * 2.4;
    puff.boost = puff.emitter.energy;
    puff.startSize = 3.2 + Math.random() * 1.4;
    puff.endSize = 20 + Math.random() * 11;
    puff.rise = 8 + Math.random() * 4;
    puff.rotation = Math.random() * Math.PI * 2;
    puff.spin = (Math.random() - 0.5) * 0.7;
    puff.seed = Math.random() * 100;
  }

  // Call once after every emitter is added.
  build() {
    const count = this.puffs.length;
    const plane = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = plane.index;
    geometry.setAttribute('position', plane.getAttribute('position'));
    geometry.setAttribute('uv', plane.getAttribute('uv'));
    geometry.instanceCount = count;

    this.offsets = new Float32Array(count * 3);
    this.data = new Float32Array(count * 4);
    this.offsetAttribute = new THREE.InstancedBufferAttribute(this.offsets, 3).setUsage(THREE.DynamicDrawUsage);
    this.dataAttribute = new THREE.InstancedBufferAttribute(this.data, 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('iOffset', this.offsetAttribute);
    geometry.setAttribute('iData', this.dataAttribute);

    const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms: { uMap: { value: puffTexture() } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    }));
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    this.scene.add(mesh);
    this.mesh = mesh;

    // start with full plumes rather than every chimney beginning at once
    for (let t = 0; t < PREWARM_SECONDS; t += 0.1) this.simulate(0.1);
  }

  simulate(dt) {
    this.time += dt;
    for (const puff of this.puffs) {
      puff.age += dt;
      if (puff.age >= puff.life) this.reset(puff);
      const k = puff.age / puff.life;
      const lift = puff.rise * (1 + puff.boost * 0.5) * (1 - k * 0.62);
      const swirl = 0.6 + k * 2.2; // billows more the higher it gets
      puff.position.x += (WIND.x * k + Math.sin(this.time * 1.3 + puff.seed) * swirl) * dt;
      puff.position.y += lift * dt;
      puff.position.z += (WIND.z * k + Math.cos(this.time * 1.1 + puff.seed * 1.7) * swirl) * dt;
      puff.rotation += puff.spin * dt;
    }
  }

  update(dt, camera) {
    this.simulate(dt);
    camera.getWorldDirection(_forward);
    for (const puff of this.puffs) {
      puff.depth = _forward.x * (puff.position.x - camera.position.x)
        + _forward.y * (puff.position.y - camera.position.y)
        + _forward.z * (puff.position.z - camera.position.z);
    }
    this.puffs.sort((a, b) => b.depth - a.depth);

    this.puffs.forEach((puff, i) => {
      const k = puff.age / puff.life;
      const grow = 1 - (1 - k) * (1 - k);
      const size = (puff.startSize + (puff.endSize - puff.startSize) * grow) * (1 + puff.boost * 0.35);
      const fadeIn = Math.min(1, k / 0.07);
      const opacity = Math.min(1, fadeIn * (1 - k) ** 1.1 * (0.85 + puff.boost * 0.25));
      // sooty near the chimney, paler as it spreads
      const bright = (0.66 + k * 0.34) * (1 - puff.boost * 0.14);

      this.offsets.set([puff.position.x, puff.position.y, puff.position.z], i * 3);
      this.data.set([size, opacity, puff.rotation, bright], i * 4);
    });
    this.offsetAttribute.needsUpdate = true;
    this.dataAttribute.needsUpdate = true;
  }
}
