// The whole map: the checkered safe zone, brick walls with grass on top, the forest,
// the shops and the player plots.

import * as THREE from 'three';
import { ChunkedVoxels, Voxels } from '../util/bake.js';
import { makeTextPlane, RAINBOW } from '../util/canvasText.js';
import { DECOR_TREES, PLOTS, ROAD_HALF, SHOPS, TREES, WORLD, ZONES, ZONE_DEPTH, pathX, pickWeighted, zoneAt } from '../../shared/gameData.js';
import { addDecorTree } from '../entities/Trees.js';
import { EggNodeView } from '../entities/EggNodes.js';
import { PlotView } from '../entities/PlayerBase.js';
import { SmokeSystem } from '../entities/Smoke.js';
import { addAdBoard, addAlienCrate, addWinterFusion } from '../entities/WinterFusion.js';
import { addFeedbackBox, addFuseMachine, addInfernoDragon, addSellExtras, addWeatherSign } from '../entities/PlazaExtras.js';
import { GIFT_COLORS, addFreePad, addGlowRing, addLeaderboards, addLuckyDustMachine, addStall, giftVoxels } from '../entities/Shops.js';
import { addTrackBoards } from '../entities/TrackBoards.js';
import { glowMap } from '../entities/Effects.js';

const { halfX, southZ, lineZ, northZ, openingHalf, wallHeight } = WORLD;
const startHalf = WORLD.startHalfX; // the Starting Place is wider than the track
const GROUND_TILE = 12;
const WALL_BLOCK_DEPTH = 2.6;
const WALL_BLOCK_GAP = 0.5;
const PLATEAU_TILE = 20;
const PLATEAU_WIDTH = 60;
const NORTH_WALL_DEPTH = 12;
const CLIFF_START_Z = WORLD.lineZ - NORTH_WALL_DEPTH; // the track's tall rock walls start behind the front wall
// The Starting Place walls: big brown blocks in columns of uneven height, snow on top and drifts of
// snow along the bottom. Change WALL_BROWNS to change the wall's colour.
const WALL_BROWNS = ['#8a5634', '#7b4a2b', '#96603c', '#6e4126', '#a06a44', '#84512f'];
const MORTAR = '#3a2214';
const WALL_COLUMN_WIDTH = [9, 22];  // how wide each column of blocks is
const WALL_BLOCK_TALL = [14, 26];   // how tall each block in a column is
const WALL_TOP_VARY = [-7, 5];      // each column's top, relative to wallHeight
const SNOW_SHADES = ['#ffffff', '#f3f8ff', '#e6f0fb'];
const SNOW_DRIFT_TALL = [4, 11]; // snow piled against the bottom of the wall
const SNOW_DRIFT_DEEP = [4, 8];
// The forest's side walls: tall cliffs of rough rock blocks, grass on top, tall trees along the edge.
const FOREST_WALL_HEIGHT = 80;
const ROCK = ['#6f7378', '#5f6368', '#80858a', '#53575c', '#8e9398', '#676b70'];
const ROCK_BACK = '#3c3f43';
// The track's walls, either side of it all the way along: big grey stone blocks stacked in columns
// of different widths and heights, with snow on top of each column.
const TRACK_WALL_STYLE = {
  colors: ROCK, mortar: ROCK_BACK, depth: 7,
  columnWidth: [14, 32], blockTall: [18, 40], topVary: [-22, 14], jut: 2.5, baseSnow: false,
};
// Stages can have their own wall (zone.wall): stage 1 dark maroon brick with grass on top,
// stage 2 sandstone with sand on top. Both keep a fairly even top, like big built walls.
const ZONE_WALL_STYLES = {
  maroon: {
    colors: ['#7a2533', '#86293a', '#6c1f2c', '#923042', '#74222f'], mortar: '#3e0f18', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-3, 3], jut: 1, baseSnow: false, cap: '#5cc84a', drips: false,
  },
  obsidian: {
    colors: ['#1a1224', '#221832', '#140e1c', '#2a1e3c', '#1e1428'], mortar: '#08050c', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-6, 6], jut: 1.5, baseSnow: false, cap: '#6a3aa8', drips: false,
  },
  lavaRock: {
    colors: ['#7a1a1e', '#8a2024', '#6a1418', '#942a2a', '#701a1e'], mortar: '#2a0608', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-3, 3], jut: 1, baseSnow: false, cap: '#3a1a1c', drips: false,
  },
  earth: {
    colors: ['#6a3a24', '#5e3420', '#74422a', '#56301e', '#6e3e26'], mortar: '#2a160c', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-3, 3], jut: 1, baseSnow: false, cap: '#4caf50', drips: false,
  },
  ice: {
    colors: ['#e6eef8', '#d6e3f2', '#c8d8ec', '#eef4fb', '#bcd0e8'], mortar: '#7a90b0', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-3, 3], jut: 1, baseSnow: false, cap: '#ffffff', drips: true,
  },
  reef: {
    colors: ['#2a4fa8', '#3460c0', '#203f90', '#3a6ad0', '#2a55b0'], mortar: '#122a60', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-3, 3], jut: 1, baseSnow: false, cap: '#f2dc8a', drips: false,
  },
  chocolate: {
    colors: ['#6a3a24', '#7a4a2e', '#5a3020', '#84502f', '#623622'], mortar: '#2e170c', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-3, 3], jut: 1, baseSnow: false, cap: '#ff9fd0', drips: true,
  },
  sandstone: {
    colors: ['#c99a5c', '#bb8b4c', '#d4a86a', '#ad7d42', '#c2925a'], mortar: '#6e4a24', depth: 7,
    columnWidth: [12, 24], blockTall: [10, 18], topVary: [-3, 3], jut: 1, baseSnow: false, cap: '#e8d49a', drips: false,
  },
};
const SNOW_CAP = 1.4; // the snow slab lying on top of every wall
// The four leaderboards hang on the front (north) wall, two each side of the track opening, out
// past the shops (above the side frames' entrances) so nothing stands in front of them.
const SIDE_FACE = startHalf + 1 - WALL_BLOCK_DEPTH / 2; // the side walls' inner faces are at +-this
const SIDE_BOARDS_STRETCH = [98, 188];                   // z range of the side walls kept flat for the boards
const LEADERBOARDS = [
  { along: 120, title: 'MOST CASH/S', color: '#46e24a', wall: { axis: 'z', at: -SIDE_FACE, facing: 1 } },
  { along: 165, title: 'TOP SPEED', color: '#27b6ff', wall: { axis: 'z', at: -SIDE_FACE, facing: 1 } },
  { along: 120, title: 'EGGS STOLEN', color: '#ffc531', wall: { axis: 'z', at: SIDE_FACE, facing: -1 } },
  { along: 165, title: 'TOP PLAYTIME', color: '#b44aff', wall: { axis: 'z', at: SIDE_FACE, facing: -1 } },
];
const LEADERBOARD_BASE_Y = 5;
const BOARDS_WALL_STRETCH = [336, 444]; // x range (each side) of the front wall kept free of snow drips
const LIME = ['#ffffff', '#eef5fd']; // the plateau tops behind the walls: snow
const PLATEAU_SIDE = '#6b4329';
// Big lanterns (no pole) and big gift boxes sitting on the wall tops all around the Starting Place.
const LANTERN_SCALE = 2;  // a lantern is about 20 * this wide and 33 * this tall
const WALL_GIFT_SCALE = 4.4; // a wall gift is 7 * this wide
const LAMP_METAL = '#2c3038';
const LAMP_LIGHT = '#ffe9a8';
const LAMP_OFF = '#a8b0ba'; // the glass when the lamp is off (sunny days)
// The two big boards above the start of the track, each this far from the middle.
const TRACK_BOARD_X = 300; // the middle of each north wall stretch (openingHalf to startHalf)
// the Watch Ad board on the front wall, right of the track opening (between it and the leaderboards)
const AD_BOARD_X = 390;
const GATE_BEAM_Y = wallHeight - 2.4; // the beam's bottom, level with the wall tops

const BEACH_DEPTH = 60; // the Water forest starts with a strip of sandy beach

const START_GROUND = ['#51ea1f', '#45de18']; // the Starting Place's own green checker

function groundColor(i, j, z) {
  const zone = zoneAt(z);
  if (!zone) return START_GROUND[(i + j) % 2];
  const colors = zone.beach && z > zone.maxZ - BEACH_DEPTH ? zone.beach : zone.ground;
  return colors[(i + j) % 2];
}

// The sea floor: coral clusters in bright colours, swaying-looking seaweed, starfish and shells.
function addCoral(v, x, z, rnd) {
  const kind = rnd();
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  if (kind < 0.35) {
    // branching coral: a few blocky fingers of one colour
    const color = pick(['#ff5fa8', '#c46bff', '#ffd21f', '#ff3b3b', '#ff8a3a']);
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 1.4;
      v.box(x + Math.cos(a) * r, 0, z + Math.sin(a) * r, 0.9, 2 + rnd() * 3.5, 0.9, color, { rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.5 });
    }
  } else if (kind < 0.6) {
    // seaweed: tall thin green strands
    for (let i = 0; i < 3; i++) {
      const h = 4 + rnd() * 6;
      const dx = (rnd() - 0.5) * 2, dz = (rnd() - 0.5) * 2;
      v.box(x + dx, 0, z + dz, 0.5, h * 0.55, 0.5, pick(['#2fbf6a', '#1f9a5a', '#5fd68a']), { rz: (rnd() - 0.5) * 0.3 });
      v.box(x + dx + 0.3, h * 0.5, z + dz, 0.45, h * 0.5, 0.45, pick(['#2fbf6a', '#5fd68a']), { rz: (rnd() - 0.5) * 0.6 });
    }
  } else if (kind < 0.8) {
    // brain / block coral
    const s = 1.4 + rnd() * 1.8;
    v.box(x, 0, z, s * 1.4, s, s * 1.2, pick(['#ff7ab8', '#a86aff', '#ffb02e', '#5fd6c8']), { ry: rnd() * 3 });
  } else if (kind < 0.92) {
    // starfish
    const color = pick(['#ff8a3a', '#ff5fa8', '#ffd21f']);
    for (let i = 0; i < 5; i++) v.box(x, 0, z, 0.6, 0.35, 2.4, color, { ry: (i / 5) * Math.PI * 2 });
  } else {
    // a shell
    v.box(x, 0, z, 1.6, 0.8, 1.3, pick(['#fff0e0', '#ffd8e8']), { ry: rnd() * 3 });
  }
}

// Checkered ground: the forests are halfX wide, the Starting Place (south of lineZ) startHalf wide.
function addGround(v) {
  const tiles = (half, fromZ, toZ) => {
    let i = 0;
    for (let x = -half; x < half; x += GROUND_TILE, i++) {
      let j = 0;
      for (let z = fromZ; z < toZ; z += GROUND_TILE, j++) {
        const w = Math.min(GROUND_TILE, half - x), d = Math.min(GROUND_TILE, toZ - z);
        v.box(x + w / 2, -2, z + d / 2, w, 2, d, groundColor(i, j, z));
      }
    }
  };
  tiles(halfX, northZ, lineZ);
  tiles(startHalf, lineZ, southZ);
  // the cliff of the island under the map, seen from the north edge
  v.box(0, -34, (northZ + southZ) / 2, startHalf * 2 + PLATEAU_WIDTH * 2, 32, southZ - northZ + PLATEAU_WIDTH, '#a65032');
}

// No road through the stages: each stage's own ground runs all the way across (the middle is only
// kept clear of trees and props, see ROAD_HALF). Just the red line where the Safe Zone ends.
function addPath(v) {
  v.box(0, -0.9, lineZ, openingHalf * 2, 1, 1.6, '#e4243b');
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// The Starting Place wall (and, with TRACK_WALL_STYLE, the track walls): columns of big stacked blocks, each column a different width and height
// so the top edge goes up and down, in a few shades of brown (some blocks stick out a little).
// Snow lies on top of every column with a few short drips, and drifts of snow pile up along the
// bottom of the inner face. Along `clear` (where boards hang) the face is kept flat and the snow low.
// inner = the side of the wall players see (+1 or -1).
// The Starting Place wall's look; the track walls use TRACK_WALL_STYLE (same idea, bigger grey stone).
const START_WALL_STYLE = {
  colors: WALL_BROWNS, mortar: MORTAR, depth: WALL_BLOCK_DEPTH,
  columnWidth: WALL_COLUMN_WIDTH, blockTall: WALL_BLOCK_TALL, topVary: WALL_TOP_VARY, jut: 1.2, baseSnow: true,
};

function addWallRun(v, axis, fixed, from, to, height, inner, clear = null, style = START_WALL_STYLE) {
  const { colors, mortar, depth: DEPTH, columnWidth, blockTall, topVary, jut: JUT, baseSnow, cap = '#ffffff', drips = true } = style;
  const rnd = seededRandom(Math.abs(Math.round(fixed * 7 + from * 3)) + 11);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const range = ([lo, hi]) => lo + rnd() * (hi - lo);
  // offset moves a box towards the inner side (players' side) of the wall's middle line
  const place = (along, y, length, h, depth, color, offset = 0) => {
    const at = fixed + inner * offset;
    if (axis === 'z') v.box(at, y, along, depth, h, length, color);
    else v.box(along, y, at, length, h, depth, color);
  };
  const inClear = (a, b) => clear && b > clear[0] - 2 && a < clear[1] + 2;
  const half = DEPTH / 2;

  place((from + to) / 2, 0, to - from, height - 4, DEPTH * 0.55, mortar); // dark backing seen through the gaps

  for (let a = from; a < to - 0.5;) {
    let w = Math.min(range(columnWidth), to - a);
    if (to - a - w < columnWidth[0] * 0.6) w = to - a; // no thin sliver left at the end
    const flat = inClear(a, a + w);
    const colH = height + Math.round(range(topVary));
    // the column: big blocks stacked to its height, the last one never too thin
    for (let y = 0; y < colH - 0.5;) {
      let h = Math.min(range(blockTall), colH - y);
      if (colH - y - h < blockTall[0] * 0.5) h = colH - y;
      const jut = flat ? 0 : rnd() * rnd() * JUT; // mostly flush, a few stick out
      place(a + w / 2, y + WALL_BLOCK_GAP / 2, w - WALL_BLOCK_GAP, h - WALL_BLOCK_GAP, DEPTH + jut, pick(colors), jut / 2);
      y += h;
    }
    // snow on top of the column, hanging a little over both faces, and a short drip or two
    place(a + w / 2, colH - 0.4, w + 0.4, SNOW_CAP, DEPTH + 1.8, cap);
    if (!flat && drips) {
      for (let d = 0; d < 2; d++) {
        if (rnd() < 0.45) continue;
        const dw = 1.6 + rnd() * 2.4, at = a + 1 + rnd() * Math.max(0, w - dw - 2);
        const drop = 1.5 + rnd() * rnd() * 7;
        place(at + dw / 2, colH - drop, dw, drop, 0.9, pick(SNOW_SHADES), half + 0.6);
      }
    }
    a += w;
  }

  // snow drifts along the bottom of the inner face: uneven mounds with a lower step in front
  if (!baseSnow) return;
  for (let a = from; a < to - 1;) {
    const w = Math.min(6 + rnd() * 12, to - a);
    const low = inClear(a, a + w);
    const h = low ? 1 + rnd() * 1.5 : range(SNOW_DRIFT_TALL);
    const depth = range(SNOW_DRIFT_DEEP);
    // a tall back part against the wall, a lower middle step and a thin edge in front
    place(a + w / 2, 0, w + 0.6, h, depth, pick(SNOW_SHADES), half + depth / 2 - 0.4);
    place(a + w / 2, 0, w * 0.9, h * 0.55, depth + 3.5, pick(SNOW_SHADES), half + (depth + 3.5) / 2 - 0.4);
    place(a + w / 2, 0, w * 0.7, h * 0.22, depth + 6.5, pick(SNOW_SHADES), half + (depth + 6.5) / 2 - 0.4);
    a += w;
  }
}

function addPlateau(v, minX, maxX, minZ, maxZ, height = wallHeight, side = PLATEAU_SIDE, top = LIME) {
  let i = 0;
  for (let x = minX; x < maxX; x += PLATEAU_TILE, i++) {
    let j = 0;
    for (let z = minZ; z < maxZ; z += PLATEAU_TILE, j++) {
      const w = Math.min(PLATEAU_TILE, maxX - x), d = Math.min(PLATEAU_TILE, maxZ - z);
      v.box(x + w / 2, height - 2, z + d / 2, w, 2, d, top[(i + j) % 2]);
      v.box(x + w / 2, -2, z + d / 2, w, height - 2, d, side);
    }
  }
}

// One big lantern sitting straight on the wall top (no pole): a heavy plinth, a tall glowing core
// between four corner posts, a stepped roof with snow on it and a gold finial. The core goes in
// `glow` (unlit, so it looks lit). Drawn at LANTERN_SCALE times its base size; returns the light's centre.
function addWallLantern(v, glow, x, y, z) {
  const k = LANTERN_SCALE;
  const at = (target) => (bx, by, bz, w, h, d, color) => target.box(x + bx * k, y + by * k, z + bz * k, w * k, h * k, d * k, color);
  const b = at(v), g = at(glow);
  const S = 16, H = 17, half = S / 2; // the glowing body's width and height, before scaling
  b(0, 0, 0, S + 2, 3, S + 2, LAMP_METAL);            // plinth
  b(0, 2.4, 0, S + 2.6, 0.9, S + 2.6, '#ffcf33');     // gold trim
  const base = 3.3;
  b(0, base, 0, S - 3, H, S - 3, LAMP_OFF); // the glass; its light is a separate mesh (see addWallDecor)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(sx * (half - 1), base, sz * (half - 1), 2.2, H, 2.2, LAMP_METAL);
  // a thin bar down the middle of each glass side, and a band round the middle
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    b(sx * (half - 1.4), base, sz * (half - 1.4), sz ? 0.9 : 0.6, H, sx ? 0.9 : 0.6, LAMP_METAL);
  }
  b(0, base + H * 0.5 - 0.5, 0, S - 2.4, 1, S - 2.4, LAMP_METAL);
  // the roof, in steps, with snow lying on each step
  const top = base + H;
  b(0, top, 0, S + 3, 2.4, S + 3, LAMP_METAL);
  b(0, top + 2.4, 0, S + 3.4, 0.9, S + 3.4, '#ffffff');
  b(0, top + 3.3, 0, S - 3, 2.4, S - 3, '#3c424c');
  b(0, top + 5.7, 0, S - 2.6, 0.8, S - 2.6, '#ffffff');
  b(0, top + 6.5, 0, 6, 2, 6, LAMP_METAL);
  b(0, top + 8.5, 0, 2.4, 3.4, 2.4, '#ffcf33');
  return { at: new THREE.Vector3(x, y + (base + H / 2) * k, z), w: (S - 3) * k + 0.1, h: H * k + 0.1 };
}

// The wall-top decorations all round the Starting Place: five big lanterns and big gift boxes
// between them, sitting on the snow just behind the wall. The north wall is left to the track
// boards and the east wall's leaderboard stretch is kept clear. A soft halo around each lantern
// breathes slowly.
function addWallDecor(scene, v, glow) {
  const lights = [];
  const back = WALL_BLOCK_DEPTH / 2 + 10 * LANTERN_SCALE - 1; // so the decor stands on the wall, not past its face
  const west = (z) => ({ x: -(startHalf + 1 + back), z });
  const east = (z) => ({ x: startHalf + 1 + back, z });
  const south = (x) => ({ x, z: southZ + 1 + back });

  for (const p of [west(260), east(330), south(-300), south(0), south(300)]) {
    lights.push(addWallLantern(v, glow, p.x, wallHeight, p.z));
  }
  [
    [west(80), 'red'], [west(470), 'blue'], [east(170), 'purple'], [east(480), 'green'],
    [south(-150), 'blue'], [south(150), 'red'],
  ].forEach(([p, colors]) => giftVoxels(v, { x: p.x, y: wallHeight + 0.6, z: p.z, k: WALL_GIFT_SCALE, colors: GIFT_COLORS[colors] }));

  // the lamps' light: bright cores and a soft halo, switched on in snow and rain (lit 0..1)
  const coreMaterial = new THREE.MeshBasicMaterial({ color: LAMP_LIGHT, transparent: true, opacity: 0, fog: true });
  for (const { at, w, h } of lights) {
    const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), coreMaterial);
    core.position.copy(at);
    scene.add(core);
  }
  const positions = new Float32Array(lights.flatMap(({ at }) => [at.x, at.y, at.z]));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: glowMap(), size: 120, color: '#ffd98a', transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Points(geometry, material);
  scene.add(halo);
  return (time, lit) => {
    coreMaterial.opacity = lit;
    material.opacity = lit * (0.55 + Math.sin(time * 1.3) * 0.08);
    halo.visible = lit > 0.01;
  };
}

// The tops of the track walls, stage by stage: the stage's own ground, its own kind of trees (mostly
// near the edge so they show from the track below) and its own small objects lying around.
const WALL_TOP_TREE_STEP = [28, 44]; // gap between trees along each wall
const WALL_TOP_PROP_STEP = 16;       // gap between small objects
function addWallTops(v, glow) {
  const rnd = seededRandom(733);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const y = FOREST_WALL_HEIGHT;
  const lift = (t) => ({ box: (x, by, z, w, h, d, color, opts) => t.box(x, by + y, z, w, h, d, color, opts) });
  const top = lift(v), topGlow = lift(glow);
  let n = 0;
  for (const zone of ZONES) {
    const from = zone.minZ, to = Math.min(zone.maxZ, CLIFF_START_Z);
    for (const side of [-1, 1]) {
      // the ground up there
      const inner = side < 0 ? -startHalf - PLATEAU_WIDTH : halfX + 1;
      const outer = side < 0 ? -halfX - 1 : startHalf + PLATEAU_WIDTH;
      addPlateau(v, inner, outer, from, to, y, ROCK_BACK, zone.ground);
      // the trees: this stage's kind
      for (let z = from + 8; z < to - 8; z += WALL_TOP_TREE_STEP[0] + rnd() * (WALL_TOP_TREE_STEP[1] - WALL_TOP_TREE_STEP[0])) {
        const x = side * (halfX + 10 + rnd() * rnd() * 60);
        const type = zone.decorType || pickWeighted(zone.trees, rnd);
        const scale = zone.treeScale * (zone.decorTreeSize ?? 1.35) * (0.75 + rnd() * 0.35);
        addDecorTree(top, topGlow, type, x, z, scale, `walltop${n++}`);
      }
      // and the stage's small objects (the same ones that lie on its floor)
      for (let z = from + 4; z < to - 4; z += WALL_TOP_PROP_STEP + rnd() * WALL_TOP_PROP_STEP) {
        const x = side * (halfX + 6 + rnd() * 70);
        DECOR[zone.decor || zone.id]?.(top, x, z, rnd, pick, topGlow);
      }
    }
  }
}

// High over a stage with voidSky: a huge black-and-purple mass hanging in the sky, its underside
// broken into big jagged blocks, with glowing purple cracks running across it and floating rocks.
const VOID_SKY_Y = 190;
function addVoidSky(v, glow) {
  const rnd = seededRandom(6606);
  for (const zone of ZONES.filter((z) => z.voidSky)) {
    for (let z = zone.minZ; z < zone.maxZ; z += 30) {
      for (let x = -startHalf; x < startHalf; x += 30) {
        const drop = rnd() * rnd() * 40;
        v.box(x + 15, VOID_SKY_Y - drop, z + 15, 31, 30 + drop, 31, rnd() < 0.5 ? '#120a1c' : '#1e1030');
        if (rnd() < 0.18) glow.box(x + 15, VOID_SKY_Y - drop - 0.6, z + 15, 31 * (0.4 + rnd() * 0.6), 0.6, 2, rnd() < 0.5 ? '#b04aff' : '#7a2ad8', { ry: rnd() * 3 });
      }
    }
    // a big glowing crack zig-zagging down the middle
    let x = 0;
    for (let z = zone.minZ + 10; z < zone.maxZ - 10; z += 14) {
      const nx = Math.max(-80, Math.min(80, x + (rnd() - 0.5) * 50));
      glow.box((x + nx) / 2, VOID_SKY_Y - 45, z, Math.abs(nx - x) + 5, 1, 16, '#c86aff');
      x = nx;
    }
    // floating rocks between the sky and the ground
    for (let i = 0; i < 40; i++) {
      const s = 3 + rnd() * 6;
      v.box((rnd() - 0.5) * halfX * 3, 80 + rnd() * 70, zone.minZ + rnd() * zone.depth, s * 1.4, s, s * 1.2, rnd() < 0.5 ? '#d8c8a0' : '#2a1e3c', { ry: rnd() * 3, rx: rnd() * 0.5 });
    }
  }
}

function addWalls(v, physics, glow) {
  // Beside the forest (from the start of the road northwards) the sides are tall rock cliffs with
  // grass and tall trees on top; around the safe zone they stay red brick.
  for (const side of [-1, 1]) {
    // the track walls start right at the opening's edges (the track is as wide as the opening); the
    // tall rock begins just behind the front wall, so the boards standing on that wall stay in view
    // each stage's stretch of wall in its own style (grey stone with snow unless the stage says)
    for (const zone of ZONES) {
      const from = zone.minZ, to = Math.min(zone.maxZ, CLIFF_START_Z);
      const style = ZONE_WALL_STYLES[zone.wall] || TRACK_WALL_STYLE;
      addWallRun(v, 'z', side * (halfX + style.depth / 2), from, to, FOREST_WALL_HEIGHT, -side, null, style);
    }
  }
  // the Starting Place is wider than the track (startHalf), so its walls stand further out
  addWallRun(v, 'z', -startHalf - 1, lineZ, southZ, wallHeight, 1, SIDE_BOARDS_STRETCH);
  addWallRun(v, 'z', startHalf + 1, lineZ, southZ, wallHeight, -1, SIDE_BOARDS_STRETCH);
  addWallRun(v, 'x', southZ + 1, -startHalf, startHalf, wallHeight, -1);
  addWallRun(v, 'x', lineZ, -startHalf, -openingHalf, wallHeight, 1, [-BOARDS_WALL_STRETCH[1], -BOARDS_WALL_STRETCH[0]]);
  addWallRun(v, 'x', lineZ, openingHalf, startHalf, wallHeight, 1, BOARDS_WALL_STRETCH);
  // no wall at the far (north) end of the road: the forest opens out to the sea there

  // the high ground beside the forests reaches out past the Starting Place's corners
  addWallTops(v, glow);
  addVoidSky(v, glow);
  addPlateau(v, -startHalf - PLATEAU_WIDTH, -startHalf, lineZ, southZ + PLATEAU_WIDTH);
  addPlateau(v, startHalf, startHalf + PLATEAU_WIDTH, lineZ, southZ + PLATEAU_WIDTH);
  addPlateau(v, -startHalf, startHalf, southZ + 2, southZ + PLATEAU_WIDTH);
  addPlateau(v, -startHalf, -openingHalf, lineZ - NORTH_WALL_DEPTH, lineZ - 1);
  addPlateau(v, openingHalf, startHalf, lineZ - NORTH_WALL_DEPTH, lineZ - 1);

  physics.addBox(-startHalf, -openingHalf, lineZ - NORTH_WALL_DEPTH, lineZ + 1);
  physics.addBox(openingHalf, startHalf, lineZ - NORTH_WALL_DEPTH, lineZ + 1);

}

function addForestGate(v, physics) {
  const beamZ = lineZ - 4;
  // raised to the top of the walls, so the beam and sign sit above the trees
  v.box(0, GATE_BEAM_Y, beamZ, openingHalf * 2 + 8, 2.4, 2.4, '#6b4329');
  v.box(0, GATE_BEAM_Y - 3.6, beamZ + 0.7, 36, 9.4, 1.6, '#7a4b2e');
  v.box(0, GATE_BEAM_Y - 4, beamZ + 0.7, 37, 0.5, 1.8, '#ffffff');

}

// Small things lying on each forest floor.
// Small things lying around each forest's floor, matching that forest. glow = unlit voxels (lava).
const DECOR_PER_ZONE = 170;
const DECOR = {
  // the final stage: purple crystals, small obsidian chunks, bone arches and purple mushrooms
  void(v, x, z, rnd, pick, glow) {
    const k = rnd();
    if (k < 0.3) { for (let i = 0; i < 3; i++) glow.box(x + (rnd() - 0.5) * 2, 0, z + (rnd() - 0.5) * 2, 0.9, 2 + rnd() * 3, 0.9, pick(['#b04aff', '#8a2ae0', '#d07aff']), { rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.5 }); return; }
    if (k < 0.55) { v.box(x, 0, z, 2 + rnd() * 2, 1.5 + rnd() * 2, 2 + rnd() * 2, pick(['#1a1224', '#2a1e3c']), { ry: rnd() * 3 }); return; }
    if (k < 0.7) { const w = 6 + rnd() * 4, h = 6 + rnd() * 4, ry = rnd() * 3; for (const s of [-1, 1]) v.box(x + Math.cos(ry) * s * w / 2, 0, z - Math.sin(ry) * s * w / 2, 1.4, h, 1.4, '#e2d8b8', { ry }); v.box(x, h, z, w + 1.4, 1.4, 1.4, '#e2d8b8', { ry }); return; }
    if (k < 0.85) { v.box(x, 0, z, 0.6, 1.8, 0.6, '#e8e0f0'); glow.box(x, 1.8, z, 2.6, 0.8, 2.6, '#b04aff'); return; }
    v.box(x, 0, z, 3, 0.2, 3, pick(['#d8cce8', '#cfc0e2']), { ry: rnd() * 3 });
  },
  // stage 9: sand rocks (stacked, flat-topped), small cacti, bleached bones and dry tufts
  desert(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.35) { const s = 2 + rnd() * 3; v.box(x, 0, z, s * 2, s, s * 1.6, pick(['#d8a860', '#c8984e', '#e2b46c']), { ry: rnd() * 3 }); v.box(x + s * 0.2, s, z, s * 1.3, s * 0.7, s * 1.1, pick(['#e2b46c', '#cfa058']), { ry: rnd() * 3 }); return; }
    if (k < 0.6) { const h = 2 + rnd() * 3; v.box(x, 0, z, 1.2, h, 1.2, '#3f9a3a'); v.box(x + 0.9, h * 0.4, z, 0.8, h * 0.4, 0.8, '#3f9a3a'); return; }
    if (k < 0.75) { v.box(x, 0, z, 3, 0.6, 0.6, '#f2ecdc', { ry: rnd() * 3 }); v.box(x, 0, z, 0.9, 0.9, 0.9, '#f2ecdc'); return; }
    for (let i = 0; i < 4; i++) v.box(x + (rnd() - 0.5) * 1.6, 0, z + (rnd() - 0.5) * 1.6, 0.3, 1 + rnd() * 1.4, 0.3, pick(['#c8b45a', '#b8a24a']), { rz: (rnd() - 0.5) * 0.6 });
  },
  // stage 6: stepped blue-stone pyramids, grey rocks and glowing embers
  lavaLand(v, x, z, rnd, pick, glow) {
    const k = rnd();
    if (k < 0.25) { const s = 3 + rnd() * 3; for (let i = 0; i < 4; i++) v.box(x, i * s * 0.5, z, s * (2 - i * 0.45), s * 0.5, s * (2 - i * 0.45), pick(['#3a4a7a', '#44558a', '#323f6a'])); return; }
    if (k < 0.6) { v.box(x, 0, z, 1.6 + rnd() * 2, 1 + rnd(), 1.4 + rnd() * 1.6, pick(['#8a8c96', '#a0a4ae', '#6e7280']), { ry: rnd() * 3 }); return; }
    glow.box(x, 0, z, 0.8, 0.6, 0.8, pick(['#ff6a1a', '#ffb21f']), { ry: rnd() * 3 });
  },
  // stage 7: dinosaur bones and skulls, rocks, ferns
  prehistoric(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.2) { for (let i = 0; i < 5; i++) v.box(x - 4 + i * 2, 0, z, 0.6, 3 + Math.sin(i) * 1.5, 0.6, '#f2ecdc', { rz: 0.3 }); v.box(x, 0.4, z, 9, 0.8, 0.8, '#e8e0cc'); return; }
    if (k < 0.3) { v.box(x, 0, z, 4, 3, 5, '#f2ecdc'); v.box(x, 1, z + 2.6, 2.6, 1.2, 0.2, '#2a2a2a'); return; }
    if (k < 0.6) { v.box(x, 0, z, 1.6 + rnd() * 2, 1 + rnd(), 1.4 + rnd() * 1.6, pick(['#8a8c96', '#a0a4ae']), { ry: rnd() * 3 }); return; }
    for (let i = 0; i < 4; i++) v.box(x, 0, z, 0.4, 2 + rnd() * 2, 2.4, pick(['#5fbf3a', '#4aa82a']), { ry: i * 0.8, rz: 0.4 });
  },
  // stage 8: short bamboo shoots, blue stones and white blocks
  bamboo(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.4) { const h = 4 + rnd() * 6; for (let y = 0; y < h; y += 3) { v.box(x, y, z, 1, 2.8, 1, '#5fbf3a'); v.box(x, y + 2.8, z, 1.2, 0.25, 1.2, '#3a8a2a'); } return; }
    if (k < 0.75) { v.box(x, 0, z, 3 + rnd() * 2, 0.8, 1.6, pick(['#3a4a7a', '#44558a']), { ry: rnd() * 3 }); return; }
    cubeCluster(v, x, z, rnd, pick);
  },
  // the coral reef: coral, seaweed, starfish and shells
  coral(v, x, z, rnd) { addCoral(v, x, z, rnd); },
  // grass tufts, little flowers, mossy rocks and red mushrooms
  forest(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.35) { cubeCluster(v, x, z, rnd, pick); return; }
    if (k < 0.4) for (let i = 0; i < 4; i++) v.box(x + (rnd() - 0.5) * 1.6, 0, z + (rnd() - 0.5) * 1.6, 0.35, 1 + rnd() * 1.4, 0.35, pick(['#2fa828', '#3fbf2c', '#5ad13a']), { rz: (rnd() - 0.5) * 0.5 });
    else if (k < 0.65) flower(v, x, z, rnd, pick(['#ffffff', '#ffe14a', '#ff5a6e', '#a86aff']));
    else if (k < 0.85) { v.box(x, 0, z, 2.4, 1.2, 1.8, pick(['#8a9096', '#a0a6ac']), { ry: rnd() * 3 }); v.box(x, 1.2, z, 1.6, 0.3, 1.2, '#4cc23a', { ry: rnd() * 3 }); }
    else mushroom(v, x, z, '#e8293c');
  },
  // piles of fallen leaves, pumpkins and brown mushrooms
  autumn(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.3) { const s = 2 + rnd() * 2; for (let i = 0; i < 3; i++) v.box(x, i * s * 0.45, z, s * (1.6 - i * 0.4), s * 0.45, s * (1.3 - i * 0.3), pick(['#d8b878', '#c9a868', '#e2c488']), { ry: rnd() * 0.4 }); return; }
    if (k < 0.5) { cubeCluster(v, x, z, rnd, pick); return; }
    if (k < 0.7) { for (let i = 0; i < 4; i++) v.box(x + (rnd() - 0.5) * 1.8, 0, z + (rnd() - 0.5) * 1.8, 0.3, 1 + rnd() * 1.6, 0.3, pick(['#c8b45a', '#b8a24a', '#d6c46a']), { rz: (rnd() - 0.5) * 0.6 }); return; }
    if (k < 0.85) { v.box(x, 0, z, 1.2, 4 + rnd() * 2, 1.2, '#5aa83a'); v.box(x + 1, 1.8, z, 0.9, 1.8, 0.9, '#5aa83a'); v.box(x - 1, 2.4, z, 0.9, 1.4, 0.9, '#5aa83a'); return; }
    if (k < 0.5) for (let i = 0; i < 5; i++) v.box(x + (rnd() - 0.5) * 3, 0, z + (rnd() - 0.5) * 3, 1, 0.15, 0.7, pick(['#f2682c', '#ffb02e', '#e8332f', '#c8411f']), { ry: rnd() * 3 });
    else if (k < 0.75) { const s = 1.6 + rnd(); v.box(x, 0, z, s * 1.3, s, s * 1.3, '#ff8a1a'); v.box(x, s, z, 0.3, 0.6, 0.3, '#3a7a2a'); for (const d of [-1, 1]) v.box(x + d * s * 0.33, 0, z, 0.12, s + 0.02, s * 1.32, '#e8701a'); }
    else if (k < 0.9) mushroom(v, x, z, '#a8643a');
    else v.box(x, 0, z, 3, 0.9, 1, '#6a3a1e', { ry: rnd() * 3 }); // a fallen log
  },
  // pink petals, flower bushes and little stone lanterns
  sakura(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.5) for (let i = 0; i < 6; i++) v.box(x + (rnd() - 0.5) * 3.4, 0, z + (rnd() - 0.5) * 3.4, 0.5, 0.1, 0.5, pick(['#ffb7dc', '#ff8fc4', '#ffffff']), { ry: rnd() * 3 });
    else if (k < 0.8) { v.box(x, 0, z, 2.4, 1.6, 2.4, '#4cc23a', { ry: rnd() * 3 }); for (let i = 0; i < 4; i++) v.box(x + (rnd() - 0.5) * 2, 1.4, z + (rnd() - 0.5) * 2, 0.7, 0.6, 0.7, pick(['#ff8fc4', '#ffb7dc'])); }
    else { v.box(x, 0, z, 1.4, 0.6, 1.4, '#a0a6ac'); v.box(x, 0.6, z, 0.6, 1.6, 0.6, '#b8bec4'); v.box(x, 2.2, z, 1.4, 0.9, 1.4, '#ffe8a8'); v.box(x, 3.1, z, 1.9, 0.4, 1.9, '#8a9096'); }
  },
  // snow piles, ice crystals and little snowmen
  snow(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.45) { const s = 1.6 + rnd() * 2; v.box(x, 0, z, s * 1.6, s * 0.6, s, '#ffffff', { ry: rnd() * 3 }); v.box(x, s * 0.6, z, s, s * 0.35, s * 0.7, '#f2f8ff', { ry: rnd() * 3 }); }
    else if (k < 0.8) for (let i = 0; i < 3; i++) v.box(x + (rnd() - 0.5) * 1.6, 0, z + (rnd() - 0.5) * 1.6, 0.7, 1.6 + rnd() * 2.6, 0.7, pick(['#9be8ff', '#bfe9ff', '#7fd8ff']), { rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.5 });
    else { v.box(x, 0, z, 2.4, 2.2, 2.4, '#ffffff'); v.box(x, 2.2, z, 1.7, 1.6, 1.7, '#ffffff'); v.box(x, 3.8, z, 1.2, 1.2, 1.2, '#ffffff'); v.box(x, 4.2, z + 0.7, 0.3, 0.3, 0.6, '#ff8a1a'); v.box(x, 5, z, 1.3, 0.3, 1.3, '#2a2a30'); v.box(x, 5.3, z, 0.8, 0.8, 0.8, '#2a2a30'); }
  },
  // dark rocks, obsidian spikes, glowing embers and small lava pools
  volcano(v, x, z, rnd, pick, glow) {
    const k = rnd();
    if (k < 0.35) v.box(x, 0, z, 2 + rnd() * 2, 1 + rnd() * 1.4, 1.6 + rnd() * 1.6, pick(['#2e2e34', '#3a3a42', '#26262c']), { ry: rnd() * 3 });
    else if (k < 0.55) for (let i = 0; i < 3; i++) v.box(x + (rnd() - 0.5) * 1.4, 0, z + (rnd() - 0.5) * 1.4, 0.6, 1.6 + rnd() * 2.4, 0.6, '#1c1a24', { rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.5 });
    else if (k < 0.8) for (let i = 0; i < 3; i++) glow.box(x + (rnd() - 0.5) * 2, 0, z + (rnd() - 0.5) * 2, 0.5, 0.5 + rnd() * 0.6, 0.5, pick(['#ff6a1a', '#ffb21f']), { ry: rnd() * 3 });
    else { const s = 2 + rnd() * 2; glow.box(x, 0, z, s, 0.18, s * 0.8, '#ff7a1a', { ry: rnd() * 3 }); glow.box(x, 0.02, z, s * 0.6, 0.2, s * 0.45, '#ffd84a', { ry: rnd() * 3 }); }
  },
  // gumdrops, little lollipops, candy canes stuck in the ground and scattered sprinkles
  candy(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.35) for (let i = 0; i < 3; i++) { const c = pick(['#ff5fa8', '#5fd0ff', '#ffe14a', '#7dff3f', '#c86aff']); const dx = (rnd() - 0.5) * 2.6, dz = (rnd() - 0.5) * 2.6; v.box(x + dx, 0, z + dz, 1.6, 1, 1.6, c); v.box(x + dx, 1, z + dz, 1, 0.6, 1, c); }
    else if (k < 0.6) { const c = pick(['#ff5fa8', '#5fd0ff', '#ffe14a']); v.box(x, 0, z, 0.3, 3, 0.3, '#ffffff'); v.box(x, 3, z, 2.2, 2.2, 0.5, c); v.box(x, 3.5, z + 0.05, 1.2, 1.2, 0.5, '#ffffff'); }
    else if (k < 0.8) { for (let i = 0; i < 5; i++) v.box(x, i * 0.9, z, 0.7, 0.9, 0.7, i % 2 ? '#ffffff' : '#ff2a3c'); v.box(x + 0.6, 4.3, z, 1.6, 0.7, 0.7, '#ff2a3c'); }
    else for (let i = 0; i < 8; i++) v.box(x + (rnd() - 0.5) * 3, 0, z + (rnd() - 0.5) * 3, 0.8, 0.2, 0.25, pick(['#ff5fa8', '#5fd0ff', '#ffe14a', '#7dff3f', '#ffffff']), { ry: rnd() * 3 });
  },
  // little glowing mushrooms, moss and floating glowing spores
  mushroom(v, x, z, rnd, pick, glow) {
    const k = rnd();
    if (k < 0.45) for (let i = 0; i < 3; i++) { const dx = (rnd() - 0.5) * 2.4, dz = (rnd() - 0.5) * 2.4, h = 0.8 + rnd() * 1.4; v.box(x + dx, 0, z + dz, 0.4, h, 0.4, '#f2ead8'); glow.box(x + dx, h, z + dz, 1.4, 0.5, 1.4, pick(['#7fffe0', '#ff7ae0', '#a8ff6a'])); }
    else if (k < 0.75) v.box(x, 0, z, 2.6 + rnd() * 2, 0.4, 2 + rnd() * 2, pick(['#2a6a4a', '#1f5a3f', '#3a7a5a']), { ry: rnd() * 3 });
    else for (let i = 0; i < 4; i++) glow.box(x + (rnd() - 0.5) * 3, 1 + rnd() * 4, z + (rnd() - 0.5) * 3, 0.3, 0.3, 0.3, pick(['#7fffe0', '#d8ffa8']));
  },
  // star specks on the ground, glowing crystal shards and little meteor rocks
  galaxy(v, x, z, rnd, pick, glow) {
    const k = rnd();
    if (k < 0.4) for (let i = 0; i < 6; i++) glow.box(x + (rnd() - 0.5) * 4, 0, z + (rnd() - 0.5) * 4, 0.35, 0.12, 0.35, pick(['#ffffff', '#ffe14a', '#7fe8ff']));
    else if (k < 0.75) for (let i = 0; i < 3; i++) glow.box(x + (rnd() - 0.5) * 1.6, 0, z + (rnd() - 0.5) * 1.6, 0.6, 1.4 + rnd() * 2.6, 0.6, pick(['#c86aff', '#7fe8ff', '#ff7ae0']), { rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.5 });
    else { v.box(x, 0, z, 2 + rnd() * 1.5, 1.2 + rnd(), 1.8 + rnd(), pick(['#3a3a52', '#2a2a40']), { ry: rnd() * 3 }); glow.box(x, 0.2, z, 0.8, 0.8, 0.8, '#ff8a3a', { ry: rnd() * 3 }); }
  },
  // cloud puffs, golden blocks and broken white pillars
  heaven(v, x, z, rnd, pick) {
    const k = rnd();
    if (k < 0.45) for (let i = 0; i < 4; i++) v.box(x + (rnd() - 0.5) * 3, 0, z + (rnd() - 0.5) * 3, 1.6 + rnd() * 1.4, 1 + rnd(), 1.6 + rnd() * 1.4, pick(['#ffffff', '#eef4ff']));
    else if (k < 0.75) v.box(x, 0, z, 1.2 + rnd(), 1.2 + rnd(), 1.2 + rnd(), pick(['#ffd21f', '#ffe066', '#f2b21f']), { ry: rnd() * 3 });
    else { const h = 2 + rnd() * 4; v.box(x, 0, z, 2.2, 0.5, 2.2, '#e6eaf2'); v.box(x, 0.5, z, 1.4, h, 1.4, '#f6f8fc'); }
  },
};

// A little cluster of white cubes lying on the ground.
function cubeCluster(v, x, z, rnd, pick) {
  const shades = ['#ffffff', '#eef4fb', '#e2ebf5'];
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const s = 1.4 + rnd() * 1.6;
    v.box(x + (rnd() - 0.5) * 3, i === n - 1 && n > 2 ? s * 0.9 : 0, z + (rnd() - 0.5) * 3, s, s, s, pick(shades), { ry: rnd() * 0.8 });
  }
}

function flower(v, x, z, rnd, color) {
  v.box(x, 0, z, 0.2, 1.2, 0.2, '#3fbf2c');
  v.box(x, 1.2, z, 0.8, 0.35, 0.8, color, { ry: rnd() * 3 });
  v.box(x, 1.28, z, 0.35, 0.35, 0.35, '#ffd21f');
}

function mushroom(v, x, z, cap) {
  v.box(x, 0, z, 0.5, 1, 0.5, '#f4ead8');
  v.box(x, 1, z, 1.5, 0.6, 1.5, cap);
  v.box(x + 0.35, 1.6, z + 0.2, 0.3, 0.06, 0.3, '#ffffff');
}

// Rivers of glowing lava winding across the Volcano forest (they are flat, so you can walk over them).
// Stage 6's ground: big flat pools of glowing orange lava rock in a checker, on the dark ground
// (flat, so they can be walked over).
function addLavaPools(glow, zone, rnd) {
  for (let i = 0; i < 9; i++) {
    const x = (rnd() - 0.5) * (halfX * 2 - 60), z = zone.minZ + 30 + rnd() * (zone.depth - 60);
    const w = 40 + rnd() * 50, d = 30 + rnd() * 40;
    for (let a = -w / 2; a < w / 2; a += 10) for (let b = -d / 2; b < d / 2; b += 10) {
      glow.box(x + a + 5, 0, z + b + 5, 10, 0.1, 10, (Math.round(a / 10) + Math.round(b / 10)) % 2 ? '#f29a1a' : '#e88a12');
    }
  }
}


// The scenery trees (where they stand: DECOR_TREES in gameData). Their trunks block walking.
function addDecorTrees(v, glow, physics) {
  for (const t of DECOR_TREES) physics.addCircle(t.x, t.z, addDecorTree(v, glow, t.type, t.x, t.z, t.scale, t.id));
}

function addZoneDecor(v, glow) {
  const rnd = seededRandom(9091);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  for (const zone of ZONES) {
    if (zone.id === 'volcano') addLavaPools(glow, zone, rnd);
    for (let i = 0; i < Math.round(DECOR_PER_ZONE * zone.depth / ZONE_DEPTH); i++) {
      const x = -halfX + 10 + rnd() * (halfX * 2 - 20);
      const z = zone.minZ + 6 + rnd() * (zone.maxZ - zone.minZ - 12);
      if (Math.abs(x - pathX(z)) < ROAD_HALF + 3) continue;
      DECOR[zone.decor || zone.id]?.(v, x, z, rnd, pick, glow);
    }
  }
}

// The shining circle in the middle where every player appears: a golden ring with sweeping highlights
// and a warm glow on the ground that slowly pulses.
function addSpawnCircle(scene, x, z) {
  const radius = 9;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshBasicMaterial({
    map: glowMap(), color: '#fff6c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.12, z);
  floor.renderOrder = 2;
  scene.add(floor);
  const ring = addGlowRing(scene, x, z, radius, '#ffe14a');
  return (time) => {
    ring(time);
    floor.material.opacity = 0.6 + Math.sin(time * 2.4) * 0.2;
  };
}

function addLabels(scene) {
  const sign = makeTextPlane([
    { text: 'STEAL ZONE', size: 110, font: '"Luckiest Guy", sans-serif', weight: 400, fill: RAINBOW },
  ], 6.2);
  sign.position.set(0, GATE_BEAM_Y + 1.2, lineZ - 2.5);
  scene.add(sign);

  const safe = makeTextPlane([{ text: 'Safe Zone', size: 96, fill: '#f4f6f8' }], 6.4, { stroke: '#2a2d33' });
  safe.rotation.x = -Math.PI / 2;
  safe.position.set(0, 0.14, lineZ + 8);
  scene.add(safe);
}

export function buildStartingPlace(scene, physics, effects) {
  // the static world is built in chunks along the road so far chunks can be skipped (see Game.cull)
  const v = new ChunkedVoxels();
  const glow = new ChunkedVoxels(); // unlit, so lava, crystals and lamps seem to glow
  addGround(v);
  addPath(v);
  addWalls(v, physics, glow);
  addForestGate(v, physics);
  addZoneDecor(v, glow);
  addDecorTrees(v, glow, physics);
  const lamps = addWallDecor(scene, v, glow);
  // (machines with glowing parts go in before the glow is meshed)
  const fusion = addWinterFusion(scene, v, glow, physics, SHOPS.fusion.x, SHOPS.fusion.z);
  const fuse = addFuseMachine(scene, v, glow, physics, SHOPS.fuse.x, SHOPS.fuse.z);
  const dragon = addInfernoDragon(scene, physics, SHOPS.dragon.x, SHOPS.dragon.z);
  const weatherSign = addWeatherSign(scene, v, SHOPS.sign.x, SHOPS.sign.z);
  addSellExtras(v, SHOPS.sell.x, SHOPS.sell.z);
  const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const chunks = glow.meshes((c) => new THREE.Mesh(c.geometry(), glowMaterial));

  const shine = [
    addStall(scene, v, physics, { ...SHOPS.axe, name: 'SCYTHE SHOP', color: '#ff9a1a', fill: '#ffd21f' }),
    addStall(scene, v, physics, { ...SHOPS.sell, name: 'SELL', color: '#2fbf4a', fill: '#5ff04a' }),
    addStall(scene, v, physics, { ...SHOPS.trails, name: 'TRAILS SHOP', color: '#2b9be2', fill: '#6fd0ff' }),
    addFreePad(scene, SHOPS.free.x, SHOPS.free.z),
    fusion,
    addFeedbackBox(scene, v, physics, SHOPS.feedback.x, SHOPS.feedback.z),
    addLuckyDustMachine(scene, v, physics, SHOPS.luck.x, SHOPS.luck.z),
    addSpawnCircle(scene, SHOPS.spawn.x, SHOPS.spawn.z),
    addTrackBoards(scene, v, { x: TRACK_BOARD_X, z: lineZ - 6, wallTop: wallHeight }),
  ];
  const crate = addAlienCrate(scene, physics, SHOPS.crate.x, SHOPS.crate.z);
  const adBoard = addAdBoard(scene, v, { x: AD_BOARD_X, wallZ: lineZ + WALL_BLOCK_DEPTH / 2, baseY: 12 });
  const boardGlows = addLeaderboards(scene, v, LEADERBOARDS, { baseY: LEADERBOARD_BASE_Y });

  chunks.push(...v.meshes());
  scene.add(...chunks);
  addLabels(scene);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ color: '#3f8fdc' }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -32;
  scene.add(sea);

  // the giant eggs that grow with every scythe hit (they stand where the old trees were)
  const trees = new Map(TREES.map((t) => [t.id, new EggNodeView(t, scene, physics)]));
  const smoke = new SmokeSystem(scene);
  const plots = PLOTS.map((plot, i) => new PlotView(i, plot, scene, physics, effects, smoke));
  smoke.build();
  return { trees, plots, smoke, boardGlows, shine, chunks, lamps, crate, adBoard, fuse, dragon, weatherSign }; // lamps(time, lit): the wall lamps on / off
}
