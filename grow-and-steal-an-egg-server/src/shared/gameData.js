// Game constants shared by client and server. Keep both copies of this file identical.

export const GAME_NAME = 'Grow and Steal an Egg';
export const ROOM_NAME = 'starting_place';

// North is -Z. The safe zone (with the player plots) ends at lineZ; the forests are north of it.
// Each forest is longer than the one before it (world units along the road).
export const ZONE_DEPTHS = [300, 360, 420, 500, 580, 680, 800, 860, 920, 1000];
const LINE_Z = -20;

export const WORLD = {
  avatarScale: 0.78,
  halfX: 150,        // half width of the track and its biomes: the same as the opening into it
  startHalfX: 450,   // half width of the Starting Place (wider than the track)
  southZ: 560,
  lineZ: LINE_Z,
  northZ: LINE_Z - ZONE_DEPTHS.reduce((a, b) => a + b, 0), // the far end of the last forest
  openingHalf: 150, // half width of the gap in the north wall that leads to the track (= halfX)
  wallHeight: 72,   // the Starting Place walls (their columns of blocks vary a little around this)
};

// Half the width you can walk in at a point along the map: the Starting Place is wider than the track.
export const halfWidthAt = (z) => (z > WORLD.lineZ ? WORLD.startHalfX : WORLD.halfX);

// Seven frames: five in a row along the back (south)
// wall facing the track, and one by each side wall facing the middle (the starting point).
// Each plot has its own local frame: +x points out of the entrance, the pen is at -x, and
// everything in the plot is drawn PLOT_SCALE times its local size. rot turns that local frame
// about the vertical axis (like three.js rotation.y): 0 = entrance faces east, PI = west,
// PI / 2 = north (towards the track).
export const PLOT_SCALE = 1.5;
const BACK_ROW_Z = 360;     // the pens (168 deep) reach back to z = 528: a 30-unit gap before the south wall
const BACK_ROW_STEP = 120;  // a pen is 84 wide, so this leaves a 36-unit path between frames
const SIDE_Z = 230;         // level with the spawn; its pen (84 wide) spans z = 188..272
const SIDE_X = 250;         // its pen (168 deep) reaches back to x = 418: a 30-unit gap before the side wall
const FACE_TRACK = Math.PI / 2;
export const PLOTS = [
  { x: -SIDE_X, z: SIDE_Z, rot: 0 },                      // left, entrance facing the middle (east)
  ...[-2, -1, 0, 1, 2].map((i) => ({ x: i * BACK_ROW_STEP, z: BACK_ROW_Z, rot: FACE_TRACK })),
  { x: SIDE_X, z: SIDE_Z, rot: Math.PI },                // right, entrance facing the middle (west)
];
export const MAX_CLIENTS = PLOTS.length;

export const PLOT = {
  pad: { x: 20, z: 0, half: 8 },
  lever: { x: 12, z: 10 },
  machine: { x: 1, z: 0 },
  eggSpot: { x: -36, z: 0 },
  spawn: { x: 38, z: 0 },
  treadmill: { x: 24, z: -21 },
  penMinX: -112,
  penMaxX: -2,
  penHalfZ: 28,
};
// The belt of the treadmill, around PLOT.treadmill, in plot units.
export const TREADMILL_BELT = { halfX: 4.8, backZ: 4.6, frontZ: 6.5, height: 1.23 };

// Rounded so the right-angle turns give exact 0 / 1 / -1 (no 6e-17 left over from Math.cos).
const turn = (rot) => ({ c: Math.round(Math.cos(rot) * 1e9) / 1e9, s: Math.round(Math.sin(rot) * 1e9) / 1e9 });

export function plotToWorld(plot, lx, lz) {
  const { c, s } = turn(plot.rot);
  const X = lx * PLOT_SCALE, Z = lz * PLOT_SCALE;
  return { x: plot.x + X * c + Z * s, z: plot.z - X * s + Z * c };
}

// level 1..5: a bigger treadmill has a bigger belt (TREAD_SIZE)
export const TREAD_SIZE = [1, 1.1, 1.2, 1.3, 1.42];
export function onTreadmill(plot, x, y, z, level = 1) {
  const k = TREAD_SIZE[Math.min(4, Math.max(0, level - 1))];
  const { c, s } = turn(plot.rot);
  const dx = (x - plot.x) / PLOT_SCALE, dz = (z - plot.z) / PLOT_SCALE;
  const lx = dx * c - dz * s - PLOT.treadmill.x;
  const lz = dx * s + dz * c - PLOT.treadmill.z;
  return Math.abs(lx) <= TREADMILL_BELT.halfX * k && lz >= -TREADMILL_BELT.backZ * k && lz <= TREADMILL_BELT.frontZ * k
    && y > TREADMILL_BELT.height * PLOT_SCALE * 0.5;
}

// The shops and machines stand on both sides of where the track starts, between the track
// opening (x = +-150) and the side frames, leaving the centre lane open from the spawn to the track.
export const SHOPS = {
  // right of the track opening (+x), staggered back (near the front wall) and front
  axe: { x: 190, z: 25 },       // the Scythe Shop
  sign: { x: 232, z: 6 },       // the weather sign beside it
  invite: { x: 240, z: 72 },    // the Invite Friend pad with the dancing character
  fusion: { x: 290, z: 110 },   // the Winter Fusion machine
  trails: { x: 330, z: 25 },
  crate: { x: 385, z: 105 },    // the Alien Crate on its pad
  free: { x: 420, z: 30 },      // the big gift box (the Watch Ad board is on the wall above)
  // left of the track opening (-x)
  dragon: { x: -195, z: 35 },   // the Inferno Dragon for sale
  feedback: { x: -245, z: 100 },// the Feedback mailbox
  fuse: { x: -300, z: 30 },     // the Fuse Machine
  sell: { x: -355, z: 100 },
  luck: { x: -415, z: 35 },     // the Lucky Dust machine
  spawn: { x: 0, z: 210 },      // where everyone appears: the middle of the centre lane
};

export const RULES = {
  carryCap: 1,          // eggs held in the hands at once: one at a time
  padCap: 2,            // eggs the drop pad takes before the lever
  pickHoldMs: 700,      // hold E this long to pick an egg up
  treeRespawnMs: 25_000,
  groundEggMs: 30_000,   // eggs from a fallen tree vanish if nobody picks them up in time
  chopCooldownMs: 220,
  autoSwingMs: 330,
  shownPets: 12,
  minHits: 10,          // every tree takes at least this many hits, whatever the axe
  giantMinHits: 60,     // a giant tree takes at least this many
  giantRespawnMs: 90_000,
};

// The weather changes every 5 minutes: snow, then a normal sunny day, then a rain storm, then snow again...
export const WEATHER = { switchMs: 5 * 60_000, kinds: ['snow', 'day', 'rain'] };

export const RANGE = { pick: 11, pad: 11 * PLOT_SCALE, lever: 11 * PLOT_SCALE, hatch: 18 * PLOT_SCALE, shop: 30 };
// a giant egg is hit from beside it: its full-grown radius is about 6.5 * scale (see EggNodes.js)
export const chopRange = (tree) => 9 + 7 * tree.scale;

// shredding -> launch -> growing -> ready -> (E) -> hatching -> idle
export const STAGE_MS = { shredding: 2600, launch: 1400, growing: 5000, hatching: 1200 };

// Speed comes from running on the treadmill. Walk speed grows slowly with it.
export const walkSpeed = (speed) => 22 + 4 * Math.log2(1 + Math.max(0, speed));
export const treadmillGain = (speed) => 1 + Math.floor(speed * 0.015);
// Running anywhere also makes you faster, just slowly: every RUN_PER_GAIN units run earn runGain.
// About a third of the treadmill's rate, so it takes a lot of running, but it always adds up.
export const RUN_PER_GAIN = 110;
export const runGain = (speed) => 1 + Math.floor(speed * 0.004);

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
export const RARITY_COLOR = {
  Common: '#d7dde3', Uncommon: '#62e34b', Rare: '#49b8ff', Epic: '#c46bff', Legendary: '#ffc531', Mythic: '#ff4fd8',
};

// Every axe is clearly stronger than the one before it. Each stage has its axe: with it a tree
// takes about 10-20 hits; with the axe before it, far more.
//   Forest: Fists / Wooden   Autumn: Stone   Sakura: Iron   Ice: Golden (Diamond for speed)
export const AXES = [
  { id: 'fists', name: 'Fists', rarity: 'Common', power: 1, price: 0 },
  { id: 'wooden', name: 'Wooden Scythe', rarity: 'Common', power: 3, price: 25, head: '#a8743f', handle: '#6e4322' },
  { id: 'stone', name: 'Stone Scythe', rarity: 'Common', power: 30, price: 400, head: '#9aa1a8', handle: '#7a4a24' },
  { id: 'iron', name: 'Iron Scythe', rarity: 'Uncommon', power: 500, price: 8_000, head: '#59606a', handle: '#2f3238' },
  { id: 'gold', name: 'Golden Scythe', rarity: 'Rare', power: 9_000, price: 150_000, head: '#ffc93a', handle: '#7a4a24' },
  { id: 'diamond', name: 'Diamond Scythe', rarity: 'Epic', power: 60_000, price: 2_500_000, head: '#62f0ff', handle: '#2f3238' },
  { id: 'magma', name: 'Magma Scythe', rarity: 'Legendary', power: 500_000, price: 40_000_000, head: '#ff5a1a', handle: '#3a2a2a' },
  { id: 'celestial', name: 'Celestial Scythe', rarity: 'Mythic', power: 4_500_000, price: 600_000_000, head: '#fff3b0', handle: '#ffd21f' },
  { id: 'sugar', name: 'Sugar Scythe', rarity: 'Mythic', power: 40_000_000, price: 9_000_000_000, head: '#ff7ab8', handle: '#ffffff' },
  { id: 'spore', name: 'Spore Scythe', rarity: 'Mythic', power: 350_000_000, price: 140_000_000_000, head: '#3ad6a8', handle: '#5a3a24' },
  { id: 'galaxy', name: 'Galaxy Scythe', rarity: 'Mythic', power: 3_200_000_000, price: 2_200_000_000_000, head: '#8a5aff', handle: '#1a1a3c' },
];
export const axeById = (id) => AXES.find((a) => a.id === id) || AXES[0];

export const TREE_TYPES = {
  // hp is for a tree of scale 1; the stage's tree scale squared multiplies it.
  oak: { name: 'Oak', hp: 20, eggs: [['chicken', 70], ['stone', 30]] },
  birch: { name: 'Birch', hp: 26, eggs: [['stone', 60], ['chicken', 40]] },
  maple: { name: 'Maple', hp: 200, eggs: [['maple', 1]] },
  sakura: { name: 'Sakura', hp: 2_400, eggs: [['sakura', 1]] },
  coconut: { name: 'Ice Coconut', hp: 30_000, eggs: [['frost', 1]] },
  pine: { name: 'Snow Pine', hp: 30_000, eggs: [['frost', 1]] },
  seapalm: { name: 'Sea Palm', hp: 250_000, eggs: [['ocean', 1]] },
  lavatree: { name: 'Lava Tree', hp: 2_000_000, eggs: [['magma', 1]] },
  goldtree: { name: 'Golden Tree', hp: 15_000_000, eggs: [['heavenly', 1]] },
  candytree: { name: 'Cotton Candy Tree', hp: 120_000_000, eggs: [['candy', 1]] },
  mushroom: { name: 'Glow Mushroom', hp: 1_000_000_000, eggs: [['spore', 1]] },
  galaxytree: { name: 'Nebula Tree', hp: 9_000_000_000, eggs: [['cosmic', 1]] },
};
// From the 3rd forest on, one giant shining tree stands on the road in the middle of each forest:
// GIANT.scale times bigger, much tougher, and it drops a pile of extra eggs.
export const GIANT = { scale: 2.2, hpMult: 8, extraEggs: 8, fromZone: 2 };
// HP, eggs and rewards follow hpScale (how tough the forest is); tree.scale is only how big it looks.
const toughness = (tree) => tree.hpScale ?? tree.scale;
export const treeHp = (tree) => Math.round(TREE_TYPES[tree.type].hp * toughness(tree) ** 2 * (tree.giant ? GIANT.hpMult : 1));
// Damage of one hit: the axe's power, but never more than 1/minHits of the tree's HP.
export const chopDamage = (tree, power) => Math.max(1, Math.min(power, Math.floor(treeHp(tree) / (tree.giant ? RULES.giantMinHits : RULES.minHits))));
export const hitsToFell = (tree, hp, power) => Math.ceil(hp / chopDamage(tree, power));
// Cash for felling a tree, so new players can chop with their hands and save up for an axe.
export const treeReward = (tree) => Math.max(3, Math.round(treeHp(tree) ** 0.6));
// Bigger trees drop more eggs, and bigger ones: 2 from the first forest, up to 6 in the snow.
const baseScale = (tree) => (tree.giant ? toughness(tree) / GIANT.scale : toughness(tree));
export const eggsPerTree = (tree) => 2 + Math.round((baseScale(tree) - FIRST_TREE_SCALE) * 4) + (tree.giant ? GIANT.extraEggs : 0);
export const eggSize = (tree) => baseScale(tree) / FIRST_TREE_SCALE;
const FIRST_TREE_SCALE = 1.2;

export const EGG_ORDER = ['chicken', 'stone', 'maple', 'sakura', 'frost', 'ocean', 'magma', 'heavenly', 'candy', 'spore', 'cosmic', 'golden'];
// cash = $ per second of a Common pet from this egg at x1 Luck
export const EGGS = {
  chicken: { name: 'Forest Egg', rarity: 'Common', color: '#f2cfb4', lo: 0.9, hi: 1.6, cash: 2 },
  stone: { name: 'Mushroom Egg', rarity: 'Common', color: '#e2323c', lo: 1.1, hi: 2.2, cash: 3 },
  maple: { name: 'Savanna Egg', rarity: 'Rare', color: '#e8c47a', lo: 1.5, hi: 3, cash: 25 },
  sakura: { name: 'Crystal Egg', rarity: 'Epic', color: '#dff4ff', lo: 2, hi: 4, cash: 300 },
  frost: { name: 'Shell Egg', rarity: 'Legendary', color: '#ffd2bf', lo: 3, hi: 6, cash: 4000 },
  ocean: { name: 'Lollipop Egg', rarity: 'Legendary', color: '#ff9fd8', lo: 3.5, hi: 7, cash: 15_000 },
  magma: { name: 'Obsidian Egg', rarity: 'Mythic', color: '#ff5a1a', lo: 4, hi: 8, cash: 70_000 },
  heavenly: { name: 'Amber Egg', rarity: 'Mythic', color: '#f2a41a', lo: 4.5, hi: 9, cash: 300_000 },
  candy: { name: 'Bamboo Egg', rarity: 'Mythic', color: '#5fbf3a', lo: 5, hi: 10, cash: 1_400_000 },
  spore: { name: 'Sand Egg', rarity: 'Mythic', color: '#e0b060', lo: 5.5, hi: 11, cash: 6_500_000 },
  cosmic: { name: 'Void Dragon Egg', rarity: 'Mythic', color: '#2a1a3a', lo: 6, hi: 12, cash: 32_000_000 },
  golden: { name: 'Golden Egg', rarity: 'Mythic', color: '#ffcf33', lo: 4, hi: 8, cash: 50_000 },
  // shop-only: their pets earn fixed amounts (see FEATURED and LIMITED in progression.js)
  alien: { name: 'Alien Hunters Egg', rarity: 'Mythic', color: '#3a1a5a', lo: 1, hi: 1, cash: 25_000 },
  limited: { name: 'Limited Pet', rarity: 'Mythic', color: '#ff3a3a', lo: 1, hi: 1, cash: 1 },
};

export const PETS = {
  chicken: { name: 'Chicken', rarity: 'Common' },
  bunny: { name: 'Bunny', rarity: 'Common' },
  pig: { name: 'Pig', rarity: 'Common' },
  snail: { name: 'Snail', rarity: 'Uncommon' },
  cat: { name: 'Cat', rarity: 'Uncommon' },
  fox: { name: 'Fox', rarity: 'Rare' },
  bear: { name: 'Bear', rarity: 'Rare' },
  penguin: { name: 'Penguin', rarity: 'Rare' },
  unicorn: { name: 'Unicorn', rarity: 'Epic' },
  shark: { name: 'Shark', rarity: 'Epic' },
  polarBear: { name: 'Polar Bear', rarity: 'Legendary' },
  dragon: { name: 'Dragon', rarity: 'Legendary' },
  crab: { name: 'Crab', rarity: 'Rare' },
  dolphin: { name: 'Dolphin', rarity: 'Epic' },
  octopus: { name: 'Octopus', rarity: 'Legendary' },
  salamander: { name: 'Salamander', rarity: 'Epic' },
  phoenix: { name: 'Phoenix', rarity: 'Legendary' },
  lavabeast: { name: 'Lava Beast', rarity: 'Mythic' },
  cloudBunny: { name: 'Cloud Bunny', rarity: 'Epic' },
  pegasus: { name: 'Pegasus', rarity: 'Legendary' },
  goldenLion: { name: 'Golden Lion', rarity: 'Mythic' },
  cupcakeCat: { name: 'Cupcake Cat', rarity: 'Legendary' },
  gummyBear: { name: 'Gummy Bear', rarity: 'Mythic' },
  glowBeetle: { name: 'Glow Beetle', rarity: 'Legendary' },
  frog: { name: 'Giant Frog', rarity: 'Mythic' },
  alien: { name: 'Alien', rarity: 'Legendary' },
  starWolf: { name: 'Star Wolf', rarity: 'Mythic' },
  // the shop's Alien Hunters eggs and limited pets
  shadowRaptor: { name: 'Shadow Raptor', rarity: 'Epic' },
  voidStalker: { name: 'Void Stalker', rarity: 'Legendary' },
  nightPanther: { name: 'Night Panther', rarity: 'Legendary' },
  riftBeast: { name: 'Rift Beast', rarity: 'Mythic' },
  novaDragon: { name: 'Nova Dragon', rarity: 'Mythic' },
  xeno: { name: 'Xeno', rarity: 'Mythic' },
  infernoDragon: { name: 'Inferno Dragon', rarity: 'Mythic' },
  cyberWolf: { name: 'Cyber Wolf', rarity: 'Mythic' },
  // the animals hatching from the stages' eggs (see PetRigs.js)
  pigeon: { name: 'Pigeon', rarity: 'Common' },
  dog: { name: 'Dog', rarity: 'Common' },
  brownBear: { name: 'Brown Bear', rarity: 'Rare' },
  zebra: { name: 'Zebra', rarity: 'Uncommon' },
  lion: { name: 'Lion', rarity: 'Rare' },
  elephant: { name: 'Elephant', rarity: 'Epic' },
  manticore: { name: 'Manticore', rarity: 'Mythic' },
  tiger: { name: 'Tiger', rarity: 'Epic' },
  eagle: { name: 'Eagle', rarity: 'Rare' },
  mammoth: { name: 'Mammoth', rarity: 'Legendary' },
  whale: { name: 'Whale', rarity: 'Legendary' },
  koala: { name: 'Koala', rarity: 'Rare' },
  bigDragon: { name: 'Great Dragon', rarity: 'Mythic' },
  microraptor: { name: 'Microraptor', rarity: 'Epic' },
  ankylosaurus: { name: 'Ankylosaurus', rarity: 'Legendary' },
  tRex: { name: 'T-Rex', rarity: 'Mythic' },
  quetzalcoatlus: { name: 'Quetzalcoatlus', rarity: 'Mythic' },
};
const RARITY_CASH = { Common: 1, Uncommon: 1.6, Rare: 2.5, Epic: 4, Legendary: 7, Mythic: 12 };

export const PET_POOLS = {
  chicken: [['pigeon', 50], ['dog', 35], ['cat', 15]],                                  // Forest
  stone: [['dog', 45], ['cat', 35], ['brownBear', 20]],                                  // Forest (mushroom eggs)
  maple: [['zebra', 45], ['lion', 35], ['elephant', 15], ['manticore', 5]],             // Savanna
  sakura: [['polarBear', 50], ['eagle', 35], ['mammoth', 15]],                           // Frozen Peaks
  frost: [['dolphin', 50], ['shark', 35], ['whale', 15]],                                // Coral Reef
  ocean: [['koala', 50], ['tiger', 35], ['phoenix', 15]],                                // Sweet Land
  magma: [['phoenix', 50], ['manticore', 35], ['bigDragon', 15]],                        // Lava Lands
  heavenly: [['microraptor', 45], ['ankylosaurus', 30], ['tRex', 15], ['quetzalcoatlus', 10]], // Dino Valley
  candy: [['koala', 45], ['tiger', 35], ['eagle', 20]],                                  // Bamboo Grove
  spore: [['lion', 40], ['elephant', 35], ['manticore', 25]],                            // Scorched Desert
  cosmic: [['bigDragon', 50], ['quetzalcoatlus', 30], ['tRex', 20]],                     // The Void
  golden: [['dragon', 55], ['unicorn', 45]],
  alien: [['shadowRaptor', 45], ['voidStalker', 36], ['nightPanther', 15], ['riftBeast', 3.5], ['novaDragon', 0.5], ['xeno', 1]],
  limited: [['infernoDragon', 1], ['cyberWolf', 1]],
};

// The forests, from the safe zone northwards. speed = the recommended speed.
// Stages get longer as they go (ZONE_DEPTHS). All trees in a stage are the same size (treeScale);
// each stage's trees are taller and thicker than the last.
export const ZONE_DEPTH = 360; // the reference length: tree and animal counts scale with depth / ZONE_DEPTH
const zoneStart = (i) => WORLD.lineZ - ZONE_DEPTHS.slice(0, i).reduce((a, b) => a + b, 0);
const zoneSpan = (i) => ({ maxZ: zoneStart(i), minZ: zoneStart(i + 1), depth: ZONE_DEPTHS[i] });
export const ZONES = [
  { id: 'forest', name: 'Forest', difficulty: 'Easy', speed: 5, ...zoneSpan(0), treeScale: 1.2, hpScale: 1.2, trees: [['oak', 65], ['birch', 35]], animal: 'chicken', guards: 1, eggs: 5, decorTreeSize: 1, decorType: 'blocky', wall: 'maroon', ground: ['#8fe22c', '#86d826'] },
  { id: 'autumn', name: 'Savanna', difficulty: 'Medium', speed: 60, ...zoneSpan(1), treeScale: 1.4, hpScale: 1.55, trees: [['maple', 1]], animal: 'lion', guards: 1, eggs: 5, decorTreeSize: 1, decorType: 'acacia', wall: 'sandstone', ground: ['#efe0a8', '#e6d498'] },
  { id: 'sakura', name: 'Frozen Peaks', difficulty: 'Hard', speed: 400, ...zoneSpan(2), treeScale: 1.6, hpScale: 1.9, trees: [['sakura', 1]], animal: 'yeti', guards: 1, eggs: 5, decorType: 'snowBlocky', decorTreeSize: 0.85, wall: 'ice', decor: 'snow', ground: ['#f2f6fb', '#e6eef8'] },
  { id: 'snow', name: 'Coral Reef', difficulty: 'Extra Hard', speed: 2000, ...zoneSpan(3), treeScale: 1.75, hpScale: 2.1, trees: [['pine', 55], ['coconut', 45]], animal: 'crab', guards: 1, eggs: 5, decorType: 'coral', decorTreeSize: 0.8, wall: 'reef', decor: 'coral', ground: ['#62d8f6', '#56ceef'] },
  // the sea floor: a sandy beach where it starts, then blue water, ice-blue palms, corals, octopuses and crabs
  { id: 'water', name: 'Sweet Land', difficulty: 'Insane', speed: 25_000, ...zoneSpan(4), treeScale: 1.9, hpScale: 2.35, trees: [['seapalm', 1]], animal: 'cobra', guards: 1, eggs: 5, decorType: 'candyBlocky', decorTreeSize: 0.8, wall: 'chocolate', decor: 'candy', ground: ['#f9bfe0', '#f3aed6'] },
  // dark ash ground with glowing lava rivers, black trees with burning canopies, lava beasts
  { id: 'volcano', name: 'Lava Lands', difficulty: 'Insane', speed: 150_000, ...zoneSpan(5), treeScale: 2, hpScale: 2.6, trees: [['lavatree', 1]], animal: 'mammoth', guards: 1, eggs: 5, decorType: 'deadTree', decorTreeSize: 0.8, wall: 'lavaRock', decor: 'lavaLand', ground: ['#2e2a30', '#28242a'] },
  // white marble ground, white trunks with golden canopies, pegasuses
  { id: 'heaven', name: 'Dino Valley', difficulty: 'Nightmare', speed: 1_000_000, ...zoneSpan(6), treeScale: 2.1, hpScale: 2.85, trees: [['goldtree', 1]], animal: 'tiger', guards: 1, eggs: 5, decorType: 'blocky', decorTreeSize: 0.8, wall: 'earth', decor: 'prehistoric', ground: ['#d9bf8a', '#cfb47e'] },
  // pink and white candy floor, candy-cane trunks with cotton-candy tops, gumdrops, gummy bears
  { id: 'candy', name: 'Bamboo Grove', difficulty: 'Impossible', speed: 8_000_000, ...zoneSpan(7), treeScale: 2.2, hpScale: 3, trees: [['candytree', 1]], animal: 'hydra', guards: 1, eggs: 5, decorType: 'bamboo', decorTreeSize: 0.8, wall: 'earth', decor: 'bamboo', ground: ['#e65ad8', '#dc4ecf'] },
  // a dark teal grove of giant spotted mushrooms glowing underneath, little glowing mushrooms, frogs
  { id: 'mushroom', name: 'Scorched Desert', difficulty: 'Mythical', speed: 60_000_000, ...zoneSpan(8), treeScale: 2.3, hpScale: 3.15, trees: [['mushroom', 1]], animal: 'scorpion', guards: 1, eggs: 5, decorType: 'cactus', decorTreeSize: 0.8, wall: 'sandstone', decor: 'desert', ground: ['#e8c47a', '#ddb86c'] },
  // a starry dark floor, trees with glowing nebula patches, crystal shards, aliens
  { id: 'galaxy', name: 'The Void', difficulty: 'Godly', speed: 500_000_000, ...zoneSpan(9), treeScale: 2.4, hpScale: 3.3, trees: [['galaxytree', 1]], animal: 'voidDragon', guards: 1, eggs: 5, decorType: 'obsidian', decorTreeSize: 0.9, wall: 'obsidian', decor: 'void', voidSky: true, ground: ['#ece4f6', '#e2d8f0'] },
];
export const zoneAt = (z) => (z > WORLD.lineZ ? null : ZONES.find((zone) => z > zone.minZ) || ZONES[ZONES.length - 1]);

// How hard a forest's trees are to chop: shown above its animals and on its gate.
export const DIFFICULTY_COLOR = {
  Easy: '#5ff04a', Medium: '#ffc21f', Hard: '#ff3b3b', 'Extra Hard': '#ff4fe0', 'Super Hard': '#35c8ff', Insane: '#ff7a1a', Nightmare: '#f4f6ff',
  Impossible: '#c86aff', Mythical: '#2fe6b8', Godly: '#ffe14a',
};

// The giant animals guarding each forest. speed in world units per second, fixed (not from the player).
// A starting player walks at 32.3 (walkSpeed(5)): they can outrun the animals of the first three
// forests only; from the Ice Forest on, the animals are faster than that, so you need more speed.
export const ANIMALS = {
  // the first two biomes each have one giant guard: a chicken, then a lion
  chicken: { name: 'Giant Chicken', speed: 25, scale: 7, reach: 12 },
  lion: { name: 'Giant Lion', speed: 27.5, scale: 6, reach: 13 },
  fox: { name: 'Fox', speed: 27.5, scale: 2.6, reach: 5 },
  unicorn: { name: 'Unicorn', speed: 30, scale: 2.2, reach: 5.5 },
  polarBear: { name: 'Polar Bear', speed: 62, scale: 1.5, reach: 6.5 },
  octopus: { name: 'Octopus', speed: 70, scale: 1.5, reach: 7 },
  crab: { name: 'Giant Crab', speed: 62, scale: 2.3, reach: 10 },
  voidDragon: { name: 'Void Dragon', speed: 110, scale: 1.7, reach: 13 },
  scorpion: { name: 'Giant Scorpion', speed: 100, scale: 1.5, reach: 11 },
  mammoth: { name: 'Mammoth', speed: 78, scale: 1.5, reach: 11 },
  tiger: { name: 'Sabre Tiger', speed: 90, scale: 1.5, reach: 10 },
  hydra: { name: 'Hydra', speed: 95, scale: 1.5, reach: 11 },
  yeti: { name: 'Yeti', speed: 30, scale: 3.4, reach: 12 },
  cobra: { name: 'King Cobra', speed: 70, scale: 1.7, reach: 11 },
  lavabeast: { name: 'Lava Beast', speed: 78, scale: 1.35, reach: 8 },
  pegasus: { name: 'Pegasus', speed: 88, scale: 1.3, reach: 8 },
  gummyBear: { name: 'Gummy Bear', speed: 92, scale: 1.25, reach: 8.5 },
  frog: { name: 'Giant Frog', speed: 98, scale: 1.4, reach: 9 },
  alien: { name: 'Alien', speed: 105, scale: 1.3, reach: 9.5 },
};
export const ANIMALS_PER_ZONE = 4; // per ZONE_DEPTH of forest (longer forests get a few more)
// The guard animals grow forest by forest: x1.3 in the first forest, about x4.2 in Heaven.
export const animalGrowth = (zoneIndex) => Math.min(5, 1.3 * 1.22 ** zoneIndex); // capped at x5
export const animalSize = (type) => {
  const i = ZONES.findIndex((z) => (z.animals || [z.animal]).includes(type));
  return animalGrowth(Math.max(0, i));
};

export const round2 = (v) => Math.round(v * 100) / 100;

export function pickWeighted(list, rnd = Math.random) {
  let roll = rnd() * list.reduce((sum, [, w]) => sum + w, 0);
  for (const [id, w] of list) {
    roll -= w;
    if (roll <= 0) return id;
  }
  return list[0][0];
}

export function rollLuck(type, rnd = Math.random) {
  const { lo, hi } = EGGS[type];
  return round2(lo + (hi - lo) * rnd());
}

// Luck of the new egg made by shredding these eggs.
export function combineLuck(eggs) {
  return round2(1 + eggs.reduce((sum, e) => sum + (e.luck - 1), 0) * 0.5);
}

// The new egg is as good as the best egg shredded, with a Luck-based chance of one tier better.
export function rollEggType(eggs, luck, rnd = Math.random) {
  const best = Math.max(...eggs.map((e) => EGG_ORDER.indexOf(e.type)));
  const upgrade = rnd() < Math.min(0.6, (luck - 1) * 0.15);
  return EGG_ORDER[Math.min(EGG_ORDER.length - 1, best + (upgrade ? 1 : 0))];
}

// Luck makes rarer pets likelier and every pet earn more.
export function rollPet(egg, luck, rnd = Math.random) {
  const pool = PET_POOLS[egg].map(([id, w]) => [id, w * Math.max(1, luck) ** (RARITIES.indexOf(PETS[id].rarity) * 0.5)]);
  const id = pickWeighted(pool, rnd);
  const cash = Math.max(1, Math.round(EGGS[egg].cash * RARITY_CASH[PETS[id].rarity] * Math.max(1, luck)));
  return { id, cash, egg };
}

// Pets from later stages are bigger: the first forest's chicks are small, the Ice Forest's beasts
// are huge. Older saves have no egg on the pet, so it falls back to the first egg that hatches it.
export const PET_SIZE = { chicken: 1, stone: 1.15, maple: 1.55, sakura: 2, frost: 2.6, ocean: 2.9, magma: 3.2, heavenly: 3.5, candy: 3.6, spore: 3.8, cosmic: 4, golden: 3.1, alien: 3.4, limited: 3.8 };
export function petSize(pet) {
  const egg = pet.egg && PET_SIZE[pet.egg] ? pet.egg : EGG_ORDER.find((e) => PET_POOLS[e].some(([id]) => id === pet.id));
  return PET_SIZE[egg] || 1;
}

// A pet can hatch mutated: it earns more and shows the mutation's name and colour.
export const MUTATIONS = {
  winter: { name: 'Winter', mult: 2, color: '#7fe8ff', weight: 60 },
  bloodMoon: { name: 'Blood Moon', mult: 3, color: '#ff4a4a', weight: 30 },
  alien: { name: 'Alien', mult: 5, color: '#c46bff', weight: 10 },
};
export const petLabel = (pet) => `${pet.mut && MUTATIONS[pet.mut] ? `${MUTATIONS[pet.mut].name} ` : ''}${PETS[pet.id]?.name || pet.id}`;

export const petIncome = (pets) => pets.reduce((sum, p) => sum + (p.cash || 0), 0);

const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa'];
export function formatNumber(n) {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) < 1000) return String(Math.floor(n));
  let i = 0;
  let v = n;
  while (Math.abs(v) >= 1000 && i < UNITS.length - 1) {
    v /= 1000;
    i++;
  }
  const digits = Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0;
  return `${Number(v.toFixed(digits))}${UNITS[i]}`;
}

function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The road runs straight up the middle of every forest.
export const ROAD_HALF = 24;
export const pathX = () => 0;

// every giant egg in every stage is drawn this big
export const EGG_NODE_SCALE = 1.6;
const TREES_PER_ZONE = 55;   // fewer trees, spread over longer stages
const MAX_TREES_PER_ZONE = 70; // keeps the far forests open (and light to draw)
const TREE_SPACING = 22; // times the stage's tree scale
const GATE_CLEARANCE = 10;

// Same seed on client and server, so both agree on every tree.
export const TREES = (() => {
  const rnd = seeded(20261111);
  const spreadX = WORLD.halfX - 14;
  const out = [];
  for (const zone of ZONES) {
    const minZ = zone.minZ + GATE_CLEARANCE, maxZ = zone.maxZ - GATE_CLEARANCE - (zone.id === 'forest' ? 14 : 0);
    let placed = 0;
    // zone.eggs: a set number of giant eggs; otherwise longer biomes have more, up to a cap
    const wanted = zone.eggs ?? Math.min(MAX_TREES_PER_ZONE, Math.round(TREES_PER_ZONE * zone.depth / ZONE_DEPTH));
    for (let tries = 0; placed < wanted && tries < 9000; tries++) {
      const x = -spreadX + rnd() * spreadX * 2;
      const z = minZ + rnd() * (maxZ - minZ);
      if (Math.abs(x - pathX(z)) < ROAD_HALF + 12 * EGG_NODE_SCALE) continue; // keep a wide clear strip beside the road
      if (out.some((t) => Math.hypot(t.x - x, t.z - z) < TREE_SPACING * EGG_NODE_SCALE * 1.6)) continue; // spread out
      out.push({ id: `t${out.length}`, type: pickWeighted(zone.trees, rnd), zone: zone.id, x, z, scale: EGG_NODE_SCALE, hpScale: zone.hpScale });
      placed++;
    }
  }
  return out; // no extra-large eggs: every stage has 5 eggs of the same size
})();

// The scenery trees in each stage (not hit: they stand between the giant eggs). Each stage has one
// grove (trees close together in one spot, on one side of the road) and a few single trees. Shared
// so the client draws them and the server keeps the guards from walking through their trunks.
// r = the trunk's radius, for walking into it.
const GROVE_TREES = 9;
const GROVE_RADIUS = 34;
const GROVE_GAP = 11;      // how close the grove's trees stand to each other
const LONE_TREES = 4;
const DECOR_TREE_SIZE = 1.35; // a little taller than the stage's giant guard
const TRUNK_W = { birch: 3, coconut: 2.8, seapalm: 2.8, pine: 3.4, lavatree: 4.6, mushroom: 5.4, blocky: 4.4, acacia: 2.4, deadTree: 3, bamboo: 3, cactus: 3.4, obsidian: 6 };
export const decorTrunkRadius = (type, scale) => ((TRUNK_W[type] ?? 4) / 2 + 0.4) * scale;
export const DECOR_TREES = (() => {
  const rnd = seeded(4242);
  const out = [];
  for (const zone of ZONES) {
    const placed = [];
    const free = (x, z, gap) => Math.abs(x - pathX(z)) >= ROAD_HALF + 14
      && Math.abs(x) <= WORLD.halfX - 14
      && !TREES.some((t) => Math.hypot(t.x - x, t.z - z) < 14 + 9 * t.scale) // room round the eggs
      && !placed.some((p) => Math.hypot(p.x - x, p.z - z) < gap);
    const plant = (x, z) => {
      const type = zone.decorType || pickWeighted(zone.trees, rnd);
      const scale = zone.treeScale * (zone.decorTreeSize ?? DECOR_TREE_SIZE) * (0.85 + rnd() * 0.3);
      const tree = { id: `decor${out.length}`, zone: zone.id, type, x, z, scale, r: decorTrunkRadius(type, scale) };
      out.push(tree);
      placed.push(tree);
    };
    const side = rnd() < 0.5 ? -1 : 1;
    const cx = side * (ROAD_HALF + 14 + (WORLD.halfX - ROAD_HALF - 28) / 2);
    const cz = zone.minZ + zone.depth * (0.3 + rnd() * 0.4);
    for (let i = 0, tries = 0; i < GROVE_TREES && tries < 200; tries++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * GROVE_RADIUS;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!free(x, z, GROVE_GAP)) continue;
      plant(x, z);
      i++;
    }
    for (let i = 0, tries = 0; i < LONE_TREES && tries < 200; tries++) {
      const x = -WORLD.halfX + 18 + rnd() * (WORLD.halfX * 2 - 36);
      const z = zone.minZ + 14 + rnd() * (zone.maxZ - zone.minZ - 28);
      if (Math.hypot(x - cx, z - cz) < GROVE_RADIUS + 40 || !free(x, z, 40)) continue;
      plant(x, z);
      i++;
    }
  }
  return out;
})();

// How wide a guard animal is (its body's radius), for bumping into trees.
export const animalRadius = (type) => ANIMALS[type].scale * animalSize(type) * 1.7;

export const ANIMAL_SPAWNS = (() => {
  const rnd = seeded(777);
  const out = [];
  for (const zone of ZONES) {
    // zone.guards: a set number of guards (the giant ones), otherwise by the forest's length
    const count = zone.guards ?? Math.round(ANIMALS_PER_ZONE * zone.depth / ZONE_DEPTH);
    for (let i = 0; i < count; i++) {
      out.push({
        type: zone.animals ? zone.animals[i % zone.animals.length] : zone.animal, zone: zone.id,
        x: -WORLD.halfX + 40 + rnd() * (WORLD.halfX * 2 - 80),
        z: zone.minZ + 25 + rnd() * (zone.maxZ - zone.minZ - 50),
      });
    }
  }
  return out;
})();
