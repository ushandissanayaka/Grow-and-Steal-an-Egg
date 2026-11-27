// Market stalls, the gift box, the fusion and Lucky Dust machines and the four leaderboards.

import * as THREE from 'three';
import { canvasTexture, drawOutlinedText, makeBillboard, FONT_UI } from '../util/canvasText.js';
import { glowMap } from './Effects.js';
import { Voxels } from '../util/bake.js';

const WOOD = '#e0a94a';
const SHOP_SCALE = 2.4;
const BULBS_PER_EDGE = 11;
const BULB_SIZE = 3.4;
const BOARD_WIDTH = 34;
const BOARD_HEIGHT = 60;
const BOARD_GLOW_MARGIN = 6;
const S = SHOP_SCALE;

// A glowing ring around a floor disc, with highlights circling it.
const ringVertex = 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uInner;
  uniform float uOuter;
  varying vec2 vP;

  void main() {
    float k = (length(vP) - uInner) / (uOuter - uInner); // 0 at the disc edge
    float edge = smoothstep(-0.06, 0.03, k) * exp(-max(k, 0.0) * 4.5);
    float sweep = pow(0.5 + 0.5 * sin(atan(vP.y, vP.x) * 3.0 - uTime * 2.4), 10.0);
    float pulse = 0.82 + 0.18 * sin(uTime * 3.0);
    float shine = edge * (pulse + sweep * 1.4);
    gl_FragColor = vec4(mix(uColor, vec3(1.0), clamp(sweep * 0.7, 0.0, 1.0)) * shine, clamp(shine, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

export function addGlowRing(scene, x, z, radius, color) {
  const inner = radius - 0.4, outer = radius + 3.5 * S;
  const uniforms = {
    uColor: { value: new THREE.Color(color) }, uTime: { value: 0 },
    uInner: { value: radius }, uOuter: { value: outer },
  };
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 64, 1),
    new THREE.ShaderMaterial({
      uniforms, vertexShader: ringVertex, fragmentShader: ringFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.18, z);
  ring.renderOrder = 2;
  scene.add(ring);
  return (time) => { uniforms.uTime.value = time; };
}

// A string of light bulbs that chase along the given points.
export function addBulbs(scene, points, colors) {
  const tints = points.map((_, i) => new THREE.Color(colors[i % colors.length]));
  const positions = new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));
  const lit = new Float32Array(points.length * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(lit, 3));
  const bulbs = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: glowMap(), size: BULB_SIZE, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(bulbs);
  return (time) => {
    tints.forEach((tint, i) => {
      const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(i * 1.3 - time * 5)) ** 3;
      lit[i * 3] = tint.r * glow;
      lit[i * 3 + 1] = tint.g * glow;
      lit[i * 3 + 2] = tint.b * glow;
    });
    geometry.attributes.color.needsUpdate = true;
  };
}

// Every shop returns an update(time) that animates its shine.
export function addStall(scene, v, physics, { x, z, name, color, fill }) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9.5 * S, 40), new THREE.MeshLambertMaterial({ color }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.12, z);
  scene.add(floor);

  const postX = 5.4 * S, postZ = 3.6 * S;
  for (const sx of [-postX, postX]) for (const sz of [-postZ, postZ]) v.box(x + sx, 0, z + sz, 0.9 * S, 8 * S, 0.9 * S, WOOD);
  v.box(x, 3 * S, z - postZ, 11 * S, 0.7 * S, 0.7 * S, WOOD);
  v.box(x, 3 * S, z + postZ, 11 * S, 0.7 * S, 0.7 * S, WOOD);

  const stripes = 7;
  const width = 12.6 * S;
  for (let i = 0; i < stripes; i++) {
    const sx = x - width / 2 + ((i + 0.5) / stripes) * width;
    v.box(sx, 8 * S, z, width / stripes, 0.9 * S, 10 * S, i % 2 ? '#ffffff' : color, { rx: 0.1 });
  }

  const label = makeBillboard([{ text: name, size: 78, fill }], 3.5 * S);
  label.position.set(x, 12.6 * S, z);
  scene.add(label);
  const half = 0.6 * S;
  for (const sx of [-postX, postX]) for (const sz of [-postZ, postZ]) physics.addBox(x + sx - half, x + sx + half, z + sz - half, z + sz + half);

  const bulbPoints = [];
  for (const edge of [-1, 1]) {
    for (let i = 0; i < BULBS_PER_EDGE; i++) {
      const bx = x - width / 2 + (i / (BULBS_PER_EDGE - 1)) * width;
      bulbPoints.push(new THREE.Vector3(bx, 7.8 * S + edge * 0.5 * S * 0.1, z + edge * 5.15 * S));
    }
  }
  const ring = addGlowRing(scene, x, z, 9.5 * S, fill);
  const bulbs = addBulbs(scene, bulbPoints, ['#fff4b8', fill]);
  return (time) => { ring(time); bulbs(time); };
}

export function addFreePad(scene, x, z) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(5.6 * S, 32), new THREE.MeshLambertMaterial({ color: '#ffd21f' }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.12, z);
  scene.add(floor);
  const label = makeBillboard([
    { text: 'FREE GIFT!', size: 78, fill: { gradient: [[0, '#fff27a'], [1, '#ffb21f']] } },
    { text: 'Step on the pad', size: 40, fill: '#ffffff' },
  ], 4.2 * S);
  label.position.set(x, 17 * S, z);
  scene.add(label);
  const gift = buildGiftBox();
  gift.position.set(x, 0.4, z);
  scene.add(gift);
  const ring = addGlowRing(scene, x, z, 5.6 * S, '#ffe33a');
  // the gift turns slowly and bounces a little, squashing as it lands; stepping on the pad claims it
  return (time) => {
    ring(time);
    gift.rotation.y = time * 0.5;
    const hop = Math.abs(Math.sin(time * 2.2));
    gift.position.y = 0.4 + hop * 1.4;
    const squash = 1 + (1 - Math.min(1, hop * 5)) * 0.08;
    gift.scale.set(squash, 1 / squash, squash);
  };
}

// Gift wrapping colours: box, lid, ribbon, ribbon shadow, dots.
export const GIFT_COLORS = {
  red: ['#e8323c', '#b8202c', '#ffd21f', '#e8a512', '#ffffff'],
  blue: ['#2f8fe8', '#1f6cc0', '#ffffff', '#d8e4f0', '#ffe14a'],
  purple: ['#9a4ae0', '#7430b8', '#7dff8a', '#4fd65e', '#ffffff'],
  green: ['#2fbf4a', '#1f8a35', '#ff4a5a', '#d62a3a', '#ffffff'],
};

// A wrapped present drawn into any voxel builder: a box, a lid that sticks out a little, polka dots,
// a ribbon cross and a bow. (x, y, z) = the middle of its bottom; k scales it (k = 1 is 7 wide).
export function giftVoxels(v, { x = 0, y = 0, z = 0, k = 1, colors = GIFT_COLORS.red } = {}) {
  const [BOX, LID, RIBBON, RIBBON_DARK, DOT] = colors;
  const b = (bx, by, bz, w, h, d, color, opts) => v.box(x + bx * k, y + by * k, z + bz * k, w * k, h * k, d * k, color, opts);
  const w = 7, h = 5.6, lid = 1.4;
  b(0, 0, 0, w, h, w, BOX);
  b(0, h, 0, w + 0.8, lid, w + 0.8, LID);
  // polka dots on the four sides
  for (const [sx, sz, ry] of [[0, 1, 0], [0, -1, 0], [1, 0, Math.PI / 2], [-1, 0, Math.PI / 2]]) {
    for (const [a, c] of [[-2.3, 1.4], [2.3, 3.8], [-2.3, 4.2], [2.3, 1]]) {
      b(sx * (w / 2 + 0.05) + (sz ? a : 0), c, sz * (w / 2 + 0.05) + (sx ? a : 0), 0.9, 0.9, 0.12, DOT, { ry });
    }
  }
  // the ribbon wraps both ways over the box and the lid
  b(0, -0.02, 0, 1.6, h + lid + 0.12, w + 0.95, RIBBON);
  b(0, -0.02, 0, w + 0.95, h + lid + 0.12, 1.6, RIBBON);
  // the bow: two loops, a knot and two tails
  const top = h + lid;
  for (const side of [-1, 1]) {
    b(side * 1.6, top, 0, 2.6, 2.2, 1.2, RIBBON, { rz: side * -0.5 });
    b(side * 1.7, top + 0.3, 0, 1.4, 1.2, 1.3, RIBBON_DARK, { rz: side * -0.5 });
    b(side * 0.9, top - 0.1, side * 1.2, 0.9, 0.3, 2.4, RIBBON, { ry: side * 0.4 });
  }
  b(0, top, 0, 1.4, 1.4, 1.5, RIBBON_DARK);
}

// The free-gift present on its pad (red, gold ribbon), as its own mesh so it can bounce.
function buildGiftBox() {
  const v = new Voxels();
  giftVoxels(v);
  const mesh = v.mesh();
  const group = new THREE.Group();
  mesh.scale.setScalar(S * 1.25);
  group.add(mesh);
  return group;
}

// The Lucky Dust machine: a big glass jar of swirling green dust on a golden base, with a
// four-leaf clover sign on top. Sparkles spin up inside the jar.
export function addLuckyDustMachine(scene, v, physics, x, z) {
  const GOLD = '#ffcf33', GOLD_DARK = '#d99a12', GREEN = '#2fbf4a', GREEN_DARK = '#1f8a35';
  v.box(x, 0, z, 13 * S, 1 * S, 13 * S, GREEN_DARK);
  v.box(x, 1 * S, z, 10 * S, 3 * S, 10 * S, GOLD);
  v.box(x, 4 * S, z, 10.6 * S, 0.6 * S, 10.6 * S, GOLD_DARK);
  // the jar: glass walls around a pile of dust
  v.box(x, 4.6 * S, z, 7.4 * S, 3.2 * S, 7.4 * S, '#7dff8a');
  v.box(x, 7.8 * S, z, 6 * S, 1.2 * S, 6 * S, '#a8ffb2');
  v.box(x, 13 * S, z, 8.4 * S, 1 * S, 8.4 * S, GOLD_DARK); // the lid
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(x + sx * 3.9 * S, 4.6 * S, z + sz * 3.9 * S, 0.6 * S, 8.4 * S, 0.6 * S, GOLD);
  // the clover on top
  const cy = 14 * S;
  for (const [dx, dy] of [[0, 1.4], [1.4, 0], [0, -1.4], [-1.4, 0]]) v.box(x + dx * S, cy + (2.2 + dy) * S, z, 2 * S, 2 * S, 0.8 * S, GREEN, { rz: Math.PI / 4 });
  v.box(x, cy, z, 0.5 * S, 2.4 * S, 0.5 * S, GREEN_DARK);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(7.6 * S, 8.4 * S, 7.6 * S),
    new THREE.MeshLambertMaterial({ color: '#d8fff0', transparent: true, opacity: 0.28, depthWrite: false }),
  );
  glass.position.set(x, 8.8 * S, z);
  scene.add(glass);

  const label = makeBillboard([{ text: 'Lucky Dust', size: 70, fill: { gradient: [[0, '#b8ff7a'], [1, '#2fd65a']] } }], 2.8 * S);
  label.position.set(x, 23 * S, z);
  scene.add(label);
  physics.addBox(x - 6.5 * S, x + 6.5 * S, z - 6.5 * S, z + 6.5 * S);

  // sparkles rising in a spiral inside the jar
  const COUNT = 40;
  const positions = new Float32Array(COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sparkles = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: glowMap(), size: 2.2, color: '#b8ff9a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(sparkles);
  const ring = addGlowRing(scene, x, z, 9 * S, '#5dff7a');
  return (time) => {
    ring(time);
    for (let i = 0; i < COUNT; i++) {
      const t = (time * 0.35 + i / COUNT) % 1;
      const a = i * 2.4 + time * 1.6;
      const r = (1.2 + (i % 5) * 0.55) * S;
      positions[i * 3] = x + Math.cos(a) * r;
      positions[i * 3 + 1] = (5.2 + t * 7.4) * S;
      positions[i * 3 + 2] = z + Math.sin(a) * r;
    }
    geometry.attributes.position.needsUpdate = true;
  };
}

export function addFusionMachine(scene, v, physics, x, z) {
  const purple = '#7b2fd6';
  v.box(x, 0, z, 14 * S, 1 * S, 12 * S, '#5a20a8');
  v.box(x, 1 * S, z, 10 * S, 8 * S, 8 * S, purple);
  v.box(x, 9 * S, z, 7 * S, 5 * S, 6 * S, '#d9f3ff');
  v.box(x, 14 * S, z, 8.4 * S, 1.4 * S, 7.4 * S, '#ff66d0');
  v.box(x, 3.4 * S, z + 4.05 * S, 3.4 * S, 4 * S, 0.2 * S, '#fff27a');
  const label = makeBillboard([{ text: 'Fusion Machine', size: 64, fill: '#c98bff' }], 2.8 * S);
  label.position.set(x, 18.6 * S, z);
  scene.add(label);
  physics.addBox(x - 7 * S, x + 7 * S, z - 6 * S, z + 6 * S);

  const ring = addGlowRing(scene, x, z, 9.4 * S, '#c98bff');
  const corners = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let y = 1.5; y < 14; y += 2.1) corners.push(new THREE.Vector3(x + sx * 5.15 * S, y * S, z + sz * 4.15 * S));
  }
  const bulbs = addBulbs(scene, corners, ['#ff8ff0', '#9fe8ff', '#fff4b8']);
  return (time) => { ring(time); bulbs(time); };
}

function boardTexture(title, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * BOARD_HEIGHT) / BOARD_WIDTH);
  const g = c.getContext('2d');
  g.fillStyle = '#030305';
  g.fillRect(0, 0, c.width, c.height);
  drawOutlinedText(g, title, c.width / 2, 74, { size: 56, fill: color, font: FONT_UI, stroke: '#000000', strokeWidth: 3 });
  g.fillStyle = color;
  g.fillRect(36, 128, c.width - 72, 4);

  const rows = 10;
  const top = 150;
  const rowH = (c.height - top - 24) / rows;
  const medals = ['#ffd24a', '#dfe5ec', '#f09a55'];
  for (let i = 0; i < rows; i++) {
    const y = top + i * rowH;
    g.fillStyle = '#0d0f15';
    g.fillRect(24, y, c.width - 48, rowH - 10);
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.lineWidth = 2;
    g.strokeRect(24, y, c.width - 48, rowH - 10);
    drawOutlinedText(g, `${i + 1}`, 72, y + (rowH - 10) / 2, { size: 40, fill: medals[i] || '#8e95a3', stroke: '#000000', strokeWidth: 2, font: FONT_UI });
  }
  return canvasTexture(c);
}

// The shining edge: a solid bright border, a soft halo on the wall around it, and
// highlights that travel around the frame. The middle of the plane is left empty.
const glowVertex = 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec2 uHalf;
  uniform float uTime;
  varying vec2 vP;

  void main() {
    vec2 q = abs(vP) - uHalf;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); // < 0 inside the board
    float border = smoothstep(-1.15, -0.95, d) * (1.0 - smoothstep(0.0, 0.12, d));
    float halo = d > 0.0 ? exp(-d * 0.75) : 0.0;
    float sweep = pow(0.5 + 0.5 * sin(atan(vP.y, vP.x) * 2.0 - uTime * 2.1), 14.0);
    float pulse = 0.88 + 0.12 * sin(uTime * 2.6);
    float shine = (border + halo * 0.75) * pulse + (border + halo * 0.4) * sweep * 1.5;
    vec3 color = mix(uColor, vec3(1.0), clamp(sweep * 0.85 + border * 0.18, 0.0, 1.0)) * shine;
    gl_FragColor = vec4(color, clamp(shine, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

// Boards hang on a wall and face into the Starting Place. Each board: { along, title, color } on a
// wall { axis: 'z' (a side wall, facing +x or -x) or 'x' (the front wall, facing +z), at: the wall's
// inner face, facing: +1 / -1 }. Over each one a little striped awning juts out at an angle, in the
// board's colour and white. baseY = the boards' bottom edge. Returns the glow uniforms (for uTime).
export function addLeaderboards(scene, v, boards, { baseY }) {
  const centerY = baseY + BOARD_HEIGHT / 2;
  return boards.map(({ along, title, color, wall }) => {
    const side = wall.axis === 'z'; // on a side wall: the board runs along z
    const out = wall.facing;        // which way the board faces (+1 / -1 along x for side walls, z for the front)
    const at = (off) => wall.at + out * off; // a distance out from the wall face
    const box = (offOut, y, alongLen, h, thick, c, opts) => (side
      ? v.box(at(offOut), y, along, thick, h, alongLen, c, opts)
      : v.box(along, y, at(offOut), alongLen, h, thick, c, opts));
    box(1, baseY - 0.6, BOARD_WIDTH + 1.2, BOARD_HEIGHT + 1.2, 1, '#050507');
    // the awning: stripes sloping down and out from the wall above the board
    const STRIPES = 7, DEPTH = 9, SLOPE = 0.38, top = baseY + BOARD_HEIGHT + 2.2;
    for (let i = 0; i < STRIPES; i++) {
      const pos = along - (BOARD_WIDTH + 4) / 2 + ((i + 0.5) / STRIPES) * (BOARD_WIDTH + 4);
      const c = i % 2 ? '#ffffff' : color;
      const len = (BOARD_WIDTH + 4) / STRIPES + 0.02;
      const y = top - Math.sin(SLOPE) * DEPTH / 2;
      if (side) v.box(at(DEPTH / 2), y, pos, DEPTH, 0.9, len, c, { rz: -out * SLOPE });
      else v.box(pos, y, at(DEPTH / 2), len, 0.9, DEPTH, c, { rx: out * SLOPE });
      // the scalloped edge hanging down at the front
      const edge = at(DEPTH * Math.cos(SLOPE) - 0.3);
      if (side) v.box(edge, y - Math.sin(SLOPE) * DEPTH / 2 - 1.4, pos, 0.6, 1.8, len, c);
      else v.box(pos, y - Math.sin(SLOPE) * DEPTH / 2 - 1.4, edge, len, 1.8, 0.6, c);
    }
    box(0.5, top + 0.4, BOARD_WIDTH + 5, 1.2, 1.2, '#5a3520'); // the rail it hangs from

    const group = new THREE.Group();
    group.position.set(side ? at(0) : along, centerY, side ? along : at(0));
    group.rotation.y = side ? (out > 0 ? Math.PI / 2 : -Math.PI / 2) : (out > 0 ? 0 : Math.PI);
    scene.add(group);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT),
      new THREE.MeshBasicMaterial({ map: boardTexture(title, color) }),
    );
    face.position.z = 1.56;
    group.add(face);
    const uniforms = {
      uColor: { value: new THREE.Color(color) },
      uHalf: { value: new THREE.Vector2(BOARD_WIDTH / 2, BOARD_HEIGHT / 2) },
      uTime: { value: 0 },
    };
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_WIDTH + BOARD_GLOW_MARGIN * 2, BOARD_HEIGHT + BOARD_GLOW_MARGIN * 2),
      new THREE.ShaderMaterial({
        uniforms, vertexShader: glowVertex, fragmentShader: glowFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    glow.position.z = 2;
    glow.renderOrder = 2;
    group.add(glow);
    return uniforms;
  });
}
