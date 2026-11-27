// The stage guards, built with joints so they move like animals: legs swing from the hip, arms from
// the shoulder, wings flap, claws pinch, the cobra's body ripples. Each rig is a body (one mesh) plus
// limbs; a limb is its own mesh hanging from a pivot (its joint), drawn in the pivot's own space.
// Built in the same units as the pet models (the guard's size is set by AnimalView).

import * as THREE from 'three';
import { Voxels } from '../util/bake.js';

const WHITE = '#ffffff', BLACK = '#17181c';

// limb kinds and how they move (see animateRig):
//   swing  - rotates about x (forward/back), like a leg or arm walking: amp, phase
//   flap   - rotates about z (out/in), like a wing: amp, side (+1 / -1)
//   pinch  - rotates about y, like a claw opening: amp, side
//   scuttle- a crab leg: lifts (z) and steps (y): amp, phase, side
//   wave   - a snake body piece: slides sideways in a travelling wave: amp, phase
//   sway   - a raised snake neck / head: turns a little side to side: amp
//   wag    - a tail: turns about y: amp

const RIGS = {
  // ---------------------------------------------------------------- stage 1: the giant chicken
  chicken: {
    body(v) {
      const SHADE = '#e9ecef', ORANGE = '#f5a21a', RED = '#d8233a';
      v.box(0, 0.7, 0, 3, 4.2, 2.8, WHITE);                                   // body and head
      v.box(0, 0.7, -1.2, 2.7, 3.2, 0.6, SHADE);                              // back, a shade darker
      v.box(0, 3.1, 1.75, 1.8, 0.75, 0.9, ORANGE);                            // beak
      v.box(0, 2.35, 1.5, 0.75, 0.85, 0.35, RED);                             // wattle
      v.box(0, 4.9, 0.4, 0.5, 0.7, 1.3, RED);                                 // comb
      for (const side of [-1, 1]) v.box(side * 0.75, 3.75, 1.42, 0.62, 0.78, 0.1, BLACK); // eyes
    },
    limbs: [-1, 1].flatMap((side) => [
      {
        kind: 'swing', pivot: [side * 0.7, 0.75, 0.2], amp: 0.7, phase: side > 0 ? 0 : Math.PI,
        build(v) { v.box(0, -0.75, 0, 0.35, 0.8, 0.35, '#f5a21a'); v.box(0, -0.75, 0.35, 0.8, 0.22, 1, '#f5a21a'); },
      },
      {
        kind: 'flap', pivot: [side * 1.5, 3, -0.1], amp: 0.5, side,
        build(v) { v.box(side * 0.12, -1.4, 0, 0.35, 1.4, 1.8, '#e9ecef'); },
      },
    ]),
  },

  // ---------------------------------------------------------------- stage 2: the lion
  lion: {
    body(v) {
      const FUR = '#d9a45a', FUR_DARK = '#c08844', FACE = '#e8c08a', BLUE = '#2a4fa8', GOLD = '#f2c23a';
      v.box(0, 2, -0.2, 3.4, 2.6, 5.2, FUR);
      v.box(0, 2.1, -0.2, 3.5, 0.9, 4.6, FUR_DARK);
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) v.box(side * 1.75, 1.5 + i * 0.6, 2.9, 0.7, 0.6, 1.8, i % 2 ? GOLD : BLUE);
      for (let i = 0; i < 5; i++) v.box(-1.6 + i * 0.8, 5.1, 2.9, 0.8, 0.9, 2, i % 2 ? GOLD : BLUE);
      v.box(0, 5.9, 2.9, 3, 0.5, 1.8, BLUE);
      v.box(0, 2.7, 3.4, 2.8, 2.6, 1.4, FACE);
      v.box(0, 2.9, 4.2, 1.3, 1, 0.6, FUR);
      v.box(0, 3.4, 4.52, 0.6, 0.4, 0.12, BLACK);
      v.box(0, 2.75, 4.5, 0.7, 0.12, 0.1, '#7a3a1a');
      for (const side of [-1, 1]) {
        v.box(side * 0.36, 3.95, 4.11, 0.45, 0.38, 0.06, WHITE);
        v.box(side * 0.36, 3.95, 4.15, 0.22, 0.24, 0.06, BLACK);
      }
    },
    limbs: [
      // a diagonal walk: front-left with back-right, front-right with back-left
      ...[[-1, 1.6, 0], [1, 1.6, Math.PI], [-1, -1.8, Math.PI], [1, -1.8, 0]].map(([side, z, phase]) => ({
        kind: 'swing', pivot: [side * 1.15, 2.1, z], amp: 0.55, phase,
        build(v) { v.box(0, -2.1, 0, 1.15, 2.2, 1.15, '#c08844'); v.box(0, -2.1, 0.25, 1.3, 0.5, 1.6, '#d9a45a'); },
      })),
      {
        kind: 'wag', pivot: [0, 3.6, -2.7], amp: 0.5,
        build(v) { v.box(0, -0.2, -1.2, 0.45, 0.45, 2.4, '#d9a45a', { rx: -0.6 }); v.box(0, 1, -2.1, 0.9, 0.9, 0.9, '#6a3a1e'); },
      },
    ],
  },

  // ---------------------------------------------------------------- stage 3: the yeti
  yeti: {
    body(v) {
      const FUR = '#f4f8fc', SHADE = '#dfe8f2', FACE = '#1f2a5a', ICE = '#8fe3ff', GLOW = '#5ff4ff';
      v.box(0, 3, 0, 4.6, 3.8, 3.2, FUR);                                     // torso
      v.box(0, 3.2, 1.5, 3.2, 2.6, 0.4, SHADE);                               // chest fur
      v.box(0, 6.6, 0.2, 3.4, 2.8, 2.9, FUR);                                 // head
      v.box(0, 6.9, 1.62, 2.4, 1.8, 0.2, FACE);                               // dark face
      for (const side of [-1, 1]) v.box(side * 0.55, 7.75, 1.74, 0.6, 0.4, 0.06, GLOW); // glowing eyes
      for (let i = 0; i < 4; i++) v.box(-0.6 + i * 0.4, 7.05, 1.74, 0.22, 0.3, 0.06, WHITE); // teeth
      v.box(0, 7.95, 1.6, 1.8, 0.2, 0.3, ICE);                                // ice brow
      // ice spikes on the head and shoulders
      // ice spikes standing straight up on the head, and angled out on the shoulders
      for (const [x, z, h] of [[-1.1, 0, 1.6], [-0.35, -0.2, 2], [0.4, -0.2, 1.8], [1.15, 0, 1.5]]) v.box(x, 8, z, 0.45, h, 0.45, ICE);
      for (const [x, r] of [[-2.2, -0.5], [2.2, 0.5]]) v.box(x, 6.8, -0.3, 0.45, 1.4, 0.45, ICE, { rz: r });
    },
    limbs: [
      // legs: the thigh swings from the hip, the shin bends back at the knee while the leg lifts
      ...[-1, 1].map((side) => ({
        kind: 'swing', pivot: [side * 1.15, 3.1, 0], amp: 0.6, phase: side > 0 ? 0 : Math.PI,
        build(v) { v.box(0, -1.6, 0, 1.8, 1.7, 1.9, '#f4f8fc'); },
        lower: {
          pivot: [0, -1.5, 0], bend: -0.9, // knee bends backwards
          build(v) { v.box(0, -1.6, 0, 1.6, 1.7, 1.7, '#1f2a5a'); v.box(0, -1.6, 0.35, 1.9, 0.6, 2.3, '#16204a'); },
        },
      })),
      // arms: the upper arm swings from the shoulder, the forearm bends forward at the elbow
      ...[-1, 1].map((side) => ({
        kind: 'swing', pivot: [side * 2.85, 6.4, 0], amp: 0.75, phase: side > 0 ? Math.PI : 0, // against the legs
        build(v) { v.box(0, -1.9, 0, 1.5, 2, 1.6, '#f4f8fc'); },
        lower: {
          pivot: [0, -1.8, 0], bend: 0.9, base: 0.25, // elbow bends forwards, a little bent even when still
          build(v) { v.box(0, -1.9, 0, 1.4, 1.9, 1.5, '#f4f8fc'); v.box(0, -2.8, 0.1, 1.6, 1.1, 1.7, '#1f2a5a'); },
        },
      })),
    ],
  },

  // ---------------------------------------------------------------- stage 4: the giant crab
  crab: {
    body(v) {
      const SHELL = '#e8241c', DARK = '#b8160e', LIGHT = '#ff6a4a';
      v.box(0, 1, 0, 5.2, 1.8, 4, SHELL);
      v.box(0, 2.8, 0, 4.4, 0.6, 3.4, DARK);
      v.box(0, 1, 2.02, 4.2, 0.9, 0.1, LIGHT);                                // the mouth edge
      for (const side of [-1, 1]) {
        v.box(side * 0.9, 2.8, 1.4, 0.35, 1.3, 0.35, DARK);                   // eye stalks
        v.box(side * 0.9, 4.1, 1.4, 1.2, 1, 0.9, WHITE);                      // big eyes
        v.box(side * 0.9, 4.25, 1.86, 0.55, 0.6, 0.06, BLACK);
      }
    },
    limbs: [
      ...[-1, 1].flatMap((side) => [-1.2, 0, 1.2].map((z, i) => ({
        kind: 'scuttle', pivot: [side * 2.4, 1.6, z], amp: 0.35, phase: i * 2.1 + (side > 0 ? 0 : Math.PI), side,
        build(v) {
          v.box(side * 1.1, -0.25, 0, 2.2, 0.5, 0.5, '#c81c12', { rz: side * -0.35 });
          v.box(side * 2.3, -1.6, 0, 0.45, 1.8, 0.45, '#b8160e', { rz: side * 0.25 });
        },
      }))),
      ...[-1, 1].map((side) => ({
        kind: 'pinch', pivot: [side * 2.2, 1.6, 2.1], amp: 0.35, side,
        build(v) {
          v.box(side * 0.7, -0.4, 0.8, 1, 0.9, 1.8, '#e8241c', { ry: side * 0.4 });
          v.box(side * 1.2, -0.7, 2.4, 2, 1.8, 1.8, '#e8241c');               // the claw
          v.box(side * 1.2, 0.6, 3, 1.4, 0.6, 1.4, '#b8160e');                // its pincer
        },
      })),
    ],
  },

  // ---------------------------------------------------------------- stage 6: the mammoth
  mammoth: {
    body(v) {
      const FUR = '#5a1e1e', DARK = '#3e1214', TUSK = '#f2ece0';
      v.box(0, 3.4, -0.4, 5.2, 4.4, 7, FUR);                                  // body
      v.box(0, 7.4, -1, 4.2, 1.4, 4, DARK);                                   // the hump
      v.box(0, 4.2, 3.6, 4, 4, 2.8, FUR);                                     // head
      v.box(0, 7.6, 3.4, 3.4, 1.2, 2.4, DARK);                                // hair on top
      for (const side of [-1, 1]) {
        v.box(side * 2.6, 4.4, 3.2, 0.6, 3.2, 2.4, DARK);                     // ears
        v.box(side * 1, 5.6, 5.02, 0.5, 0.5, 0.1, BLACK);                     // eyes
        // tusks curving out, forward and up
        v.box(side * 1.4, 2.4, 5.2, 0.6, 0.6, 2.2, TUSK, { rx: 0.3 });
        v.box(side * 1.5, 2.9, 6.4, 0.55, 1.6, 0.55, TUSK, { rx: -0.4 });
      }
    },
    limbs: [
      ...[[-1, 2.2, 0], [1, 2.2, Math.PI], [-1, -3, Math.PI], [1, -3, 0]].map(([side, z, phase]) => ({
        kind: 'swing', pivot: [side * 1.6, 2.6, z], amp: 0.45, phase,
        build(v) { v.box(0, -1.4, 0, 1.6, 1.5, 1.6, '#5a1e1e'); },
        lower: {
          pivot: [0, -1.3, 0], bend: -0.6,
          build(v) { v.box(0, -1.4, 0, 1.6, 1.5, 1.6, '#4a181a'); v.box(0, -1.4, 0, 1.9, 0.4, 1.9, '#2a0c0e'); },
        },
      })),
      {
        // the trunk, hanging from the face and swaying
        kind: 'wag', pivot: [0, 3.2, 5], amp: 0.35,
        build(v) { for (let i = 0; i < 4; i++) v.box(0, -1 - i * 1.1, 0.2 * i, 1.2 - i * 0.15, 1.2, 1.2 - i * 0.15, '#5a1e1e'); },
      },
    ],
  },

  // ---------------------------------------------------------------- stage 7: the sabre-tooth tiger
  tiger: {
    body(v) {
      const FUR = '#c8743a', DARK = '#8a4a22', LIGHT = '#f2d2a8';
      v.box(0, 2.4, -0.4, 3.2, 2.6, 6.4, FUR);                                // long body
      for (let i = 0; i < 4; i++) v.box(0, 4.95, -2.6 + i * 1.5, 3.3, 0.15, 0.4, DARK); // stripes
      v.box(0, 3, 3.4, 2.8, 2.6, 2.6, FUR);                                   // head
      v.box(0, 2.5, 4.6, 2, 1.4, 1, LIGHT);                                   // muzzle
      v.box(0, 3.3, 5.12, 0.7, 0.4, 0.1, BLACK);                              // nose
      for (const side of [-1, 1]) {
        v.box(side * 0.6, 1.4, 4.8, 0.35, 1.6, 0.35, '#f6f2e6');               // the sabre teeth
        v.box(side * 0.75, 3.9, 4.72, 0.5, 0.45, 0.08, '#f2c23a');             // eyes
        v.box(side * 1, 4.5, 3, 0.7, 0.7, 0.4, FUR);                          // ears
      }
    },
    limbs: [
      ...[[-1, 2, 0], [1, 2, Math.PI], [-1, -2.8, Math.PI], [1, -2.8, 0]].map(([side, z, phase]) => ({
        kind: 'swing', pivot: [side * 1.1, 2.2, z], amp: 0.7, phase,
        build(v) { v.box(0, -1.1, 0, 1, 1.2, 1.1, '#c8743a'); },
        lower: {
          pivot: [0, -1.1, 0], bend: z > 0 ? 0.8 : -0.8,
          build(v) { v.box(0, -1.1, 0, 0.9, 1.1, 1, '#b8662f'); v.box(0, -1.1, 0.25, 1.1, 0.4, 1.4, '#f2d2a8'); },
        },
      })),
      {
        kind: 'wag', pivot: [0, 3.2, -3.6], amp: 0.5,
        build(v) { v.box(0, 0, -1.6, 0.5, 0.5, 3.4, '#c8743a', { rx: 0.25 }); v.box(0, -0.4, -3.4, 0.6, 0.6, 0.8, '#8a4a22'); },
      },
    ],
  },

  // ---------------------------------------------------------------- stage 8: the three-headed dragon
  hydra: {
    body(v) {
      const SCALE = '#3a2a6a', BELLY = '#6a5a9a', WING = '#2a1e4a';
      v.box(0, 2.6, -0.4, 4.4, 3.2, 5.6, SCALE);
      v.box(0, 2.6, 2.4, 3.6, 2.4, 0.2, BELLY);
      for (const side of [-1, 1]) v.box(side * 3.4, 5.4, -0.6, 3.2, 0.3, 3.4, WING, { rz: side * 0.4 }); // folded wings
    },
    limbs: [
      ...[[-1, 1.6, 0], [1, 1.6, Math.PI], [-1, -2.2, Math.PI], [1, -2.2, 0]].map(([side, z, phase]) => ({
        kind: 'swing', pivot: [side * 1.6, 2.6, z], amp: 0.55, phase,
        build(v) { v.box(0, -1.2, 0, 1.3, 1.3, 1.3, '#3a2a6a'); },
        lower: {
          pivot: [0, -1.2, 0], bend: -0.7,
          build(v) { v.box(0, -1.2, 0, 1.2, 1.3, 1.2, '#2e2258'); v.box(0, -1.2, 0.3, 1.4, 0.4, 1.8, '#1e1640'); },
        },
      })),
      // three necks with heads, each swaying on its own
      ...[[-1.4, '#4a2a7a', 0], [0, '#5a2a3a', 1.5], [1.4, '#3a5a3a', 3]].map(([x, color, phase]) => ({
        kind: 'sway', pivot: [x, 4, 1.8], amp: 0.28, phase,
        build(v) {
          for (let i = 0; i < 4; i++) v.box(x * 0.25 * i, i * 1.1, i * 0.4, 1.2, 1.2, 1.2, color);
          v.box(x * 1.1, 4.4, 2.2, 1.8, 1.5, 2.4, color);                    // head
          v.box(x * 1.1, 4, 3.3, 1.4, 0.6, 0.8, '#1e1640');                  // jaw
          for (const s of [-1, 1]) {
            v.box(x * 1.1 + s * 0.5, 4.9, 3.42, 0.35, 0.3, 0.06, '#ffd21f'); // eyes
            v.box(x * 1.1 + s * 0.5, 5.4, 1.4, 0.3, 1, 0.3, '#d8d0e8', { rx: -0.5 }); // horns
          }
        },
      })),
      { kind: 'wag', pivot: [0, 2.6, -3.2], amp: 0.4, build(v) { for (let i = 0; i < 4; i++) v.box(0, -0.2 * i, -1 - i * 1.4, 1.4 - i * 0.25, 1.2 - i * 0.2, 1.6, '#3a2a6a'); } },
    ],
  },

  // ---------------------------------------------------------------- the final boss: the void dragon
  voidDragon: {
    body(v) {
      const BLACK = '#14101c', DARK = '#221a30', GLOW = '#b04aff';
      v.box(0, 3, -0.4, 4.6, 3.6, 6.4, BLACK);                                 // body
      for (let i = 0; i < 4; i++) v.box(0, 6.6, -2.6 + i * 1.6, 0.6, 1.2, 0.6, DARK); // back spikes
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) v.box(side * 2.32, 3.6 + i * 0.9, -1 + i * 0.6, 0.06, 0.3, 2.4, GLOW); // glowing stripes
      // a long neck rising forward, and the head with horns, glowing eyes and jaw
      for (let i = 0; i < 4; i++) v.box(0, 5 + i * 1.3, 3 + i * 0.6, 2.2 - i * 0.1, 1.4, 1.8, i % 2 ? DARK : BLACK);
      v.box(0, 10, 5.4, 2.6, 2, 3.4, BLACK);
      v.box(0, 9.2, 6.8, 2, 0.8, 1.8, DARK);
      for (const side of [-1, 1]) {
        v.box(side * 0.8, 10.6, 7.12, 0.6, 0.4, 0.06, GLOW);
        v.box(side * 0.9, 11.6, 4.6, 0.4, 2.2, 0.4, DARK, { rx: -0.6, rz: side * 0.2 });
      }
    },
    limbs: [
      ...[[-1, 2.2, 0], [1, 2.2, Math.PI], [-1, -2.6, Math.PI], [1, -2.6, 0]].map(([side, z, phase]) => ({
        kind: 'swing', pivot: [side * 1.8, 2.6, z], amp: 0.5, phase,
        build(v) { v.box(0, -1.3, 0, 1.5, 1.4, 1.5, '#14101c'); },
        lower: {
          pivot: [0, -1.2, 0], bend: -0.7,
          build(v) { v.box(0, -1.3, 0, 1.3, 1.4, 1.3, '#221a30'); v.box(0, -1.3, 0.35, 1.6, 0.4, 2, '#14101c'); },
        },
      })),
      // big wings that beat slowly, faster when it chases
      ...[-1, 1].map((side) => ({
        kind: 'flap', pivot: [side * 2.2, 6, 0], amp: 0.7, side,
        build(v) {
          v.box(side * 3.5, 0.3, 0, 7, 0.4, 0.5, '#221a30');                    // the wing's arm
          v.box(side * 3.5, 0, -1.6, 7, 0.2, 3.2, '#14101c');                   // the skin
          v.box(side * 6.8, 0.3, -1, 0.5, 0.3, 2, '#b04aff');                   // glowing tip
        },
      })),
      // the long tail, rippling as it walks, curling at the end
      ...Array.from({ length: 7 }, (_, i) => ({
        kind: 'wave', pivot: [0, 2.4 - i * 0.2, -3.8 - i * 1.6], amp: 0.2 + i * 0.15, phase: i * 0.6,
        build(v) { const w = 2 - i * 0.2; v.box(0, 0, 0, w, w, 1.8, i % 2 ? '#221a30' : '#14101c'); v.box(0, w, 0, 0.3, 0.6, 0.3, '#b04aff'); },
      })),
    ],
  },

  // ---------------------------------------------------------------- stage 9: the giant scorpion
  scorpion: {
    body(v) {
      const SHELL = '#16121a', RED = '#c8141e', GLOW = '#ff2a3a';
      v.box(0, 1.4, 0, 3.8, 1.4, 4.4, SHELL);                                 // body
      for (let i = 0; i < 3; i++) v.box(0, 2.8, -1.4 + i * 1.4, 3.4, 0.35, 1, i % 2 ? RED : SHELL); // banded back
      v.box(0, 1.3, 2.9, 2.6, 1.2, 1.6, SHELL);                               // head
      for (const s of [-1, 1]) v.box(s * 0.6, 2.2, 3.5, 0.4, 0.4, 0.1, GLOW); // red eyes
    },
    limbs: [
      // four legs each side, walking in a ripple
      ...[-1, 1].flatMap((side) => [-1.5, -0.5, 0.5, 1.5].map((z, i) => ({
        kind: 'scuttle', pivot: [side * 1.9, 1.8, z], amp: 0.35, phase: i * 1.6 + (side > 0 ? 0 : Math.PI), side,
        build(v) {
          v.box(side * 1, -0.2, 0, 2, 0.45, 0.45, '#16121a', { rz: side * -0.45 });
          v.box(side * 2.1, -1.2, 0, 0.4, 1.6, 0.4, '#c8141e', { rz: side * 0.25 });
        },
      }))),
      // the pincers, open and close
      ...[-1, 1].map((side) => ({
        kind: 'pinch', pivot: [side * 1.5, 1.6, 3.4], amp: 0.4, side,
        build(v) {
          v.box(side * 0.6, -0.2, 0.9, 0.8, 0.8, 1.8, '#16121a', { ry: side * 0.4 });
          v.box(side * 1, -0.3, 2.4, 1.8, 1.3, 1.6, '#c8141e');
          v.box(side * 0.6, 0.2, 3.5, 0.5, 0.5, 1.4, '#16121a');
          v.box(side * 1.4, -0.5, 3.5, 0.5, 0.5, 1.4, '#16121a');
        },
      })),
      // the tail: curls up and over the back, striking forward when angry
      {
        kind: 'sting', pivot: [0, 2, -2.2], amp: 0.35,
        build(v) {
          const segs = [[0, 0.4, -1, 0.3], [0, 1.6, -2, 0.8], [0, 3.2, -2.3, 1.4], [0, 4.8, -1.8, 2], [0, 6, -0.6, 2.6]];
          segs.forEach(([x, y, z, r], i) => v.box(x, y, z, 1.4 - i * 0.12, 1.3, 1.3, i % 2 ? '#c8141e' : '#16121a', { rx: r }));
          v.box(0, 6.2, 0.6, 0.6, 0.6, 1.6, '#ff2a3a', { rx: 2.6 });                 // the sting
        },
      },
    ],
  },

  // ---------------------------------------------------------------- stage 5: the king cobra
  cobra: {
    body() {},                                     // all of it is jointed pieces
    limbs: (() => {
      const SCALE = '#3a2fb0', SCALE_2 = '#4a3fd0', BELLY = '#9a90f0', HOOD = '#2a2090', EYE = '#ffd21f';
      const parts = [];
      // the tail: pieces along the ground, each sliding sideways in a travelling wave
      const pieces = 9;
      for (let i = 0; i < pieces; i++) {
        const w = 1.9 - i * 0.12;
        parts.push({
          kind: 'wave', pivot: [0, 0, -1.6 - i * 1.6], amp: 0.25 + i * 0.12, phase: i * 0.7,
          build(v) { v.box(0, 0, 0, w, w * 0.8, 1.8, i % 2 ? SCALE : SCALE_2); v.box(0, 0, 0, w * 0.6, 0.12, 1.7, BELLY); },
        });
      }
      // the raised neck, hood and head, swaying together
      parts.push({
        kind: 'sway', pivot: [0, 0, 0], amp: 0.22,
        build(v) {
          for (let i = 0; i < 6; i++) v.box(0, i * 1.1, i * 0.15, 2, 1.15, 1.8, i % 2 ? SCALE : SCALE_2);   // neck
          v.box(0, 0, 1, 1.2, 6, 0.2, BELLY);
          v.box(0, 4.4, 0.2, 4.4, 3.4, 0.5, HOOD);                                                    // the hood
          v.box(0, 4.6, 0.48, 3.4, 2.8, 0.1, SCALE_2);
          for (const side of [-1, 1]) v.box(side * 1, 5.6, 0.55, 0.6, 0.9, 0.06, '#f2f0ff');          // hood marks
          v.box(0, 6.6, 0.8, 1.9, 1.3, 2.4, SCALE);                                                   // head
          for (const side of [-1, 1]) v.box(side * 0.65, 7.2, 1.7, 0.4, 0.35, 0.4, EYE);
          v.box(0, 6.6, 2.1, 0.2, 0.12, 0.9, '#e8233a');                                              // tongue
        },
      });
      return parts;
    })(),
  },
};

export const hasRig = (type) => !!RIGS[type];

// Builds a guard: a group holding its body and its jointed limbs. Returns { group, limbs }.
export function createRig(type) {
  return buildRig(RIGS[type]);
}

// Builds any rig definition ({ body(v), limbs: [...] }): the guards here, and the pets (PetRigs.js).
export function buildRig(rig) {
  const group = new THREE.Group();
  const body = new Voxels();
  rig.body(body);
  if (body.positions.length) group.add(body.mesh({ receiveShadow: false }));
  const limbs = rig.limbs.map((limb) => {
    const v = new Voxels();
    limb.build(v);
    const pivot = new THREE.Group();
    pivot.position.set(...limb.pivot);
    pivot.add(v.mesh({ receiveShadow: false }));
    group.add(pivot);
    let lower = null;
    if (limb.lower) {
      const lv = new Voxels();
      limb.lower.build(lv);
      lower = new THREE.Group();
      lower.position.set(...limb.lower.pivot);
      lower.add(lv.mesh({ receiveShadow: false }));
      pivot.add(lower);
    }
    return { ...limb, node: pivot, lowerNode: lower, rest: pivot.position.clone() };
  });
  return { group, limbs };
}

// Moves the limbs. t = the walk clock (runs faster with speed), move = 0 standing .. 1 walking,
// angry = chasing (bigger, faster moves).
export function animateRig(limbs, t, move, angry, time) {
  const big = angry ? 1.35 : 1;
  for (const l of limbs) {
    const n = l.node;
    switch (l.kind) {
      case 'swing':
        n.rotation.x = Math.sin(t + l.phase) * l.amp * move * big;
        // the knee / elbow bends while the limb swings forward, and straightens as it swings back
        if (l.lowerNode) l.lowerNode.rotation.x = (l.lower.base || 0) * Math.sign(l.lower.bend) + Math.max(0, Math.sin(t + l.phase + 0.6)) * l.lower.bend * move * big;
        break;
      case 'flap': n.rotation.z = l.side * (0.15 + Math.abs(Math.sin(time * (angry ? 14 : 3))) * l.amp * (angry ? 1 : 0.4)); break;
      case 'pinch': n.rotation.y = l.side * Math.abs(Math.sin(time * (angry ? 7 : 2))) * l.amp * big; break;
      case 'scuttle':
        n.rotation.z = l.side * Math.max(0, Math.sin(t * 1.6 + l.phase)) * l.amp * move;
        n.rotation.y = Math.sin(t * 1.6 + l.phase) * l.amp * 0.8 * move;
        break;
      case 'wave': n.position.x = l.rest.x + Math.sin(time * (2 + move * 4) - l.phase) * l.amp * (0.4 + move); break;
      case 'sway': n.rotation.y = Math.sin(time * 1.6 + (l.phase || 0)) * l.amp; n.rotation.z = Math.sin(time * 1.1 + (l.phase || 0)) * l.amp * 0.4; break;
      case 'wag': n.rotation.y = Math.sin(time * (angry ? 9 : 3)) * l.amp; break;
      case 'sting': n.rotation.x = (angry ? Math.max(0, Math.sin(time * 5)) : Math.sin(time * 1.4) * 0.3) * l.amp; break;
      default: break;
    }
  }
}
