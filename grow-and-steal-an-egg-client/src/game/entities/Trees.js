// Choppable block trees. Every hit cuts deeper into the trunk and the tree leans further; at 0 HP
// it topples, the leaves burst off and the bare trunk lies on the ground until the tree grows back.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { treeHp } from '../../shared/gameData.js';
import { MagicDust, glowMap } from './Effects.js';

// The shine of the giant trees, by forest.
const GIANT_GLOW = {
  sakura: '#ff6ad5', snow: '#7fe8ff', water: '#5fd6ff', volcano: '#ffb21f', heaven: '#fff3b0', candy: '#ff7ae0', mushroom: '#7fffe0', galaxy: '#c86aff',
};

const LOOK = {
  // stage 1: a short dark-maroon trunk with a big chunky top of green cubes
  blocky: { trunk: '#6b1f2e', leaves: ['#4caf50', '#5cbf4a', '#43a047', '#66c254'], blocky: true },
  // stage 2: an acacia: thin bent trunk and wide flat layers of leaves
  acacia: { trunk: '#7a4a2a', leaves: ['#8ccf4a', '#7cc23e', '#9ad858'], acacia: true },
  // stage 3: the chunky tree with thick snow lying on top
  snowBlocky: { trunk: '#6b1f2e', leaves: ['#4caf50', '#43a047', '#5cbf4a'], blocky: true, snowCap: '#ffffff' },
  // stage 4: big branching coral instead of trees
  coral: { trunk: '#ff5fa8', leaves: ['#ff5fa8', '#ff8a3a', '#c46bff', '#ff4a6a'], coral: true },
  // stage 5: chunky purple candy trees
  // stage 6: a dead black tree, a crooked trunk with a few bare branches
  deadTree: { trunk: '#1e1a22', leaves: ['#2a2430'], dead: true },
  // stage 8: tall green bamboo stalks
  // stage 9: a tall cactus with arms bending up
  // the final stage: tall obsidian pillars, black with glowing purple veins
  obsidian: { trunk: '#1a1224', leaves: ['#b04aff', '#8a2ae0'], obsidian: true },
  cactus: { trunk: '#3f9a3a', leaves: ['#4aa83f', '#ff7aa8'], cactus: true },
  bamboo: { trunk: '#5fbf3a', leaves: ['#7fd84a', '#4aa82a'], bamboo: true },
  candyBlocky: { trunk: '#5a2a3a', leaves: ['#7a3ac8', '#8a4ad8', '#6a2ab8'], blocky: true },
  oak: { trunk: '#7c3d24', leaves: ['#3fbf2c', '#55d134', '#2fa828', '#74dc3c'] },
  birch: { trunk: '#c4c4c0', leaves: ['#b6e640', '#9fd936', '#caed55'], bark: '#3a3a3a' },
  maple: { trunk: '#55261b', leaves: ['#e8332f', '#f2682c', '#f9a52f', '#ffd93b', '#ee2a6c'] },
  sakura: { trunk: '#4a2226', leaves: ['#ffb7dc', '#ff9ccd', '#ffd0e8', '#f88cc0'] },
  // Volcano: black trunks, dark rock canopies cracked with glowing lava
  lavatree: { trunk: '#26262c', leaves: ['#3a2626', '#5a1e1e', '#46464e', '#2e2e34'], lava: ['#ffb21f', '#ff6a1a', '#ffd84a'] },
  // Heaven: white marble trunks with big golden canopies
  goldtree: { trunk: '#f2f2f6', leaves: ['#ffd21f', '#ffe066', '#f2b21f', '#fff0a0', '#ffc83a'] },
  // Candy Land: candy-cane trunks (red with white rings) and fluffy cotton-candy tops
  candytree: { trunk: '#ff3b5c', ring: '#ffffff', leaves: ['#ffb3e0', '#b3e0ff', '#e0b3ff', '#ffd1ec', '#c8f0ff'] },
  // Glow Mushroom Grove: giant mushrooms with spotted caps and a glowing underside
  mushroom: { trunk: '#f2ead8', leaves: ['#e8293c', '#3a6aff', '#b84aff'], mushroom: true, glow: ['#7fffe0', '#a8ffef'] },
  // Galaxy: dark trees whose canopies are dotted with glowing nebula patches
  galaxytree: { trunk: '#1a1630', leaves: ['#2a1a5a', '#3a2a7a', '#1a2a6a', '#4a2a8a'], lava: ['#ff7ae0', '#7fe8ff', '#ffffff', '#c86aff'] },
  pine: { trunk: '#7a3420', leaves: ['#1f7a45', '#25864d', '#2a9356'], snow: '#f6f2ff', pine: true },
  // the Water forest: palms with long ice-blue fronds, white tips and pale shells
  seapalm: {
    trunk: '#c08a52', ring: '#9a6a3a', leaves: ['#8fd6ff', '#6fc4f5', '#b8e6ff'], snow: '#eef9ff', nut: '#d8eefc', palm: true,
  },
  coconut: {
    trunk: '#a8865a', ring: '#7d5f3c', leaves: ['#2e9e4f', '#37b35a', '#258a43'], snow: '#f4f9ff', nut: '#6b4423', palm: true,
  },
};
const GLOW_COLOR = '#3dff6a';

const CUT_Y = 2.6;      // height of the cut; below it is the stump
const LEAN_MAX = 0.09;  // how far the tree leans when it is almost cut through (rad)
const FALL_SECONDS = 1.15;
const GROW_SECONDS = 0.7;
const SHAKE_SECONDS = 0.18;
const CUT_COLOR = '#f0d29a';

function seeded(text) {
  let s = [...text].reduce((a, c) => a * 31 + c.charCodeAt(0), 11) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// The Ice Forest's coconut palm: long fronds spread out wide from the top of the tall trunk,
// arching up and then drooping, with snow along their tops and coconuts under them.
const FROND_SEGMENTS = [ // [length, pitch (rad, + is up), width]
  [5, 0.4, 3.4], [5, 0.08, 3.2], [5, -0.3, 2.7], [4.5, -0.7, 2.1], [3.5, -1.05, 1.4],
];
function buildPalmCanopy(v, look, rnd, height) {
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rnd() * 0.35;
    const lift = (rnd() - 0.5) * 0.25; // not every frond at the same angle
    const color = look.leaves[i % look.leaves.length];
    let x = Math.cos(a) * 0.8, y = height + 0.6, z = Math.sin(a) * 0.8;
    FROND_SEGMENTS.forEach(([length, pitch, width], k) => {
      const p = pitch + lift;
      const dx = Math.cos(a) * Math.cos(p), dy = Math.sin(p), dz = Math.sin(a) * Math.cos(p);
      const cx = x + dx * length / 2, cy = y + dy * length / 2, cz = z + dz * length / 2;
      const turn = { ry: -a, rz: p };
      v.box(cx, cy - 0.3, cz, length + 0.4, 0.6, width, color, turn);
      if (k < 3) v.box(cx, cy + 0.15, cz, length * 0.8, 0.4, width * 0.55, look.snow, turn);
      x += dx * length;
      y += dy * length;
      z += dz * length;
    });
  }
  v.box(0, height - 0.6, 0, 4.2, 2.6, 4.2, look.leaves[0], { ry: 0.4 }); // where the fronds meet
  v.box(0, height + 1.6, 0, 2.6, 1, 2.6, look.snow, { ry: 0.4 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    v.box(Math.cos(a) * 1.9, height - 2.6 - rnd() * 0.8, Math.sin(a) * 1.9, 1.7, 1.7, 1.7, look.nut, { ry: rnd() });
  }
}

// The Ice Forest's snow pine: stacked square tiers, each a little smaller and turned, the sides
// sloping down like branches, with a thick cap of snow on every tier.
function buildPineCanopy(v, look, rnd, height) {
  const tiers = 5;
  let y = height * 0.28;
  const top = height + 6;
  const step = (top - y) / tiers;
  for (let i = 0; i < tiers; i++) {
    const size = 24 - i * 3.8;
    const turn = (i % 2 ? Math.PI / 4 : 0) + (rnd() - 0.5) * 0.25;
    const green = look.leaves[i % look.leaves.length];
    v.box(0, y, 0, size, step * 0.7, size, green, { ry: turn });
    // the drooping edges: four sloped boards hanging down from each side
    for (let s = 0; s < 4; s++) {
      const a = turn + (s * Math.PI) / 2;
      const out = size / 2 + 0.4;
      v.box(Math.cos(a) * out, y - 1.2, -Math.sin(a) * out, 2.4, step * 0.55, size * 0.92, green, { ry: a, rz: 0.55 });
    }
    v.box(0, y + step * 0.7, 0, size * 0.78, 1.3, size * 0.78, look.snow, { ry: turn });
    v.box(0, y + step * 0.7 + 1.3, 0, size * 0.5, 0.7, size * 0.5, look.snow, { ry: turn + 0.2 });
    y += step;
  }
  v.box(0, y, 0, 3.4, 3.2, 3.4, look.snow, { ry: 0.4 });
}

// Big blocks of dark rock, some faces cracked open with bright lava (drawn unlit so they glow).
const lavaMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
function buildLavaCanopy(v, glow, look, rnd, height) {
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  for (let i = 0; i < 9; i++) {
    const size = 10 + rnd() * 8;
    const a = rnd() * Math.PI * 2;
    const r = i === 0 ? 0 : 3.5 + rnd() * 6;
    const x = Math.cos(a) * r, y = height - 3 + rnd() * 6, z = Math.sin(a) * r;
    const turn = { rx: (rnd() - 0.5) * 0.6, ry: rnd() * 1.5, rz: (rnd() - 0.5) * 0.6 };
    v.box(x, y, z, size, size, size, pick(look.leaves), turn);
    if (rnd() < 0.75) {
      // a lava crack on one side face of the block: a bright slab sitting just proud of it
      const side = rnd() < 0.5 ? 1 : -1;
      const w = size * (0.35 + rnd() * 0.3);
      const ca = Math.cos(turn.ry), sa = Math.sin(turn.ry);
      const out = size / 2 + 0.15;
      glow.box(x + side * ca * out, y + size * (0.2 + rnd() * 0.4), z - side * sa * out, 0.3, w * 0.8, w, pick(look.lava), turn);
    }
  }
}

// A giant mushroom: a wide domed cap in tiers with white spots on top and a glowing ring of gills
// underneath (drawn unlit so it glows).
function buildMushroomCanopy(v, glow, look, rnd, height) {
  const cap = look.leaves[Math.floor(rnd() * look.leaves.length)];
  const turn = rnd();
  const tiers = [[32, 3.2], [27, 3], [20, 2.8], [11, 2.2]];
  let y = height - 1.5;
  tiers.forEach(([size, h], i) => {
    v.box(0, y, 0, size, h, size, cap, { ry: turn + i * 0.39 });
    if (i < 3) {
      // white spots on the step of this tier
      for (let s = 0; s < 4; s++) {
        const a = turn + i * 0.39 + (s / 4) * Math.PI * 2 + 0.4;
        const r = size * 0.36;
        v.box(Math.cos(a) * r, y + h - 0.2, Math.sin(a) * r, 2.6, 0.5, 2.6, '#ffffff', { ry: a });
      }
    }
    y += h;
  });
  v.box(0, y - 0.2, 0, 3, 0.5, 3, '#ffffff');
  glow.box(0, height - 2, 0, 28, 0.5, 28, look.glow[0], { ry: turn });          // the glowing gills
  glow.box(0, height - 2.3, 0, 12, 0.5, 12, look.glow[1], { ry: turn + 0.4 });
}

function buildLeafCanopy(v, look, rnd, height, scale = 1) {
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const blobs = 10;
  for (let i = 0; i < blobs; i++) {
    const size = (10 + rnd() * 7) * scale;
    const a = rnd() * Math.PI * 2;
    const r = i === 0 ? 0 : (3.5 + rnd() * 6) * scale;
    v.box(Math.cos(a) * r, height - 3 + rnd() * 5, Math.sin(a) * r, size, size, size, pick(look.leaves), {
      rx: (rnd() - 0.5) * 0.7, ry: rnd() * 1.5, rz: (rnd() - 0.5) * 0.7,
    });
  }
}

// A small cube with rounded-off edges: three crossing boxes, each a little shorter on two sides.
function roundCube(v, x, y, z, s, color, ry = 0) {
  const r = s * 0.2;
  v.box(x, y + r, z, s, s - r * 2, s - r * 2, color, { ry });
  v.box(x, y + r, z, s - r * 2, s - r * 2, s, color, { ry });
  v.box(x, y, z, s - r * 2, s, s - r * 2, color, { ry });
}

// The first two biomes' trees: a tall, round canopy made of many small rounded cubes in a few
// shades, packed into a rounded dome shape (only the outer layer is built: the inside is never seen).
const ROUND_TREES = new Set(['oak', 'birch', 'maple']);
const ROUND_CUBE = 3.6;
function buildRoundCanopy(v, look, rnd, height) {
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const R = 11, top = 10, bottom = -7; // the dome: radius across, and how far it reaches above / below `height`
  for (let y = bottom; y <= top; y += ROUND_CUBE * 0.85) {
    for (let x = -R; x <= R; x += ROUND_CUBE * 0.85) {
      for (let z = -R; z <= R; z += ROUND_CUBE * 0.85) {
        const ky = y > 0 ? y / top : y / bottom;
        const d = Math.hypot(x / R, z / R, ky);
        if (d > 1 || d < 0.72) continue;        // outside the dome, or hidden inside it
        if (d > 0.9 && rnd() < 0.3) continue;   // a bumpy, uneven outline
        const s = ROUND_CUBE * (0.85 + rnd() * 0.35);
        roundCube(v, x + (rnd() - 0.5), height + y, z + (rnd() - 0.5), s, pick(look.leaves), rnd() * 0.6);
      }
    }
  }
}

// The tree in three parts: the stump (stays), and the trunk and leaves above the cut (fall).
// The trunk and leaves are built relative to the cut, so they turn around it when the tree falls.
function buildTree(tree) {
  const look = LOOK[tree.type];
  const rnd = seeded(tree.id);
  const palm = !!look.palm;
  const pine = !!look.pine;
  const trunkW = tree.type === 'birch' ? 3 : palm ? 2.8 : pine ? 3.4 : look.lava ? 4.6 : look.mushroom ? 5.4 : 4;
  const round = ROUND_TREES.has(tree.type);
  // the same for every tree of a stage; the stage scales it (the first two biomes' trees are taller)
  const trunkH = palm ? 38 : pine ? 30 : look.lava ? 30 : look.mushroom ? 24 : round ? 50 : 35;
  const above = trunkH - CUT_Y;

  const stump = new Voxels();
  stump.box(0, 0, 0, trunkW + 2.2, 0.8, trunkW + 2.2, look.trunk); // roots
  stump.box(0, 0, 0, trunkW, CUT_Y, trunkW, look.trunk);

  const trunk = new Voxels();
  trunk.box(0, 0, 0, trunkW, above, trunkW, look.trunk);
  if (look.bark) {
    for (let y = 1; y < above - 1; y += 2.6) trunk.box(rnd() < 0.5 ? -0.6 : 0.6, y, trunkW / 2, 1.2, 0.45, 0.15, look.bark);
  }
  if (look.ring) {
    // the palm trunk's rings
    for (let y = 1.4; y < above - 1; y += 2.4) trunk.box(0, y, 0, trunkW + 0.5, 0.55, trunkW + 0.5, look.ring);
  }
  trunk.box(0, -0.02, 0, trunkW * 0.8, 0.12, trunkW * 0.8, CUT_COLOR); // the cut end, seen once it falls

  const canopy = new Voxels();
  const glow = new Voxels(); // unlit parts (lava) that seem to glow
  if (palm) buildPalmCanopy(canopy, look, rnd, above);
  else if (pine) buildPineCanopy(canopy, look, rnd, above);
  else if (look.lava) buildLavaCanopy(canopy, glow, look, rnd, above);
  else if (look.mushroom) buildMushroomCanopy(canopy, glow, look, rnd, above);
  else if (round) buildRoundCanopy(canopy, look, rnd, above);
  else buildLeafCanopy(canopy, look, rnd, above, tree.type === 'goldtree' ? 1.35 : tree.type === 'candytree' ? 1.3 : 1);

  const canopyMesh = canopy.mesh();
  if (look.lava || look.mushroom) canopyMesh.add(new THREE.Mesh(glow.geometry(), lavaMaterial)); // falls and hides with the leaves
  return { stump: stump.mesh(), trunk: trunk.mesh(), canopy: canopyMesh, trunkW, trunkH, side: rnd() < 0.5 ? -1 : 1 };
}

// A scenery tree (not hit or grown: the giant eggs are what players hit) drawn straight into the
// world's voxel builders at (x, z), `scale` times its normal size. glowTarget takes the unlit parts.
// Stage 1's chunky tree top: a few big cubes clustered round the trunk's top.
function buildBlockyCanopy(v, look, rnd, height) {
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  v.box(0, height - 4, 0, 16, 12, 16, pick(look.leaves), { ry: rnd() * 0.4 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd() * 0.6;
    const s = 9 + rnd() * 4;
    v.box(Math.cos(a) * 7, height - 6 + rnd() * 6, Math.sin(a) * 7, s, s, s, pick(look.leaves), { ry: rnd() * 0.5 });
  }
  v.box(rnd() * 2 - 1, height + 7, rnd() * 2 - 1, 10, 7, 10, pick(look.leaves), { ry: rnd() * 0.5 });
  if (look.snowCap) {
    v.box(0, height + 2, 0, 16.6, 1.6, 16.6, look.snowCap);
    v.box(0, height + 14, 0, 10.6, 1.4, 10.6, look.snowCap);
  }
}

// The final stage's obsidian pillar: stacked dark blocks, a little off-centre, with purple veins
// glowing in the cracks (drawn unlit) and a crystal on top.
function buildObsidian(v, glow, look, rnd, height) {
  let y = -height;
  while (y < 0) {
    const h = 3 + rnd() * 4, w = 5.4 - (y + height) / height * 1.6;
    v.box((rnd() - 0.5) * 0.8, y, (rnd() - 0.5) * 0.8, w, h, w, rnd() < 0.5 ? '#1a1224' : '#241634');
    if (rnd() < 0.6) glow.box(0, y + h - 0.3, w / 2 + 0.01, w * 0.7, 0.4, 0.1, look.leaves[Math.floor(rnd() * 2)]);
    y += h;
  }
  glow.box(0, 0, 0, 1.6, 4, 1.6, look.leaves[0], { ry: 0.6 });
}

// Stage 9's cactus: arms that stick out sideways from the trunk and then turn straight up, with
// darker ribs and a pink flower on top.
function buildCactus(v, look, rnd, height) {
  for (let y = -height; y < 0; y += 3) v.box(0, y, 1.71, 0.4, 2, 0.1, '#2f7a2a');      // ribs on the trunk
  const arms = rnd() < 0.5 ? [-1, 1] : [rnd() < 0.5 ? -1 : 1];
  for (const side of arms) {
    const y = -height * (0.45 + rnd() * 0.25), out = 4 + rnd() * 1.5, up = 5 + rnd() * 5;
    v.box(side * out / 2, y, 0, out, 2.6, 2.6, look.trunk);                        // out to the side
    v.box(side * out, y, 0, 2.6, up, 2.6, look.trunk);                             // then up
  }
  v.box(0, 0, 0, 3.6, 1.4, 3.6, look.trunk);                                       // rounded top
  v.box(0, 1.4, 0, 1.6, 1, 1.6, look.leaves[1]);                                   // a flower
}

// Stage 6's dead tree: bare crooked branches sticking up and out from the top of the trunk.
function buildDeadTree(v, look, rnd, height) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rnd() * 0.8, lean = 0.4 + rnd() * 0.4, len = 6 + rnd() * 5;
    const dx = Math.sin(lean) * Math.cos(a), dy = Math.cos(lean), dz = Math.sin(lean) * Math.sin(a);
    const y0 = height - 6 + rnd() * 4;
    v.box(dx * len / 2, y0 + dy * len / 2 - len / 2, dz * len / 2, 1.6, len, 1.6, look.trunk, { ry: -a, rz: -lean });
  }
}

// Stage 8's bamboo: a few tall jointed stalks with small leaves near the top.
function buildBamboo(v, look, rnd, height) {
  for (let i = 0; i < 4; i++) {
    const x = (rnd() - 0.5) * 6, z = (rnd() - 0.5) * 6, h = height * (0.8 + rnd() * 0.5);
    for (let y = -2.6; y < h; y += 4) {
      v.box(x, y, z, 1.4, 3.7, 1.4, look.trunk);
      v.box(x, y + 3.7, z, 1.7, 0.3, 1.7, look.leaves[1]); // the joint ring
    }
    for (let k = 0; k < 3; k++) v.box(x + (rnd() - 0.5) * 3, h - k * 3, z + (rnd() - 0.5) * 3, 3, 0.3, 1, look.leaves[0], { ry: rnd() * 3, rz: 0.4 });
  }
}

// Stage 4's coral: a stubby base with branches fanning up and out, each ending in a rounded tip.
function buildCoral(v, look, rnd, height) {
  v.box(0, 0, 0, 5, 3, 5, look.leaves[0]);
  const color = look.leaves[Math.floor(rnd() * look.leaves.length)];
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
    const lean = 0.35 + rnd() * 0.4, len = height * (0.6 + rnd() * 0.5);
    // the branch leans out along (sin(lean)cos(a), cos(lean), sin(lean)sin(a)); a box turns round its
    // middle, so its middle is put half a length out from the base and its bottom end sits on the base
    const dx = Math.sin(lean) * Math.cos(a), dy = Math.cos(lean), dz = Math.sin(lean) * Math.sin(a);
    const baseY = 2;
    v.box(dx * len / 2, baseY + dy * len / 2 - len / 2, dz * len / 2, 2.6, len, 2.6, color, { ry: -a, rz: -lean });
    v.box(dx * len, baseY + dy * len - 1.8, dz * len, 3.6, 3.6, 3.6, color, { ry: rnd() }); // a rounded tip
  }
}

// Stage 2's acacia top: two or three wide, thin, flat layers, offset a little.
function buildAcaciaCanopy(v, look, rnd, height) {
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  v.box(0, height - 1, 0, 26, 3, 20, pick(look.leaves), { ry: rnd() * 1.5 });
  v.box(3 - rnd() * 6, height + 2, 3 - rnd() * 6, 18, 2.6, 14, pick(look.leaves), { ry: rnd() * 1.5 });
  if (rnd() < 0.6) v.box(-6 + rnd() * 12, height - 2.5, -6 + rnd() * 12, 12, 2.4, 10, pick(look.leaves), { ry: rnd() * 1.5 });
}

export function addDecorTree(target, glowTarget, type, x, z, scale, id) {
  const look = LOOK[type];
  const rnd = seeded(id);
  const at = (t, oy) => ({ box: (bx, by, bz, w, h, d, color, opts) => t.box(x + bx * scale, oy + by * scale, z + bz * scale, w * scale, h * scale, d * scale, color, opts) });
  const v = at(target, 0);
  const palm = !!look.palm, pine = !!look.pine, round = ROUND_TREES.has(type);
  const trunkW = type === 'birch' ? 3 : palm ? 2.8 : pine ? 3.4 : look.lava ? 4.6 : look.mushroom ? 5.4 : look.acacia ? 2.4 : look.blocky ? 4.4 : look.coral ? 4 : look.dead ? 3 : look.bamboo ? 0.1 : look.cactus ? 3.4 : look.obsidian ? 0.1 : 4;
  const trunkH = palm ? 38 : pine ? 30 : look.lava ? 30 : look.mushroom ? 24 : look.blocky ? 22 : look.acacia ? 26 : look.coral ? 4 : look.dead ? 28 : look.bamboo ? 0.1 : look.cactus ? 20 : look.obsidian ? 30 : round ? 50 : 35;
  v.box(0, 0, 0, trunkW + 2.2, 0.8, trunkW + 2.2, look.trunk); // roots
  if (look.acacia) {
    // a straight trunk, then two branches that start at its top and spread outwards going up (a Y).
    // A box turns round its middle, so each branch is placed so that its BOTTOM end sits on the trunk.
    const fork = trunkH * 0.5;
    v.box(0, 0, 0, trunkW, fork + 0.6, trunkW, look.trunk);
    const branch = (lean, length, width) => {
      const cx = Math.sin(lean) * length / 2, cy = fork + Math.cos(lean) * length / 2; // the branch's middle
      v.box(cx, cy - length / 2, 0, width, length, width, look.trunk, { rz: -lean }); // lean > 0: top goes to +x
    };
    branch(-0.5, trunkH * 0.6, trunkW * 0.8);
    branch(0.55, trunkH * 0.55, trunkW * 0.7);
  } else v.box(0, 0, 0, trunkW, trunkH, trunkW, look.trunk);
  if (look.bark) for (let y = 3; y < trunkH - 1; y += 2.6) v.box(rnd() < 0.5 ? -0.6 : 0.6, y, trunkW / 2, 1.2, 0.45, 0.15, look.bark);
  if (look.ring) for (let y = 3; y < trunkH - 1; y += 2.4) v.box(0, y, 0, trunkW + 0.5, 0.55, trunkW + 0.5, look.ring);
  // the canopy builders work from the old cut height, like the trees they came from
  const canopy = at(target, CUT_Y * scale), glow = at(glowTarget, CUT_Y * scale);
  const above = trunkH - CUT_Y;
  if (palm) buildPalmCanopy(canopy, look, rnd, above);
  else if (pine) buildPineCanopy(canopy, look, rnd, above);
  else if (look.lava) buildLavaCanopy(canopy, glow, look, rnd, above);
  else if (look.mushroom) buildMushroomCanopy(canopy, glow, look, rnd, above);
  else if (look.blocky) buildBlockyCanopy(canopy, look, rnd, above);
  else if (look.acacia) buildAcaciaCanopy(canopy, look, rnd, above);
  else if (look.coral) buildCoral(canopy, look, rnd, 22);
  else if (look.dead) buildDeadTree(canopy, look, rnd, above);
  else if (look.bamboo) buildBamboo(canopy, look, rnd, above);
  else if (look.cactus) buildCactus(canopy, look, rnd, above);
  else if (look.obsidian) buildObsidian(canopy, glow, look, rnd, above);
  else if (round) buildRoundCanopy(canopy, look, rnd, above);
  else buildLeafCanopy(canopy, look, rnd, above, type === 'goldtree' ? 1.35 : type === 'candytree' ? 1.3 : 1);
  return (trunkW / 2 + 0.4) * scale; // the trunk's radius, for its collider
}

const cutMaterial = new THREE.MeshLambertMaterial({ color: CUT_COLOR });
const unitBox = new THREE.BoxGeometry(1, 1, 1);
// See-through green shell over the trunk of the tree you are standing next to.
const glowMaterial = new THREE.MeshBasicMaterial({ color: GLOW_COLOR, transparent: true, opacity: 0.4, depthWrite: false });

// The colours of the chips a hit knocks out of this kind of tree: bark, then pale inner wood.
export function chipColors(type) {
  const look = LOOK[type] || LOOK.oak;
  return [look.trunk, CUT_COLOR, look.ring || look.trunk];
}

// Gently pulses every highlighted trunk (shared material, so once per frame).
export function pulseTreeGlow(time) {
  glowMaterial.opacity = 0.32 + Math.sin(time * 5) * 0.1;
}

export class TreeView {
  static sparkles = true; // the giant trees' sparkles (off on Low quality)

  constructor(tree, scene, physics, effects = null) {
    this.tree = tree;
    this.effects = effects;
    this.max = treeHp(tree);
    const parts = buildTree(tree);
    this.trunkW = parts.trunkW;
    this.trunkH = parts.trunkH;
    this.side = parts.side; // the tree falls towards +x (1) or -x (-1)

    this.group = new THREE.Group();
    this.group.position.set(tree.x, 0, tree.z);
    this.group.scale.setScalar(tree.scale);
    this.group.add(parts.stump);

    this.upper = new THREE.Group(); // pivots at the cut
    this.upper.add(parts.trunk, parts.canopy);
    this.canopy = parts.canopy;
    this.group.add(this.upper);

    // the cut: a light wedge growing into the trunk from the side it will fall to
    this.cut = new THREE.Mesh(unitBox, cutMaterial);
    this.cut.visible = false;
    this.group.add(this.cut);
    this.stumpTop = new THREE.Mesh(unitBox, cutMaterial);
    this.stumpTop.scale.set(this.trunkW * 0.8, 0.12, this.trunkW * 0.8);
    this.stumpTop.position.y = CUT_Y + 0.06;
    this.group.add(this.stumpTop);

    const shell = this.trunkW + 0.6;
    this.glowUpper = new THREE.Mesh(unitBox, glowMaterial);
    this.glowUpper.scale.set(shell, this.trunkH - CUT_Y, shell);
    this.glowUpper.position.y = (this.trunkH - CUT_Y) / 2;
    this.glowUpper.renderOrder = 2;
    this.upper.add(this.glowUpper);
    this.glowStump = new THREE.Mesh(unitBox, glowMaterial);
    this.glowStump.scale.set(shell, CUT_Y + 0.2, shell);
    this.glowStump.position.y = CUT_Y / 2;
    this.glowStump.renderOrder = 2;
    this.group.add(this.glowStump);
    this.setHighlight(false);
    if (tree.giant) this.addShine();
    scene.add(this.group);

    this.hp = null;
    this.lean = 0;
    this.fallT = -1;  // 0..1 while falling, 1 = lying on the ground, -1 = standing
    this.growing = 0;
    this.shake = 0;
    this.collider = physics.addCircle(tree.x, tree.z, (this.trunkW / 2 + 0.4) * tree.scale);
    this.collider.top = this.trunkH * tree.scale; // below the leaves (the camera can look through those)
  }

  // The trunk turns see-through green while the player is close enough to chop it.
  setHighlight(on) {
    const show = on && this.fallT < 0 && this.upper.visible;
    if (show === this.highlighted) return;
    this.highlighted = show;
    this.glowUpper.visible = show;
    this.glowStump.visible = show;
  }

  // world height just above the leaves, for labels
  get topHeight() {
    return (this.trunkH + 8) * this.tree.scale;
  }

  setHp(hp) {
    const previous = this.hp;
    this.hp = hp;
    if (previous === null) {
      this.reset(hp > 0);
    } else if (previous > 0 && hp <= 0) {
      this.fallT = 0;
      this.collider.active = false;
      this.cut.visible = false;
      this.stumpTop.visible = true;
    } else if (previous <= 0 && hp > 0) {
      this.reset(true);
      this.growing = GROW_SECONDS;
    }
    this.showDamage();
  }

  // standing: the whole tree. Otherwise only the stump (a tree already down when we joined).
  reset(standing) {
    this.fallT = -1;
    this.upper.visible = standing;
    this.upper.position.set(0, CUT_Y, 0);
    this.upper.rotation.set(0, 0, 0);
    this.upper.scale.setScalar(1);
    this.canopy.visible = true;
    this.stumpTop.visible = !standing;
    this.collider.active = standing;
  }

  // The cut deepens and the tree leans as it loses HP.
  showDamage() {
    if (this.fallT >= 0 || !this.upper.visible) return;
    const damage = Math.max(0, Math.min(1, 1 - this.hp / this.max));
    const depth = damage * this.trunkW * 0.85;
    this.cut.visible = depth > 0.05;
    this.cut.scale.set(depth + 0.12, 1.9, this.trunkW + 0.12);
    this.cut.position.set(this.side * (this.trunkW / 2 - depth / 2 + 0.06), CUT_Y, 0);
    this.lean = -this.side * damage * damage * LEAN_MAX;
    this.upper.rotation.z = this.lean;
  }

  // fromX/fromZ: where the hitter stands. On the first hit, and again on the felling hit, the
  // tree turns (in 90 degree steps, so the square trunk still lines up with the stump) to fall
  // straight away from them, never onto the player.
  hit(fromX, fromZ, hp) {
    this.shake = SHAKE_SECONDS;
    if (fromX === undefined || this.fallT >= 0) return;
    const fresh = this.hp === null || this.hp >= this.max;
    if (!fresh && hp > 0) return;
    const dx = this.tree.x - fromX, dz = this.tree.z - fromZ;
    if (Math.hypot(dx, dz) < 1e-3) return;
    const step = Math.PI / 2;
    this.group.rotation.y = Math.round(Math.atan2(-dz, dx) / step) * step;
    this.side = 1;
    this.showDamage();
  }

  // world direction the tree falls towards
  fallDir() {
    const a = this.group.rotation.y;
    return { x: Math.cos(a) * this.side, z: -Math.sin(a) * this.side };
  }

  // A giant tree shines: a white glow on the ground, glowing bands and lightning spiralling up the
  // trunk, a bright outline round the canopy, and sparkles floating up all around it.
  addShine() {
    const color = new THREE.Color(GIANT_GLOW[this.tree.zone] || '#d98cff');
    const w = this.trunkW, above = this.trunkH - CUT_Y;

    const floor = new THREE.Mesh(new THREE.CircleGeometry(w * 2.3, 40), new THREE.MeshBasicMaterial({
      map: glowMap(), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.06;
    floor.renderOrder = 2;
    this.group.add(floor);
    this.shineFloor = floor;

    // bands spiralling up the trunk and zig-zag lightning (built relative to the cut, so they fall with it)
    const v = new Voxels();
    const half = w / 2 + 0.08;
    for (let y = 0.6, a = 0; y < above - 0.5; y += 1.1, a += 0.75) {
      const side = Math.floor(((a % (Math.PI * 2)) / (Math.PI / 2))) % 4;
      const [x, z, sx, sz] = [[half, 0, 0.16, w], [0, half, w, 0.16], [-half, 0, 0.16, w], [0, -half, w, 0.16]][side];
      v.box(x, y, z, sx, 0.32, sz, '#ffffff', { [sx < 1 ? 'rx' : 'rz']: 0.5 });
    }
    for (let k = 0; k < 2; k++) {
      let x = (k ? 1 : -1) * w * 0.2;
      for (let y = 0.4; y < above - 1; y += 1.4) {
        const nx = (k ? 1 : -1) * w * 0.2 + (Math.random() - 0.5) * w * 0.5;
        v.box((x + nx) / 2, y, half * (k ? 1 : -1), 0.14, 1.5, 0.14, '#ffffff', { rz: (nx - x) * 0.6 });
        x = nx;
      }
    }
    this.shineMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, color, transparent: true });
    this.upper.add(new THREE.Mesh(v.geometry(), this.shineMaterial));

    // a bright outline round the canopy: its own shape, slightly bigger, drawn from the inside
    const outline = new THREE.Mesh(this.canopy.geometry, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide }));
    outline.scale.setScalar(1.035);
    this.canopy.add(outline);

    // sparkles up the trunk and round the canopy
    const centers = [];
    for (let y = 2; y < this.trunkH + 6; y += 4) centers.push(new THREE.Vector3(0, y, 0));
    this.dust = new MagicDust(this.group, centers, w * 0.9);
    this.dust.points.material.size = 2.6; // world units (points do not grow with the tree's scale)
    this.shineT = Math.random() * 10;
  }

  update(dt) {
    if (this.shineMaterial) {
      this.shineT += dt;
      this.shineMaterial.opacity = 0.75 + Math.sin(this.shineT * 3) * 0.25; // the glow pulses
      const standing = this.fallT < 0 && this.upper.visible;
      this.dust.points.visible = standing && TreeView.sparkles;
      this.shineFloor.material.opacity = standing ? 0.9 : 0.35;
      if (this.dust.points.visible) this.dust.update(dt, 0.7);
    }
    if (this.fallT >= 0 && this.fallT < 1) {
      this.fallT = Math.min(1, this.fallT + dt / FALL_SECONDS);
      const k = this.fallT ** 2.2; // slow at first, then crashing down
      this.upper.rotation.set(0, 0, this.lean + (-this.side * Math.PI / 2 - this.lean) * k);
      // the log slides off the stump and comes to rest on the ground
      this.upper.position.set(this.side * this.trunkW * 0.7 * k, CUT_Y + (this.trunkW / 2 - CUT_Y) * k, 0);
      if (this.fallT === 1) this.landed();
      return;
    }
    if (this.growing > 0) {
      this.growing = Math.max(0, this.growing - dt);
      this.upper.scale.setScalar(1 - this.growing / GROW_SECONDS);
    }
    if (this.fallT < 0 && this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.upper.rotation.x = Math.sin(this.shake * 90) * 0.03;
    } else if (this.fallT < 0) {
      this.upper.rotation.x = 0;
    }
  }

  // The leaves burst off and the bare trunk stays lying on the ground until the tree grows back.
  landed() {
    this.canopy.visible = false;
    if (!this.effects) return;
    const s = this.tree.scale;
    const reach = (this.trunkH - CUT_Y) * s;
    const dir = this.fallDir();
    const leafAt = new THREE.Vector3(this.tree.x + dir.x * reach * 0.85, 4 * s, this.tree.z + dir.z * reach * 0.85);
    const leaves = LOOK[this.tree.type].leaves;
    for (let i = 0; i < 3; i++) this.effects.burst(leafAt, leaves[i % leaves.length], 14, 20);
    this.effects.burst(new THREE.Vector3(this.tree.x + dir.x * reach * 0.5, 1, this.tree.z + dir.z * reach * 0.5), '#d9c4a0', 18, 12);
  }
}
