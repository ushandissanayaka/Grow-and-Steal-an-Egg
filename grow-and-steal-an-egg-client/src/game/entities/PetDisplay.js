// Block animals that hatch from eggs and wander around their owner's pen.

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';
import { PET_RIGS } from './PetRigs.js';
import { animateRig, buildRig } from './GuardRigs.js';
import { makeBillboard } from '../util/canvasText.js';
import { PETS, PLOT, RARITY_COLOR, formatNumber, petSize } from '../../shared/gameData.js';

const WHITE = '#ffffff', BLACK = '#17181c';

function eyes(v, x, y, z, gap, size = 0.5) {
  for (const side of [-1, 1]) v.box(x + side * gap, y, z, size, size, 0.12, BLACK);
}
function legs(v, color, w, h, dx, front, back) {
  for (const side of [-1, 1]) {
    v.box(side * dx, 0, front, w, h, w, color);
    v.box(side * dx, 0, back, w, h, w, color);
  }
}

// Every builder faces +Z and stands on y = 0.
const BUILDERS = {
  bunny(v) {
    legs(v, '#f2f2f2', 0.7, 0.8, 0.7, 0.8, -0.9);
    v.box(0, 0.8, 0, 2.2, 2, 2.8, WHITE);
    v.box(0, 2.2, 1.3, 1.9, 1.8, 1.7, WHITE);
    for (const side of [-1, 1]) {
      v.box(side * 0.5, 4, 1.1, 0.5, 2.4, 0.4, WHITE, { rz: side * 0.12 });
      v.box(side * 0.5, 4.2, 1.32, 0.28, 1.8, 0.05, '#ffb3cf', { rz: side * 0.12 });
    }
    v.box(0, 1.4, -1.55, 0.9, 0.9, 0.5, '#f4f4f4');
    v.box(0, 2.8, 2.18, 0.34, 0.26, 0.1, '#ff8fb6');
    eyes(v, 0, 3.2, 2.17, 0.5, 0.34);
  },
  snail(v) {
    v.box(0, 0, 0.4, 1.6, 1, 4.4, '#ffb6c8');
    v.box(0, 1, 2.1, 1.4, 1.6, 1, '#ffb6c8');
    for (const side of [-1, 1]) v.box(side * 0.4, 2.6, 2.3, 0.22, 1, 0.22, '#ff9fb8');
    v.box(0, 1, -0.6, 2.2, 3.4, 3.2, '#d98a8a');
    v.box(0, 1.6, -0.6, 2.3, 2.2, 2, '#b86a6a');
    v.box(0, 2.1, -0.6, 2.4, 1.1, 1, '#d98a8a');
    eyes(v, 0, 3.6, 2.42, 0.4, 0.3);
  },
  unicorn(v) {
    legs(v, '#f6f6ff', 0.8, 2, 0.75, 1.4, -1.4);
    v.box(0, 2, 0, 2.2, 2, 4.2, '#fbfbff');
    v.box(0, 3.4, 2, 1.4, 2.4, 1.4, '#fbfbff', { rx: 0.35 });
    v.box(0, 4.6, 2.9, 1.6, 1.6, 2.2, '#fbfbff');
    v.box(0, 6, 3.4, 0.45, 1.8, 0.45, '#ffd34a', { rx: 0.35 });
    const mane = ['#ff5fa8', '#5fd0ff', '#ffe14a', '#8a6bff'];
    mane.forEach((c, i) => v.box(0, 3.6 + i * 0.7, 1.5 - i * 0.15, 0.5, 0.8, 0.9, c));
    mane.forEach((c, i) => v.box(0, 2.6 - i * 0.5, -2.3 - i * 0.2, 0.5, 0.7, 0.6, c));
    eyes(v, 0, 5.3, 4.02, 0.55, 0.34);
  },
  polarBear(v) {
    legs(v, '#e8eef3', 1.5, 2, 1.5, 2, -2);
    v.box(0, 2, 0, 5.2, 4, 6.6, '#f6f9fc');
    v.box(0, 3.6, 3.7, 3.8, 3.4, 3, '#f6f9fc');
    v.box(0, 4, 5.4, 1.8, 1.4, 0.8, '#eef3f7');
    v.box(0, 4.8, 5.85, 0.8, 0.5, 0.2, BLACK);
    for (const side of [-1, 1]) v.box(side * 1.5, 7, 3.4, 1, 0.9, 0.6, '#e8eef3');
    eyes(v, 0, 5.8, 5.22, 0.95, 0.5);
  },
  // a tall square white chicken: head and body one block, big square eyes, a wide orange beak,
  // a red wattle under it, a red comb on top, little wings and orange feet (also the stage 1 guard)
  chicken(v) {
    const SHADE = '#e9ecef', ORANGE = '#f5a21a', RED = '#d8233a';
    for (const side of [-1, 1]) {
      v.box(side * 0.7, 0, 0.2, 0.35, 0.7, 0.35, ORANGE);                  // legs
      v.box(side * 0.7, 0, 0.55, 0.8, 0.22, 1, ORANGE);                    // feet
      v.box(side * 1.62, 1.6, -0.1, 0.35, 1.4, 1.8, SHADE);                // wings
    }
    v.box(0, 0.7, 0, 3, 4.2, 2.8, WHITE);                                  // the body and head
    v.box(0, 0.7, -1.2, 2.7, 3.2, 0.6, SHADE);                             // the back, a shade darker
    v.box(0, 3.1, 1.75, 1.8, 0.75, 0.9, ORANGE);                           // the beak
    v.box(0, 2.35, 1.5, 0.75, 0.85, 0.35, RED);                            // the wattle
    v.box(0, 4.9, 0.4, 0.5, 0.7, 1.3, RED);                                // the comb
    for (const side of [-1, 1]) v.box(side * 0.75, 3.75, 1.42, 0.62, 0.78, 0.1, BLACK); // square eyes
  },

  pig(v) {
    legs(v, '#ee9eb0', 0.8, 1, 0.8, 1, -1);
    v.box(0, 1, 0, 2.8, 2.2, 3.6, '#f7b0c0');
    v.box(0, 1.5, 2.2, 2.2, 2, 1.4, '#f7b0c0');
    v.box(0, 1.9, 3, 1.1, 0.8, 0.3, '#e9879d');
    for (const side of [-1, 1]) v.box(side * 0.8, 3.5, 2, 0.6, 0.5, 0.3, '#ee9eb0');
    eyes(v, 0, 2.9, 2.93, 0.6, 0.34);
  },
  cat(v) {
    legs(v, '#f0a24a', 0.7, 1.1, 0.7, 1, -1);
    v.box(0, 1.1, 0, 2.2, 1.8, 3.4, '#f7b35c');
    v.box(0, 2, 2, 2.4, 2, 2, '#f7b35c');
    for (const side of [-1, 1]) v.box(side * 0.8, 4, 2, 0.7, 0.8, 0.5, '#e8933a');
    v.box(0, 2, -2.2, 0.5, 2.6, 0.5, '#e8933a', { rx: -0.5 });
    eyes(v, 0, 3, 3.03, 0.55, 0.4);
  },
  fox(v) {
    legs(v, '#2a2320', 0.6, 1.2, 0.7, 1.1, -1.1);
    v.box(0, 1.2, 0, 2.1, 1.8, 3.6, '#ef6a24');
    v.box(0, 2, 2.2, 2.2, 1.9, 1.8, '#ef6a24');
    v.box(0, 2, 3.4, 1.1, 0.9, 1, WHITE);
    v.box(0, 2.6, 3.95, 0.4, 0.34, 0.14, BLACK);
    for (const side of [-1, 1]) v.box(side * 0.75, 3.9, 2.2, 0.7, 1, 0.4, '#d9531b');
    v.box(0, 1.6, -2.8, 1.2, 1.2, 2.4, '#ef6a24', { rx: 0.45 });
    v.box(0, 2.5, -4, 1, 1, 1, WHITE, { rx: 0.45 });
    eyes(v, 0, 3.2, 3.13, 0.55, 0.34);
  },
  penguin(v) {
    for (const side of [-1, 1]) v.box(side * 0.6, 0, 0.3, 0.9, 0.4, 1.3, '#f4a31e');
    v.box(0, 0.4, 0, 2.6, 3.8, 2.3, '#1f2a3d');
    v.box(0, 0.6, 1.16, 1.9, 3, 0.1, WHITE);
    for (const side of [-1, 1]) v.box(side * 1.55, 1.5, 0, 0.45, 2.1, 1.1, '#1f2a3d');
    v.box(0, 3.6, 1.3, 0.8, 0.45, 0.8, '#f4a31e');
    eyes(v, 0, 3.6, 1.2, 0.7, 0.34);
  },
  bear(v) {
    legs(v, '#a874e0', 1.5, 2, 1.5, 2, -2);
    v.box(0, 2, 0, 5.4, 4.2, 6.4, '#e6d0f7');
    v.box(0, 4, 3.6, 4.4, 4, 3.4, '#e6d0f7');
    v.box(0, 4.6, 5.4, 2, 1.5, 0.8, WHITE);
    v.box(0, 5.5, 5.85, 0.9, 0.6, 0.2, BLACK);
    for (const side of [-1, 1]) v.box(side * 1.9, 7.8, 3.4, 1.3, 1.2, 0.8, '#c9aaf0');
    eyes(v, 0, 6.3, 5.33, 1.1, 0.7);
  },
  shark(v) {
    v.box(0, 0.7, 0, 3.2, 3, 7, '#5da9d9');
    v.box(0, 0.7, 0, 2.8, 1.3, 6.8, '#e8f2f8');
    v.box(0, 1.1, 4.3, 2.6, 2.2, 2, '#5da9d9');
    v.box(0, 0.9, 5, 2.3, 0.3, 0.9, WHITE);
    v.box(0, 3.5, -0.4, 0.5, 2.2, 2.2, '#4a93c2', { rx: -0.4 });
    v.box(0, 1.7, -4.3, 0.5, 3.4, 1.6, '#4a93c2', { rx: 0.3 });
    for (const side of [-1, 1]) v.box(side * 2.2, 1, 1.2, 2, 0.4, 1.6, '#4a93c2', { rz: side * -0.3 });
    eyes(v, 0, 2.4, 5.33, 1, 0.44);
  },
  // a red octopus: a big round head, big eyes, eight curling tentacles
  octopus(v) {
    const RED = '#e8293c', DARK = '#c41f30', SPOT = '#ff6a78';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const x = Math.cos(a), z = Math.sin(a);
      v.box(x * 1.6, 0.6, z * 1.6, 1, 1.2, 1.2, i % 2 ? RED : DARK, { ry: -a });
      v.box(x * 2.6, 0.2, z * 2.6, 0.9, 0.8, 1.1, RED, { ry: -a, rz: 0.4 });
      v.box(x * 3.4, 0.5, z * 3.4, 0.7, 0.7, 0.9, DARK, { ry: -a, rz: 0.9 }); // the curled tip
    }
    v.box(0, 1, 0, 3.6, 2, 3.6, RED);
    v.box(0, 2.6, -0.3, 4.4, 3.8, 4.2, RED);
    v.box(0, 6.1, -0.5, 3.6, 1, 3.4, DARK);
    for (const [x, y] of [[-1.2, 4.6], [1.4, 5.2], [0.2, 6.2]]) v.box(x, y, -2.45, 0.7, 0.7, 0.1, SPOT);
    for (const side of [-1, 1]) {
      v.box(side * 1, 3.6, 1.82, 1.3, 1.5, 0.2, WHITE);
      v.box(side * 1.05, 3.5, 1.95, 0.7, 0.9, 0.1, BLACK);
    }
  },
  crab(v) {
    const SHELL = '#ff5a2a', DARK = '#d8401a';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) v.box(side * 2.4, 0, -0.9 + i * 0.9, 1.6, 0.5, 0.45, DARK, { rz: side * -0.5 });
      v.box(side * 2.3, 0.9, 2, 0.8, 0.8, 1.6, SHELL, { ry: side * 0.4 });
      v.box(side * 2.6, 1.2, 3.1, 1.6, 1.4, 1.2, SHELL);        // the claw
      v.box(side * 2.6, 2.1, 3.5, 1.2, 0.5, 0.9, DARK);
      v.box(side * 0.6, 2.4, 1.3, 0.3, 1.2, 0.3, DARK);        // eye stalks
      v.box(side * 0.6, 3.5, 1.3, 0.6, 0.6, 0.6, WHITE);
      v.box(side * 0.6, 3.6, 1.62, 0.32, 0.36, 0.06, BLACK);
    }
    v.box(0, 0.6, 0, 4, 1.8, 3, SHELL);
    v.box(0, 2.4, 0, 3.2, 0.5, 2.4, DARK);
  },
  dolphin(v) {
    const BLUE = '#6aa8d8', BELLY = '#e8f2f8';
    v.box(0, 0.6, 0, 2.4, 2.4, 5.6, BLUE);
    v.box(0, 0.6, 0.4, 2, 1, 5, BELLY);
    v.box(0, 1, 3.6, 1.8, 1.7, 1.8, BLUE);
    v.box(0, 0.9, 4.9, 1, 0.7, 1.2, BLUE);                     // the beak
    v.box(0, 2.9, -0.4, 0.4, 1.6, 1.6, '#5a96c6', { rx: -0.5 });
    v.box(0, 1.4, -3.4, 0.5, 1.6, 1.3, BLUE, { rx: 0.6 });
    v.box(0, 2, -4, 3, 0.4, 1, '#5a96c6');                      // the tail fluke
    for (const side of [-1, 1]) v.box(side * 1.5, 0.6, 1.4, 1.4, 0.3, 1, '#5a96c6', { rz: side * -0.4 });
    eyes(v, 0, 2.1, 4.51, 0.75, 0.36);
  },
  // ---- Volcano
  // a red beast with white bone ribs and flaming spikes down its back and tail
  lavabeast(v) {
    const RED = '#b81f24', DARK = '#7a1418', BONE = '#f4ead8', FIRE = ['#ffd21f', '#ff8a1a', '#ff4a1a'];
    for (const side of [-1, 1]) {
      for (const z of [2.2, -2.2]) {
        v.box(side * 1.6, 0, z, 1.4, 2.6, 1.4, DARK);
        v.box(side * 1.6, 0, z + 0.5, 1.6, 0.6, 0.9, BONE);              // bone claws
      }
    }
    v.box(0, 2.4, 0, 4, 3.4, 6.8, RED);
    for (let i = 0; i < 5; i++) v.box(0, 2.2, -2.4 + i * 1.3, 4.3, 3.2, 0.45, BONE);      // the ribs
    v.box(0, 4, 0, 1.4, 0.5, 6.4, BONE);                                   // the spine
    for (let i = 0; i < 6; i++) v.box(0, 4.4, -2.6 + i * 1.1, 0.6, 1.4 + (i % 2) * 0.8, 0.7, FIRE[i % 3], { rx: -0.35 });
    v.box(0, 3.4, 4.2, 2.8, 2.6, 2.6, RED);                                 // the head
    v.box(0, 3.2, 5.6, 2.2, 1.6, 1.4, BONE);                                // skull snout
    for (const side of [-1, 1]) {
      v.box(side * 0.6, 2.7, 6.25, 0.3, 0.6, 0.2, BONE);                     // fangs
      v.box(side * 1, 5.2, 3.8, 0.5, 1.6, 0.5, FIRE[1], { rx: -0.5, rz: side * 0.3 }); // horns
      v.box(side * 0.7, 4.2, 5.41, 0.5, 0.4, 0.1, '#ffd21f');               // glowing eyes
    }
    v.box(0, 3.4, -4.4, 1.2, 1.2, 2.6, RED, { rx: 0.5 });                   // the tail
    v.box(0, 5, -5.6, 1, 1, 2.4, BONE, { rx: 0.9 });
    for (let i = 0; i < 3; i++) v.box(0, 6 + i * 0.6, -6.2 - i * 0.4, 0.8, 1.4, 0.8, FIRE[i], { rx: 0.6 });
  },
  salamander(v) {
    const ORANGE = '#ff7a1a', SPOT = '#ffd21f';
    for (const side of [-1, 1]) for (const z of [1.2, -1.2]) v.box(side * 1.3, 0, z, 0.8, 0.8, 0.7, '#e85a12', { rz: side * 0.3 });
    v.box(0, 0.6, 0, 2, 1.2, 4, ORANGE);
    v.box(0, 0.7, 2.6, 1.8, 1.1, 1.6, ORANGE);
    v.box(0, 0.6, -2.8, 0.9, 0.8, 2.2, ORANGE, { rx: 0.15 });
    v.box(0, 0.5, -4.2, 0.5, 0.5, 1.4, SPOT);
    for (const [x, z] of [[-0.5, 0.8], [0.5, -0.6], [-0.4, -1.4], [0.4, 1.6]]) v.box(x, 1.8, z, 0.5, 0.06, 0.5, SPOT);
    eyes(v, 0, 1.5, 3.41, 0.55, 0.32);
  },
  phoenix(v) {
    const RED = '#e8293c', ORANGE = '#ff8a1a', GOLD = '#ffd21f';
    for (const side of [-1, 1]) v.box(side * 0.5, 0, 0, 0.3, 1.2, 0.3, GOLD);
    v.box(0, 1.2, 0, 2.2, 2.4, 2.8, RED);
    v.box(0, 3, 1, 1.7, 1.7, 1.7, RED);
    v.box(0, 3.3, 2, 0.6, 0.4, 0.7, GOLD);                                 // beak
    for (let i = 0; i < 3; i++) v.box(0, 4.6 + i * 0.4, 0.7 - i * 0.5, 0.4, 0.9, 0.4, [GOLD, ORANGE, RED][i], { rx: -0.4 }); // crest
    for (const side of [-1, 1]) {
      v.box(side * 2.2, 2.2, 0, 2.6, 0.4, 2, ORANGE, { rz: side * 0.5 });   // wings
      v.box(side * 3.6, 3.2, -0.2, 1.8, 0.35, 1.6, GOLD, { rz: side * 0.7 });
    }
    for (let i = 0; i < 3; i++) v.box((i - 1) * 0.6, 1.4 - i * 0.2, -2.6, 0.5, 0.4, 2.6, [RED, ORANGE, GOLD][i], { rx: 0.35, ry: (i - 1) * 0.3 }); // tail flames
    eyes(v, 0, 3.4, 1.86, 0.5, 0.3);
  },
  // ---- Heaven
  // a white winged horse with a tan mane
  pegasus(v) {
    const WHITE_ = '#f6f2ec', TAN = '#c89a5a', HOOF = '#5a3a24';
    for (const side of [-1, 1]) {
      for (const z of [1.6, -1.6]) {
        v.box(side * 0.8, 0.4, z, 0.8, 2.4, 0.8, WHITE_);
        v.box(side * 0.8, 0, z, 0.9, 0.5, 0.9, HOOF);
      }
      // the wings: three long feathered panels, swept back and up
      v.box(side * 2.4, 4.4, -0.2, 3.2, 0.4, 2.6, WHITE_, { rz: side * 0.45 });
      v.box(side * 4.6, 5.6, -0.6, 2.6, 0.35, 2.2, '#efe6da', { rz: side * 0.65 });
      v.box(side * 6.2, 6.8, -1, 1.8, 0.3, 1.8, TAN, { rz: side * 0.85 });
    }
    v.box(0, 2.6, 0, 2.2, 2, 4.4, WHITE_);
    v.box(0, 3.8, 2.2, 1.3, 2.4, 1.3, WHITE_, { rx: 0.4 });                 // neck
    v.box(0, 5, 3.1, 1.5, 1.4, 2.2, WHITE_);                                // head
    for (let i = 0; i < 4; i++) v.box(0, 4 + i * 0.5, 1.8 - i * 0.2, 0.5, 0.8, 0.8, TAN); // mane
    for (const side of [-1, 1]) v.box(side * 0.4, 6.1, 2.6, 0.3, 0.7, 0.3, WHITE_);  // ears
    v.box(0, 2.6, -2.6, 0.7, 2.4, 0.7, TAN, { rx: 0.4 });                   // tail
    eyes(v, 0, 5.4, 4.22, 0.55, 0.34);
  },
  cloudBunny(v) {
    const CLOUD = '#ffffff', SOFT = '#eef4ff', GOLD = '#ffd21f';
    v.box(0, 0, 0, 2.8, 2.2, 3, CLOUD);
    for (const [x, z] of [[-1.4, 0.8], [1.4, 0.6], [-1.2, -1], [1.3, -1.1]]) v.box(x, 0.4, z, 1.2, 1.4, 1.2, SOFT); // puffs
    v.box(0, 2.2, 1, 2.2, 2, 2, CLOUD);
    for (const side of [-1, 1]) v.box(side * 0.55, 4.2, 0.9, 0.55, 2, 0.45, CLOUD, { rz: side * 0.15 });
    for (const [dx, dz] of [[0, 0.85], [0, -0.85], [0.85, 0], [-0.85, 0]]) {
      v.box(dx, 6.6, 0.9 + dz, dx ? 0.4 : 2.1, 0.25, dz ? 0.4 : 2.1, GOLD);  // the halo (a ring)
    }
    v.box(0, 2.8, 2.05, 0.34, 0.26, 0.1, '#ff8fb6');
    eyes(v, 0, 3.4, 2.03, 0.5, 0.34);
  },
  goldenLion(v) {
    const GOLD = '#ffc21f', MANE = '#e8941a', LIGHT = '#ffe27a';
    legs(v, GOLD, 1.1, 1.8, 1.1, 1.6, -1.6);
    v.box(0, 1.8, 0, 3, 2.4, 4.8, GOLD);
    v.box(0, 2.2, 2.6, 3.6, 3.6, 1.6, MANE);                                // the mane
    v.box(0, 2.6, 3.4, 2.4, 2.4, 1.4, LIGHT);                               // the face
    v.box(0, 2.6, 4.15, 1.1, 0.8, 0.3, GOLD);
    v.box(0, 3, 4.32, 0.5, 0.35, 0.1, BLACK);
    v.box(0, 5.1, 2.6, 2.6, 0.3, 0.6, '#fff6a8');                           // halo above the mane
    v.box(0, 2.6, -2.8, 0.5, 0.5, 1.8, GOLD, { rx: -0.6 });
    v.box(0, 3.4, -3.5, 0.8, 0.8, 0.8, MANE);
    eyes(v, 0, 3.4, 4.11, 0.6, 0.34);
  },
  // the giant lion that guards the second biome: tan body, big shaggy two-tone mane, tufted tail
  // the stage 2 guard: a tan lion with a blue-and-gold striped headdress over its head, a light face,
  // a long tail with a dark tuft
  lion(v) {
    const FUR = '#d9a45a', FUR_DARK = '#c08844', FACE = '#e8c08a', BLUE = '#2a4fa8', GOLD = '#f2c23a', TUFT = '#6a3a1e';
    legs(v, FUR_DARK, 1.2, 2, 1.2, 1.8, -1.8);
    for (const side of [-1, 1]) for (const z of [1.8, -1.8]) v.box(side * 0.9, 0, z + 0.25, 1.3, 0.5, 1.6, FUR); // paws
    v.box(0, 2, -0.2, 3.4, 2.6, 5.2, FUR);                                   // body
    v.box(0, 2.1, -0.2, 3.5, 0.9, 4.6, FUR_DARK);
    // the headdress: striped flaps down both sides of the face and a striped hood on top
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) v.box(side * 1.75, 1.5 + i * 0.6, 2.9, 0.7, 0.6, 1.8, i % 2 ? GOLD : BLUE);
    }
    for (let i = 0; i < 5; i++) v.box(-1.6 + i * 0.8, 5.1, 2.9, 0.8, 0.9, 2, i % 2 ? GOLD : BLUE);
    v.box(0, 5.9, 2.9, 3, 0.5, 1.8, BLUE);
    // the face
    v.box(0, 2.7, 3.4, 2.8, 2.6, 1.4, FACE);
    v.box(0, 2.9, 4.2, 1.3, 1, 0.6, FUR);
    v.box(0, 3.4, 4.52, 0.6, 0.4, 0.12, BLACK);                               // nose
    v.box(0, 2.75, 4.5, 0.7, 0.12, 0.1, '#7a3a1a');                           // mouth
    eyes(v, 0, 4.1, 4.11, 0.72, 0.38);
    // the tail, curving up, with a dark tuft
    v.box(0, 3.2, -3.4, 0.45, 0.45, 2.4, FUR, { rx: -0.6 });
    v.box(0, 4.5, -4.4, 0.9, 0.9, 0.9, TUFT);
  },

  // ---- Candy Land
  // a chunky red gummy bear (also the forest guard)
  gummyBear(v) {
    const GUM = '#ff3b5c', LIGHT = '#ff7a90';
    for (const side of [-1, 1]) {
      v.box(side * 1.1, 0, 0.2, 1.4, 2, 1.6, GUM);                         // legs
      v.box(side * 2, 2.6, 0.4, 1.2, 2.4, 1.2, GUM, { rz: side * -0.35 }); // arms
      v.box(side * 1.2, 7.1, 0, 1.2, 1.2, 0.9, GUM);                       // ears
    }
    v.box(0, 1.6, 0, 3.6, 3.8, 2.8, GUM);
    v.box(0, 2.2, 1.42, 2.2, 2.2, 0.1, LIGHT);                             // tummy
    v.box(0, 5.2, 0, 3.4, 2.6, 2.6, GUM);
    v.box(0, 5.4, 1.4, 1.4, 1, 0.5, LIGHT);                                // snout
    v.box(0, 5.95, 1.66, 0.6, 0.4, 0.1, BLACK);
    eyes(v, 0, 6.6, 1.32, 0.75, 0.4);
  },
  // a cat in a cupcake case with pink icing and a cherry
  cupcakeCat(v) {
    const CASE = '#5fd0ff', CAT = '#fff0e0', ICING = '#ff9fd8';
    v.box(0, 0, 0, 3, 1.8, 3, CASE);
    for (let i = 0; i < 4; i++) v.box(-1.2 + i * 0.8, 0, 1.52, 0.35, 1.8, 0.1, '#3aa8e0'); // case ridges
    v.box(0, 1.8, 0, 3.2, 1, 3.2, ICING);
    v.box(0, 2.8, 0.2, 2.4, 2, 2.2, CAT);
    for (const side of [-1, 1]) v.box(side * 0.75, 4.8, 0.2, 0.6, 0.7, 0.4, CAT);
    v.box(0, 5.2, -0.4, 0.7, 0.7, 0.7, '#e8293c');                         // the cherry on top
    v.box(0, 3.3, 1.32, 0.3, 0.22, 0.1, '#ff8fb6');
    eyes(v, 0, 3.8, 1.31, 0.5, 0.32);
  },
  // ---- Glow Mushroom Grove
  // a big green frog with a mushroom on its head (also the forest guard)
  frog(v) {
    const GREEN = '#4cc23a', BELLY = '#d8f08a', CAP = '#e8293c';
    for (const side of [-1, 1]) {
      v.box(side * 2, 0, -0.8, 1.6, 1.6, 2.6, GREEN);                       // big back legs
      v.box(side * 2.6, 0, 1.4, 1.6, 0.4, 1, GREEN);                        // feet
      v.box(side * 1.2, 0, 1.6, 0.8, 1.4, 0.8, GREEN);                      // front legs
      v.box(side * 1.1, 4.4, 1, 1.4, 1.4, 1.4, GREEN);                      // eye bumps
      v.box(side * 1.1, 4.7, 1.72, 0.9, 0.9, 0.1, WHITE);
      v.box(side * 1.1, 4.7, 1.78, 0.5, 0.6, 0.1, BLACK);
    }
    v.box(0, 0.6, 0, 3.8, 3.4, 3.8, GREEN);
    v.box(0, 0.8, 1.92, 2.6, 2, 0.1, BELLY);
    v.box(0, 2.4, 1.94, 2.2, 0.25, 0.1, '#1f6a1a');                        // the wide mouth
    v.box(0, 5, -0.2, 1.8, 0.7, 1.8, CAP);                                   // mushroom hat
    v.box(0.4, 5.7, 0, 0.4, 0.1, 0.4, WHITE);
  },
  // a round beetle with a glowing teal shell
  glowBeetle(v) {
    const SHELL = '#2fd6a8', DARK = '#1a5a4a';
    for (const side of [-1, 1]) for (const z of [-0.9, 0, 0.9]) v.box(side * 1.7, 0, z, 1.2, 0.5, 0.3, DARK, { rz: side * -0.5 });
    v.box(0, 0.5, 0, 3, 1.8, 3.6, SHELL);
    v.box(0, 2.3, 0, 2.4, 0.5, 3, '#7fffe0');
    v.box(0, 0.6, 2.1, 1.8, 1.2, 0.8, DARK);                                 // head
    for (const side of [-1, 1]) v.box(side * 0.5, 1.6, 2.6, 0.2, 1.4, 0.2, DARK, { rx: 0.6 }); // feelers
    v.box(0, 0.5, 0, 0.12, 2.35, 3.62, DARK);                                // shell split
    eyes(v, 0, 1.3, 2.52, 0.45, 0.3);
  },
  // ---- Galaxy
  // a green alien with a big head and antennae (also the forest guard)
  alien(v) {
    const SKIN = '#7de83a', SUIT = '#5a4ae8';
    for (const side of [-1, 1]) {
      v.box(side * 0.7, 0, 0, 0.9, 2.2, 0.9, SUIT);
      v.box(side * 1.6, 2.6, 0, 0.7, 2.2, 0.7, SKIN, { rz: side * 0.3 });
      v.box(side * 0.9, 7.6, 0, 0.25, 1.6, 0.25, SKIN, { rz: side * 0.35 });  // antennae
      v.box(side * 1.25, 9.1, 0, 0.6, 0.6, 0.6, '#ffe14a');
      v.box(side * 0.8, 5.6, 1.62, 1.1, 1.5, 0.1, BLACK);                  // big black eyes
      v.box(side * 0.65, 5.9, 1.68, 0.3, 0.3, 0.05, WHITE);
    }
    v.box(0, 2.2, 0, 2.4, 2.8, 1.8, SUIT);
    v.box(0, 2.6, 0.92, 1, 1, 0.1, '#ffe14a');                              // badge
    v.box(0, 4.6, 0, 3.6, 3.4, 3.2, SKIN);                                   // the big head
    v.box(0, 4.6, 1.62, 0.8, 0.15, 0.05, '#1f6a1a');
  },
  // ---------------------------------------------------------------- the shop's Alien Hunters
  // black-and-purple hunters with glowing purple stripes, eyes and claws
  shadowRaptor(v) {
    const B = '#1a1424', P = '#b04aff';
    for (const side of [-1, 1]) {
      v.box(side * 0.7, 0, -0.3, 0.7, 2.2, 0.8, B);
      v.box(side * 0.7, 0, 0.3, 0.9, 0.3, 1.2, P);                          // glowing claws
      v.box(side * 1.1, 3, 1.6, 0.4, 1.2, 0.4, B, { rx: 0.6 });              // little arms
    }
    v.box(0, 2, -0.4, 2, 2.4, 3, B);
    v.box(0, 3.6, 1.4, 1.6, 1.6, 2.6, B);
    v.box(0, 3.4, 2.9, 1.2, 0.9, 1.2, '#241a34');
    for (const side of [-1, 1]) v.box(side * 0.55, 4.1, 2.72, 0.35, 0.3, 0.1, P);
    v.box(0, 2.6, -2.6, 0.8, 0.8, 2.4, B, { rx: 0.4 });
    for (let i = 0; i < 3; i++) v.box(0, 4.4 - i * 0.6, 0.6 - i * 1, 0.25, 0.7, 0.3, P);  // spine
  },
  voidStalker(v) {
    const B = '#1e1628', P = '#c86aff';
    legs(v, B, 0.9, 1.8, 0.95, 1.4, -1.4);
    v.box(0, 1.8, 0, 2.6, 1.8, 4.4, B);
    for (const z of [-1.2, 0, 1.2]) v.box(0, 3.62, z, 2.62, 0.08, 0.4, P);   // stripes
    v.box(0, 2.4, 2.6, 2.2, 2, 1.8, B);
    for (const side of [-1, 1]) {
      v.box(side * 0.7, 4.4, 2.4, 0.4, 1.4, 0.4, B, { rz: side * 0.4 });    // horns
      v.box(side * 0.55, 3, 3.52, 0.4, 0.3, 0.1, P);
    }
    v.box(0, 2.4, -2.8, 0.6, 0.6, 2, B, { rx: -0.6 });
    v.box(0, 3.4, -3.6, 0.7, 0.7, 0.7, P);
  },
  nightPanther(v) {
    const B = '#16121e', P = '#a84aff';
    legs(v, B, 0.7, 1.6, 0.8, 1.5, -1.5);
    v.box(0, 1.6, 0, 2, 1.5, 4.4, B);
    v.box(0, 2.2, 2.5, 1.8, 1.5, 1.6, B);
    for (const side of [-1, 1]) {
      v.box(side * 0.6, 3.7, 2.3, 0.5, 0.5, 0.3, B);
      v.box(side * 0.5, 2.7, 3.32, 0.4, 0.25, 0.1, P);
      v.box(side * 1.02, 2.2, 0, 0.05, 0.3, 3, P);                          // side stripe
    }
    v.box(0, 2.6, -3.2, 0.4, 0.4, 2.4, B, { rx: -0.8 });
  },
  riftBeast(v) {
    const B = '#1a1424', P = '#d07aff';
    legs(v, B, 1.2, 2.2, 1.2, 1.6, -1.6);
    v.box(0, 2.2, 0, 3, 2.4, 4.6, B);
    v.box(0, 3.4, 2.8, 2.4, 2.2, 2, B);
    for (const side of [-1, 1]) {
      v.box(side * 2.6, 4.4, -0.4, 3.4, 0.3, 2.6, '#2a1e3c', { rz: side * 0.5 }); // wings
      v.box(side * 3.6, 5.1, -0.4, 1.2, 0.32, 2.4, P, { rz: side * 0.5 });
      v.box(side * 0.6, 4, 3.82, 0.4, 0.3, 0.1, P);
      v.box(side * 0.8, 5, 2.4, 0.4, 1.4, 0.4, P, { rz: side * 0.3 });
    }
    v.box(0, 2.8, -3, 0.8, 0.8, 2.4, B, { rx: -0.3 });
  },
  novaDragon(v) {
    const B = '#140e1e', P = '#c84aff', G = '#35e8ff';
    legs(v, B, 1.2, 2, 1.4, 1.8, -1.8);
    v.box(0, 2, 0, 3.6, 3, 5.6, B);
    v.box(0, 4.2, 3.3, 1.6, 2.6, 1.6, B, { rx: 0.35 });
    v.box(0, 6.2, 4.5, 2.6, 1.8, 2.8, B);
    v.box(0, 6.1, 6.1, 1.8, 0.9, 0.9, '#241a34');
    for (const side of [-1, 1]) {
      v.box(side * 0.7, 6.6, 5.92, 0.4, 0.3, 0.1, G);
      v.box(side * 0.9, 8, 3.8, 0.4, 1.6, 0.4, P, { rx: -0.5 });
      v.box(side * 3.8, 4.4, -0.4, 4.4, 0.35, 4, '#2a1e3c', { rz: side * 0.55 });
      v.box(side * 4.6, 5, -0.4, 2.4, 0.38, 3.6, P, { rz: side * 0.55 });
    }
    for (let i = 0; i < 4; i++) v.box(0, 3.6, 2 - i * 1.4, 0.3, 0.8, 0.4, G);
    v.box(0, 2.4, -4.2, 1.2, 1.2, 3.4, B, { rx: 0.25 });
  },
  xeno(v) {
    const B = '#1a1428', P = '#ff4ad8', G = '#35e8ff';
    legs(v, B, 1, 2.2, 1, 1.6, -1.6);
    v.box(0, 2.2, 0, 2.8, 2.2, 5, B);
    v.box(0, 3.2, 2.9, 2.6, 2.4, 2.2, B);
    v.box(0, 2.8, 4.3, 1.4, 1.2, 1.2, '#241a34');
    for (const side of [-1, 1]) {
      v.box(side * 0.8, 5.6, 2.6, 0.6, 1.2, 0.5, B);
      v.box(side * 0.6, 3.8, 4.02, 0.45, 0.35, 0.1, G);
      v.box(side * 1.42, 3, 0, 0.06, 0.4, 4, P);                            // glowing stripes
      v.box(side * 1.42, 3.8, -0.6, 0.06, 0.3, 2.6, P);
    }
    v.box(0, 4.42, 0.4, 2.2, 0.2, 3.4, P);                                   // glowing back
    v.box(0, 3, -3.2, 0.8, 0.8, 2.6, B, { rx: -0.5 });
    v.box(0, 4.1, -4.1, 0.8, 0.8, 0.8, G);
  },
  // the shop's limited pets
  infernoDragon(v) {
    const R = '#d8202e', D = '#8a141e', S = '#c8c8d0';
    legs(v, D, 1.3, 2, 1.5, 2, -2);
    v.box(0, 2, 0, 4.6, 3.6, 6.2, R);
    v.box(0, 2.4, 3.1, 2.8, 2.6, 0.2, S);                                   // silver belly plate
    v.box(0, 4.3, 3.6, 1.9, 3, 1.9, R, { rx: 0.35 });
    v.box(0, 6.7, 5, 3.2, 2.2, 3.3, R);
    v.box(0, 6.6, 7, 2.2, 1.1, 1, '#ffb13b');
    for (const side of [-1, 1]) {
      v.box(side * 1, 8.8, 4.2, 0.6, 2, 0.6, S, { rx: -0.4 });             // silver horns
      v.box(side * 4.8, 5.6, -0.4, 5.2, 0.4, 4.6, D, { rz: side * 0.6 });
      v.box(side * 6.4, 7, -0.4, 0.6, 0.6, 4.6, R, { rz: side * 0.6 });
    }
    v.box(0, 2.6, -4.8, 1.5, 1.5, 4.2, D, { rx: 0.25 });
    v.box(0, 2.2, -7, 1.6, 1.6, 0.8, '#ffb13b');
    eyes(v, 0, 7.7, 6.68, 0.95, 0.5);
  },
  cyberWolf(v) {
    const B = '#22262e', C = '#35e8e0', M = '#4a505c';
    legs(v, M, 0.9, 2, 0.9, 1.6, -1.6);
    v.box(0, 2, 0, 2.6, 2.2, 5, B);
    v.box(0, 3, 2.8, 2.6, 2.4, 2.2, B);
    v.box(0, 2.6, 4.3, 1.4, 1.1, 1.4, M);
    for (const side of [-1, 1]) {
      v.box(side * 0.8, 5.4, 2.6, 0.6, 1.4, 0.5, B, { rz: side * 0.2 });
      v.box(side * 0.6, 3.6, 3.92, 0.45, 0.3, 0.1, C);
      v.box(side * 1.32, 2.6, 0, 0.06, 0.3, 4, C);                          // glowing lines
    }
    for (let i = 0; i < 4; i++) v.box(0, 3.3 + (i % 2) * 0.3, 1.2 - i * 1.1, 0.4, 1, 0.5, C, { rx: -0.5 }); // spikes
    v.box(0, 2.8, -3.2, 0.7, 0.7, 2.4, B, { rx: -0.5 });
    v.box(0, 3.9, -4.1, 0.6, 0.6, 0.6, C);
  },
  // a dark wolf speckled with stars and a glowing mane
  starWolf(v) {
    const FUR = '#1f1a4a', STAR = '#ffffff', GLOW = '#7fe8ff';
    legs(v, FUR, 0.9, 2, 0.9, 1.6, -1.6);
    v.box(0, 2, 0, 2.6, 2.2, 5, FUR);
    v.box(0, 3, 2.8, 2.8, 2.6, 2.2, FUR);
    v.box(0, 2.6, 4.2, 1.4, 1.2, 1.4, FUR);
    v.box(0, 3.2, 4.92, 0.5, 0.4, 0.1, BLACK);
    for (const side of [-1, 1]) v.box(side * 0.8, 5.6, 2.6, 0.7, 1.2, 0.5, FUR);
    v.box(0, 3.6, 1.6, 3.2, 2.2, 1, GLOW);                                   // glowing mane
    for (const [x, y, z] of [[-1, 4.2, -1], [1.1, 3.8, 0.4], [0, 4.25, -2], [-0.6, 2.4, 1.3], [1.32, 2.8, -1.4]]) v.box(x, y, z, 0.35, 0.35, 0.35, STAR);
    v.box(0, 2.8, -3, 0.8, 0.8, 2.2, FUR, { rx: -0.5 });
    v.box(0, 3.9, -3.9, 0.6, 0.6, 0.6, GLOW);
    eyes(v, 0, 3.8, 3.92, 0.7, 0.36);
  },
  dragon(v) {
    legs(v, '#a91f2e', 1.3, 2, 1.5, 2, -2);
    v.box(0, 2, 0, 4.8, 3.6, 6.6, '#d9293d');
    v.box(0, 4.3, 3.9, 1.9, 3, 1.9, '#d9293d', { rx: 0.35 });
    v.box(0, 6.7, 5.2, 3.2, 2.2, 3.3, '#d9293d');
    v.box(0, 6.8, 7.2, 2.2, 1.1, 1, '#ffb13b');
    for (const side of [-1, 1]) {
      v.box(side * 1, 8.8, 4.4, 0.6, 1.8, 0.6, '#ffd21f', { rx: -0.4 });
      v.box(side * 4.6, 5, -0.4, 5, 0.4, 4.4, '#7c1a4f', { rz: side * 0.5 });
    }
    v.box(0, 2.6, -5, 1.5, 1.5, 4.2, '#a91f2e', { rx: 0.25 });
    eyes(v, 0, 7.9, 6.88, 0.95, 0.5);
  },
};

const geometries = new Map();
function petGeometry(id) {
  if (!geometries.has(id)) {
    const v = new Voxels();
    BUILDERS[id](v);
    geometries.set(id, v);
  }
  return geometries.get(id);
}

// A pet's model: the jointed rig for the stage animals (standing still), the block model otherwise.
export function createPetMesh(id) {
  if (PET_RIGS[id]) return buildRig(PET_RIGS[id]).group;
  return petGeometry(id).mesh({ receiveShadow: false });
}

// sea animals float a little off the ground
const SWIMMERS = new Set(['dolphin', 'shark', 'whale']);

export function disposeObject(object) {
  object.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

const PET_SPEED = 3.2;
const POP_SECONDS = 0.7;
const PEN_MARGIN = 6;

// size: bigger pets keep further from the fence
function randomPenSpot(size = 1) {
  const m = Math.min(PEN_MARGIN * size, PLOT.penHalfZ - 2);
  return {
    x: PLOT.penMinX + m + Math.random() * (PLOT.penMaxX - PLOT.penMinX - m * 2),
    z: (Math.random() * 2 - 1) * (PLOT.penHalfZ - m),
  };
}

function petLabel(pet) {
  const rarity = PETS[pet.id]?.rarity || 'Common';
  const sprite = makeBillboard([
    { text: `$${formatNumber(pet.cash)}/s`, size: 64, fill: '#7dff3f' },
    { text: rarity, size: 46, fill: RARITY_COLOR[rarity] },
  ], 3.4);
  return sprite;
}

// One animal inside a pen. x/z are in the plot's local frame.
class Pet {
  constructor(pet, parent, from) {
    const id = pet.id;
    this.size = petSize(pet); // later stages hatch bigger animals
    this.rig = PET_RIGS[id] ? buildRig(PET_RIGS[id]) : null; // legs, wings and tails that move
    this.mesh = this.rig ? this.rig.group : createPetMesh(id);
    this.float = SWIMMERS.has(id) ? 1.4 : 0;
    this.label = petLabel(pet);
    this.labelHeight = new THREE.Box3().setFromObject(this.mesh).max.y + 2.6;
    parent.add(this.label);
    this.x = from.x;
    this.z = from.z;
    this.pop = from.pop ? 0 : 1;
    this.wait = Math.random() * 2;
    this.target = null;
    this.t = Math.random() * 10;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;
    parent.add(this.mesh);
  }

  update(dt) {
    this.move(dt);
    if (this.rig) animateRig(this.rig.limbs, this.t * 6 / Math.sqrt(this.size), this.target ? 1 : 0.15, false, this.t);
    if (this.float && this.pop >= POP_SECONDS) this.mesh.position.y += (this.float + Math.sin(this.t * 1.6) * 0.4) * this.size;
    this.label.position.set(this.mesh.position.x, this.mesh.position.y + this.labelHeight * this.mesh.scale.y + (this.size - 1) * 0.5, this.mesh.position.z);
  }

  move(dt) {
    this.t += dt;
    if (this.pop < POP_SECONDS) {
      this.pop = Math.min(POP_SECONDS, this.pop + dt);
      const k = this.pop / POP_SECONDS;
      this.mesh.scale.setScalar(this.size * k * (1 + Math.sin(k * Math.PI) * 0.55));
      this.mesh.position.y = Math.sin(k * Math.PI) * 7;
      return;
    }
    this.mesh.scale.setScalar(this.size);
    if (!this.target) {
      this.mesh.position.y = 0;
      this.wait -= dt;
      if (this.wait <= 0) {
        this.target = randomPenSpot(this.size);
      }
      return;
    }
    const dx = this.target.x - this.x, dz = this.target.z - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) {
      this.target = null;
      this.wait = 1.5 + Math.random() * 4;
      return;
    }
    const speed = PET_SPEED * Math.sqrt(this.size); // big animals take bigger steps
    this.x += (dx / d) * speed * dt;
    this.z += (dz / d) * speed * dt;
    this.mesh.position.set(this.x, this.rig ? 0 : Math.abs(Math.sin(this.t * 7 / Math.sqrt(this.size))) * 0.45 * this.size, this.z); // rigs walk with their legs
    this.mesh.rotation.y = Math.atan2(dx, dz);
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    disposeObject(this.mesh);
    this.label.parent?.remove(this.label);
    this.label.material.map.dispose();
    this.label.material.dispose();
  }
}

const petKey = (pet) => `${pet.id}:${pet.cash}`;

export class PetPen {
  constructor(parent) {
    this.parent = parent;
    this.list = [];
    this.ids = null;
  }

  // pets: [{ id, cash }] in hatch order. A pet added at the end after the first sync pops out of the egg.
  sync(pets) {
    const keys = pets.map(petKey);
    const key = keys.join(',');
    if (key === this.ids) return;
    const first = this.ids === null;
    this.ids = key;

    // One new pet: keep the others where they are and pop the new one out of the egg.
    const known = this.list.map((entry) => entry.key);
    const older = keys.slice(0, -1);
    const overflow = known.length - older.length;
    if (!first && keys.length && overflow >= 0 && older.every((k, i) => known[i + overflow] === k)) {
      for (const entry of this.list.splice(0, overflow)) entry.pet.dispose();
      const pet = pets[pets.length - 1];
      this.list.push({ key: petKey(pet), pet: new Pet(pet, this.parent, { x: PLOT.eggSpot.x, z: PLOT.eggSpot.z, pop: true }) });
      return;
    }

    while (this.list.length) this.list.pop().pet.dispose();
    for (const pet of pets) this.list.push({ key: petKey(pet), pet: new Pet(pet, this.parent, randomPenSpot(petSize(pet))) });
  }

  clear() {
    while (this.list.length) this.list.pop().pet.dispose();
    this.ids = null;
  }

  update(dt) {
    for (const { pet } of this.list) pet.update(dt);
  }
}
