// The animals that hatch out of the stages' eggs, built like the egg guards: blocky bodies with
// jointed legs, wings, tails and fins that move (see GuardRigs.animateRig). Every builder faces +z
// and stands on y = 0. Shapes and colours follow the reference video.
//
//   Forest       pigeon, dog, cat, brown bear          Savanna       zebra, lion, elephant, manticore
//   Frozen Peaks polar bear, eagle, mammoth             Coral Reef    dolphin, shark, whale
//   Sweet Land   koala, tiger, phoenix                  Lava Lands    phoenix, manticore, big dragon
//   Dino Valley  microraptor, ankylosaurus, T-rex, quetzalcoatlus
//   Bamboo Grove koala, tiger, eagle                    Desert        lion, elephant, manticore
//   The Void     big dragon, quetzalcoatlus, T-rex

const WHITE = '#ffffff', BLACK = '#17181c';

function eyes(v, y, z, gap, size = 0.5, x = 0) {
  for (const s of [-1, 1]) {
    v.box(x + s * gap, y, z, size, size, 0.12, WHITE);
    v.box(x + s * gap, y + size * 0.15, z + 0.04, size * 0.55, size * 0.55, 0.12, BLACK);
  }
}

// four legs walking in a diagonal pattern, with a knee each
function legs4({ x, y, front, back, w, h, color, foot = color, knee = true }) {
  return [[-1, front, 0], [1, front, Math.PI], [-1, back, Math.PI], [1, back, 0]].map(([side, z, phase]) => ({
    kind: 'swing', pivot: [side * x, y, z], amp: 0.5, phase,
    build(v) { v.box(0, -h * 0.5, 0, w, h * 0.5 + 0.1, w, color); },
    lower: {
      pivot: [0, -h * 0.5, 0], bend: knee ? 0.5 : 0.01,
      build(lv) { lv.box(0, -h * 0.5, 0, w * 0.9, h * 0.5, w * 0.9, color); lv.box(0, -h * 0.5, w * 0.12, w * 1.05, 0.4, w * 1.25, foot); },
    },
  }));
}

// two bird / dino legs
function legs2({ x, y, z = 0, w, h, color, foot }) {
  return [[-1, 0], [1, Math.PI]].map(([side, phase]) => ({
    kind: 'swing', pivot: [side * x, y, z], amp: 0.6, phase,
    build(v) { v.box(0, -h * 0.55, 0, w * 1.2, h * 0.55, w * 1.2, color); },
    lower: {
      pivot: [0, -h * 0.55, 0], bend: -0.5,
      build(lv) { lv.box(0, -h * 0.45, 0, w * 0.7, h * 0.45, w * 0.7, foot); lv.box(0, -h * 0.45, w * 0.4, w * 1.6, 0.35, w * 1.8, foot); },
    },
  }));
}

// two wings that flap; feathers: [[length, color], ...] fanned out along the wing
function wings({ x, y, z = 0, span, depth, color, tip = color, feathers = 4, amp = 0.6 }) {
  return [-1, 1].map((side) => ({
    kind: 'flap', pivot: [side * x, y, z], amp, side,
    build(v) {
      v.box(side * span / 2, 0, 0, span, 0.5, depth, color);
      for (let i = 0; i < feathers; i++) {
        const fx = side * (span * (0.35 + 0.65 * (i / Math.max(1, feathers - 1))));
        v.box(fx, -0.05, -depth / 2 - 0.6, span / feathers * 0.95, 0.4, 1.6 + i * 0.25, i % 2 ? tip : color);
      }
    },
  }));
}

const tailWag = (pivot, build, amp = 0.45) => ({ kind: 'wag', pivot, amp, build });
const tailSway = (pivot, build, amp = 0.35) => ({ kind: 'sway', pivot, amp, build });

export const PET_RIGS = {
  // ---------------------------------------------------------------- Forest
  // the reference pigeon: a big pale-grey box head, black body, orange beak, red tail, pink feet
  pigeon: {
    body(v) {
      v.box(0, 1.6, -0.2, 2.6, 2.6, 3, '#14161e');
      v.box(0, 1.8, 1.1, 2.4, 1.8, 0.8, '#1e2230');
      v.box(0, 4.1, 0.6, 2.6, 2.6, 2.6, '#d8dce4');
      v.box(0, 4.5, 2.1, 0.8, 0.9, 1.4, '#f2a41a', { rx: 0.5 });
      eyes(v, 5.1, 1.92, 0.7, 0.55);
    },
    limbs: [
      ...legs2({ x: 0.6, y: 1.7, w: 0.4, h: 1.7, color: '#e88aa8', foot: '#e88aa8' }),
      ...wings({ x: 1.3, y: 3.6, span: 1.6, depth: 2.6, color: '#14161e', feathers: 3, amp: 0.4 }),
      tailWag([0, 2.4, -1.7], (v) => { v.box(-0.5, -0.3, -1.4, 0.8, 0.3, 3, '#d8202e', { rx: 0.3, ry: 0.15 }); v.box(0.5, -0.3, -1.4, 0.8, 0.3, 3, '#e8323c', { rx: 0.3, ry: -0.15 }); }, 0.25),
    ],
  },
  dog: {
    body(v) {
      v.box(0, 1.8, 0, 2.2, 2, 4.2, '#c88a4a');
      v.box(0, 2.6, 2.4, 2.2, 2.2, 2, '#c88a4a');
      v.box(0, 2.6, 3.7, 1.3, 1.1, 1.2, '#e8c08a');
      v.box(0, 3.3, 4.32, 0.5, 0.4, 0.1, BLACK);
      for (const s of [-1, 1]) v.box(s * 1.25, 3.4, 2.2, 0.5, 1.8, 1.2, '#7a4a22');
      eyes(v, 3.7, 3.42, 0.55, 0.42);
    },
    limbs: [...legs4({ x: 0.75, y: 1.9, front: 1.4, back: -1.4, w: 0.7, h: 1.9, color: '#c88a4a', foot: '#e8c08a' }),
      tailWag([0, 3.4, -2.1], (v) => v.box(0, 0, -0.6, 0.4, 0.4, 1.6, '#c88a4a', { rx: -0.8 }), 0.9)],
  },
  cat: {
    body(v) {
      v.box(0, 1.6, 0, 1.9, 1.7, 3.8, '#f2a24a');
      for (let i = 0; i < 3; i++) v.box(0, 3.31, -1 + i * 1, 1.92, 0.1, 0.4, '#c8701f');
      v.box(0, 2.4, 2.2, 2.1, 2, 1.8, '#f2a24a');
      v.box(0, 2.5, 3.1, 1, 0.8, 0.3, '#ffe0c0');
      for (const s of [-1, 1]) v.box(s * 0.7, 4.4, 2, 0.6, 0.8, 0.4, '#f2a24a');
      eyes(v, 3.5, 3.12, 0.5, 0.42);
    },
    limbs: [...legs4({ x: 0.65, y: 1.7, front: 1.3, back: -1.3, w: 0.6, h: 1.7, color: '#f2a24a', foot: '#ffffff' }),
      tailWag([0, 3, -1.9], (v) => { v.box(0, 0, -0.4, 0.4, 0.4, 1.2, '#f2a24a', { rx: -1 }); v.box(0, 1.2, -0.9, 0.4, 1.4, 0.4, '#c8701f'); }, 0.6)],
  },
  // the reference bear: big, dark reddish brown, blocky
  brownBear: {
    body(v) {
      v.box(0, 2.4, -0.2, 4.2, 3.6, 6, '#6a2a1e');
      v.box(0, 5.2, 0.4, 3.6, 1.4, 3.2, '#5a2218');
      v.box(0, 3.6, 3.3, 3.2, 3, 2.4, '#6a2a1e');
      v.box(0, 3.8, 4.8, 1.6, 1.3, 1, '#8a4a30');
      v.box(0, 4.6, 5.32, 0.7, 0.5, 0.1, BLACK);
      for (const s of [-1, 1]) v.box(s * 1.3, 6.6, 3.2, 0.9, 0.9, 0.6, '#5a2218');
      eyes(v, 5.4, 4.52, 0.8, 0.5);
    },
    limbs: legs4({ x: 1.4, y: 2.6, front: 1.9, back: -2.2, w: 1.3, h: 2.6, color: '#5a2218' }),
  },

  // ---------------------------------------------------------------- Savanna and Desert
  // the reference zebra: white with black stripes, black mane and muzzle
  zebra: {
    body(v) {
      v.box(0, 3.2, 0, 2.4, 2.4, 5.2, WHITE);
      for (let i = 0; i < 6; i++) v.box(0, 3.15, -2.3 + i * 0.9, 2.46, 2.5, 0.38, BLACK);
      v.box(0, 4.4, 2.4, 1.4, 3.2, 1.4, WHITE, { rx: 0.4 });
      for (let i = 0; i < 4; i++) v.box(0, 4.6 + i * 0.7, 2.6 + i * 0.24, 1.46, 0.3, 1.46, BLACK, { rx: 0.4 });
      v.box(0, 7.2, 2.4, 0.4, 0.6, 2.2, BLACK, { rx: 0.4 });
      v.box(0, 6.6, 3.8, 1.4, 1.4, 2.4, WHITE);
      v.box(0, 6.5, 5, 1.3, 1.1, 0.4, BLACK);
      for (const s of [-1, 1]) v.box(s * 0.5, 8, 3.2, 0.4, 0.9, 0.3, WHITE);
      eyes(v, 7.4, 4.52, 0.5, 0.4);
    },
    limbs: [...legs4({ x: 0.8, y: 3.2, front: 1.9, back: -1.9, w: 0.6, h: 3.2, color: WHITE, foot: BLACK }),
      tailWag([0, 5, -2.6], (v) => { v.box(0, -1.6, -0.2, 0.3, 1.8, 0.3, WHITE); v.box(0, -2.2, -0.2, 0.5, 0.7, 0.5, BLACK); }, 0.5)],
  },
  lion: {
    body(v) {
      const F = '#d9a45a', M = '#8a4a1a';
      v.box(0, 2.6, -0.3, 3.2, 2.6, 5.4, F);
      v.box(0, 2.4, 2.3, 3.8, 4, 1.8, M);                     // the mane
      v.box(0, 3.4, 3.2, 2.4, 2.4, 1.6, F);
      v.box(0, 3.4, 4, 1.4, 1, 0.8, '#e8c08a');
      v.box(0, 4, 4.42, 0.6, 0.4, 0.1, BLACK);
      eyes(v, 4.6, 4.02, 0.55, 0.42);
    },
    limbs: [...legs4({ x: 1.05, y: 2.7, front: 1.6, back: -2, w: 0.9, h: 2.7, color: '#d9a45a' }),
      tailWag([0, 4.4, -2.9], (v) => { v.box(0, 0, -1, 0.35, 0.35, 2, '#d9a45a', { rx: -0.5 }); v.box(0, 0.9, -1.9, 0.7, 0.7, 0.7, '#8a4a1a'); }, 0.6)],
  },
  elephant: {
    body(v) {
      const G = '#8a909a', D = '#6e747e';
      v.box(0, 4, 0, 5, 4.6, 7.4, G);
      v.box(0, 5.2, 4, 3.6, 3.6, 2.4, G);
      for (const s of [-1, 1]) {
        v.box(s * 2.6, 4.8, 3.4, 1.8, 3.6, 0.4, D, { ry: s * 0.4 });    // ears
        v.box(s * 0.9, 4.4, 5.4, 0.45, 0.45, 2.4, '#f4eedc', { rx: -0.5 }); // tusks
      }
      for (let i = 0; i < 4; i++) v.box(0, 4.6 - i * 1.1, 5.4 + i * 0.25, 1.1 - i * 0.1, 1.2, 1.1 - i * 0.1, G); // trunk
      eyes(v, 6.8, 5.22, 1, 0.45);
    },
    limbs: [...legs4({ x: 1.6, y: 4, front: 2.4, back: -2.4, w: 1.5, h: 4, color: '#8a909a', foot: '#c8ccd2', knee: false }),
      tailWag([0, 7, -3.7], (v) => v.box(0, -1.8, -0.2, 0.3, 2, 0.3, '#6e747e'), 0.4)],
  },
  // the reference manticore: a brown lion with leathery bat wings and a long spiked tail
  manticore: {
    body(v) {
      const F = '#b8743a', M = '#6a3a1e';
      v.box(0, 3, -0.4, 3.6, 3, 6.4, F);
      for (let i = 0; i < 5; i++) v.box(0, 6, -2.4 + i * 1.1, 3.4, 0.25, 0.7, M);
      v.box(0, 2.8, 2.6, 4.2, 4.6, 2, M);
      v.box(0, 3.8, 3.6, 2.6, 2.6, 1.8, F);
      v.box(0, 3.6, 4.5, 1.5, 1.1, 0.8, '#d89a5a');
      v.box(0, 3.1, 4.92, 1, 0.3, 0.1, '#d8202e');
      eyes(v, 5.1, 4.52, 0.6, 0.42);
    },
    limbs: [...legs4({ x: 1.2, y: 3, front: 1.9, back: -2.4, w: 1, h: 3, color: '#b8743a', foot: '#f2ecdc' }),
      ...[-1, 1].map((side) => ({
        kind: 'flap', pivot: [side * 1.6, 5.8, 0.4], amp: 0.6, side,
        build(v) {
          for (let i = 0; i < 4; i++) v.box(side * (1.6 + i * 1.6), 0.4 + i * 0.5, -i * 0.5, 0.3, 0.3, 3 + i, '#2a1a14', { rz: side * -0.3 }); // the wing's fingers
          v.box(side * 3.6, 0, -1.2, 6.4, 0.2, 4.2, '#4a2a1e');
        },
      })),
      tailWag([0, 4.6, -3.6], (v) => {
        for (let i = 0; i < 5; i++) v.box(0, i * 0.7, -0.8 - i * 1.1, 0.6, 0.6, 1.3, '#6a3a1e', { rx: -0.5 });
        v.box(0, 3.8, -6.2, 1.2, 1.2, 1.2, '#d8202e', { rx: 0.8 });
      }, 0.5)],
  },
  tiger: {
    body(v) {
      const O = '#f28a1a';
      v.box(0, 2.4, -0.2, 2.8, 2.4, 5.4, O);
      for (let i = 0; i < 5; i++) v.box(0, 2.35, -2.2 + i * 1, 2.86, 2.5, 0.3, BLACK);
      v.box(0, 3.2, 3, 2.6, 2.4, 2, O);
      v.box(0, 3, 4.1, 1.5, 1.1, 0.6, WHITE);
      v.box(0, 3.6, 4.42, 0.5, 0.4, 0.1, BLACK);
      for (const s of [-1, 1]) { v.box(s * 0.9, 5.6, 2.8, 0.6, 0.6, 0.3, O); v.box(s * 0.7, 3.9, 4.02, 0.6, 0.12, 0.1, BLACK); }
      eyes(v, 4.4, 4.02, 0.55, 0.42);
    },
    limbs: [...legs4({ x: 0.95, y: 2.5, front: 1.6, back: -1.9, w: 0.85, h: 2.5, color: '#f28a1a', foot: WHITE }),
      tailWag([0, 4.2, -2.8], (v) => { for (let i = 0; i < 3; i++) v.box(0, i * 0.5, -0.6 - i * 0.9, 0.4, 0.4, 1, i % 2 ? BLACK : '#f28a1a', { rx: -0.5 }); }, 0.6)],
  },

  // ---------------------------------------------------------------- Frozen Peaks
  polarBear: {
    body(v) {
      v.box(0, 2.4, -0.2, 4, 3.4, 6, '#f2f4f8');
      v.box(0, 3.4, 3.4, 3, 2.8, 2.4, '#f2f4f8');
      v.box(0, 3.6, 4.8, 1.5, 1.2, 1, '#e4e8ee');
      v.box(0, 4.3, 5.32, 0.6, 0.5, 0.1, BLACK);
      for (const s of [-1, 1]) v.box(s * 1.2, 6.2, 3.2, 0.8, 0.8, 0.5, '#e4e8ee');
      eyes(v, 5.1, 4.62, 0.75, 0.45);
    },
    limbs: legs4({ x: 1.35, y: 2.6, front: 1.9, back: -2.2, w: 1.25, h: 2.6, color: '#e4e8ee' }),
  },
  // an eagle: dark brown body, white head, yellow hooked beak, wide wings
  eagle: {
    body(v) {
      v.box(0, 2.4, -0.4, 2.8, 3, 3.6, '#4a2e1a');
      v.box(0, 5, 0.8, 2.4, 2.2, 2.4, WHITE);
      v.box(0, 5.2, 2.2, 0.9, 0.8, 1.2, '#ffcf33', { rx: 0.4 });
      eyes(v, 5.9, 2.02, 0.7, 0.4);
    },
    limbs: [...legs2({ x: 0.7, y: 2.5, w: 0.45, h: 2.4, color: '#4a2e1a', foot: '#ffcf33' }),
      ...wings({ x: 1.4, y: 4.4, span: 5.5, depth: 2.8, color: '#4a2e1a', tip: '#2e1c10', feathers: 5, amp: 0.7 }),
      tailWag([0, 2.8, -2.2], (v) => v.box(0, -0.2, -1, 2, 0.3, 2.2, WHITE, { rx: 0.3 }), 0.2)],
  },
  // the reference mammoth: dark brown shaggy fur, long curved white tusks
  mammoth: {
    body(v) {
      const F = '#4a2418', D = '#3a1a10';
      v.box(0, 4.4, -0.2, 5.6, 5, 8, F);
      v.box(0, 9.2, 0.6, 4, 1.6, 4, D);                         // the hump
      for (let z = -3.6; z < 4; z += 1.2) for (const s of [-1, 1]) v.box(s * 2.85, 3.6, z, 0.2, 1.8, 1, D); // shaggy fringe
      v.box(0, 6, 4.4, 4, 4, 2.6, F);
      for (const s of [-1, 1]) {
        v.box(s * 1.2, 4.2, 6, 0.6, 0.6, 2.4, '#f4eedc', { rx: 0.6 });
        v.box(s * 1.3, 5, 7.6, 0.55, 0.55, 2, '#f4eedc', { rx: -0.5 });
      }
      for (let i = 0; i < 4; i++) v.box(0, 5.4 - i * 1.2, 6 + i * 0.3, 1.2 - i * 0.12, 1.3, 1.2 - i * 0.12, D);
      eyes(v, 7.4, 5.72, 1.1, 0.45);
    },
    limbs: legs4({ x: 1.8, y: 4.4, front: 2.6, back: -2.8, w: 1.7, h: 4.4, color: '#3a1a10', foot: '#5a3a2a', knee: false }),
  },

  // ---------------------------------------------------------------- Coral Reef (sea animals hover a little)
  dolphin: {
    body(v) {
      v.box(0, 1.6, 0, 2.2, 2.2, 6, '#5fa8e8');
      v.box(0, 1.6, 0.4, 1.8, 0.6, 5, '#e4f2ff');
      v.box(0, 2, 3.6, 1.4, 1.2, 1.6, '#5fa8e8');
      v.box(0, 3.8, -0.2, 0.4, 1.6, 1.6, '#4a8ad6', { rx: -0.4 });
      for (const s of [-1, 1]) v.box(s * 1.4, 1.6, 1, 1.4, 0.3, 1, '#4a8ad6', { rz: s * 0.4 });
      eyes(v, 2.9, 3.02, 0.6, 0.35);
    },
    limbs: [tailSway([0, 2.4, -3], (v) => { v.box(0, -0.4, -1, 1.2, 1, 2, '#5fa8e8'); v.box(0, -0.3, -2.2, 3, 0.3, 1, '#4a8ad6'); }, 0.4)],
  },
  // the reference shark: blue, a huge mouth full of teeth
  shark: {
    body(v) {
      const B = '#2f5ad8';
      v.box(0, 1.6, 0, 3.4, 3.4, 7, B);
      v.box(0, 1.6, 0.6, 3, 1, 5.6, '#e4ecff');
      v.box(0, 1.8, 4.2, 3, 2.8, 2, B);
      v.box(0, 1.9, 5, 2.2, 1.2, 0.4, '#d8202e');               // the mouth
      for (let i = 0; i < 5; i++) {
        v.box(-0.9 + i * 0.45, 2.7, 5.25, 0.3, 0.5, 0.1, WHITE);
        v.box(-0.9 + i * 0.45, 1.9, 5.25, 0.3, 0.5, 0.1, WHITE);
      }
      v.box(0, 5, -0.4, 0.5, 2.6, 2.2, B, { rx: -0.4 });
      for (const s of [-1, 1]) v.box(s * 2.2, 1.6, 1.4, 2, 0.3, 1.4, B, { rz: s * 0.5 });
      eyes(v, 3.7, 5.22, 1, 0.5);
    },
    limbs: [tailSway([0, 3, -3.5], (v) => { v.box(0, -0.6, -1.4, 1.6, 1.6, 2.8, '#2f5ad8'); v.box(0, -1.2, -3, 0.4, 4.4, 1.2, '#2050b8', { rx: 0.3 }); }, 0.35)],
  },
  // the reference whale: long, dark blue-grey, pale belly stripes, white eye patches
  whale: {
    body(v) {
      const B = '#3a4a6a';
      v.box(0, 1.6, 0, 5, 5, 12, B);
      for (let i = 0; i < 6; i++) v.box(0, 1.55, -3 + i * 1.3, 4.2, 0.4, 0.5, '#d8dce4');
      v.box(0, 6.6, -1, 3.6, 0.9, 6, '#2e3c58');
      for (const s of [-1, 1]) {
        v.box(s * 2.52, 4.6, 4.4, 0.1, 1, 1.4, WHITE);
        v.box(s * 2.56, 4.8, 4.8, 0.1, 0.5, 0.5, BLACK);
        v.box(s * 3.4, 2, 2, 2.6, 0.4, 1.8, B, { rz: s * 0.5 });
      }
    },
    limbs: [tailSway([0, 3.6, -6], (v) => { v.box(0, -0.8, -1.6, 2.6, 2.4, 3.2, '#3a4a6a'); v.box(0, -0.2, -3.6, 6, 0.4, 1.8, '#2e3c58'); }, 0.25)],
  },

  // ---------------------------------------------------------------- Sweet Land / Bamboo Grove
  koala: {
    body(v) {
      v.box(0, 1.4, 0, 2.8, 2.8, 2.6, '#9aa0a8');
      v.box(0, 1.6, 1.32, 1.6, 2, 0.1, '#e4e6ea');
      v.box(0, 4.2, 0.4, 2.6, 2.4, 2.2, '#9aa0a8');
      for (const s of [-1, 1]) { v.box(s * 1.6, 5.4, 0.4, 1.4, 1.4, 0.6, '#9aa0a8'); v.box(s * 1.6, 5.5, 0.62, 0.8, 0.9, 0.1, '#ffd8e0'); }
      v.box(0, 4.6, 1.52, 0.9, 1.1, 0.3, '#2a2c33');
      eyes(v, 5.4, 1.52, 0.75, 0.38);
    },
    limbs: [...legs2({ x: 0.8, y: 1.4, w: 0.7, h: 1.4, color: '#9aa0a8', foot: '#7a8088' }),
      ...[-1, 1].map((side) => ({ kind: 'swing', pivot: [side * 1.6, 3.6, 0.3], amp: 0.5, phase: side > 0 ? 0 : Math.PI, build(v) { v.box(side * 0.2, -1.8, 0.2, 0.7, 1.9, 0.7, '#9aa0a8'); } }))],
  },
  // the reference fire phoenix: gold and orange, fanned flaming wings and a long tail
  phoenix: {
    body(v) {
      v.box(0, 2.6, 0, 2.2, 3, 2.6, '#ff8a1a');
      v.box(0, 2.8, 1.12, 1.6, 2.2, 0.4, '#ffd21f');
      v.box(0, 5.4, 0.6, 1.8, 1.8, 1.8, '#ffb21f');
      v.box(0, 5.6, 1.7, 0.6, 0.6, 1, '#ffe14a', { rx: 0.4 });
      for (let i = 0; i < 3; i++) v.box(-0.6 + i * 0.6, 7, 0.2, 0.3, 1.4 + (i % 2) * 0.6, 0.3, '#ff4a1a', { rx: -0.4 });
      eyes(v, 6, 1.52, 0.5, 0.35);
    },
    limbs: [...legs2({ x: 0.5, y: 2.6, w: 0.35, h: 2.6, color: '#d8701a', foot: '#ffd21f' }),
      ...[-1, 1].map((side) => ({
        kind: 'flap', pivot: [side * 1.1, 4.6, 0], amp: 0.8, side,
        build(v) {
          for (let i = 0; i < 6; i++) {
            const a = 0.15 + i * 0.22;
            v.box(side * (1.6 + Math.cos(a) * 2.2), Math.sin(a) * 2.2, -0.4, 3.6 - i * 0.2, 0.3, 1.1, ['#ffe14a', '#ffb21f', '#ff8a1a', '#ff5a1a', '#ffd21f', '#ff7a1a'][i], { rz: side * a });
          }
        },
      })),
      tailWag([0, 2.8, -1.4], (v) => { for (let i = 0; i < 4; i++) v.box((i - 1.5) * 0.5, -0.4 - i * 0.2, -2, 0.4, 0.3, 4 + i * 0.6, i % 2 ? '#ff5a1a' : '#ffd21f', { rx: 0.35, ry: (i - 1.5) * 0.15 }); }, 0.25)],
  },

  // ---------------------------------------------------------------- Lava Lands / The Void
  // a big dragon with huge wings
  bigDragon: {
    body(v) {
      const R = '#a8141e', D = '#5a0a12', G = '#ffb21f';
      v.box(0, 4, -0.4, 5, 4.4, 8, R);
      v.box(0, 4.4, 3.2, 3, 3, 0.3, G);
      for (let i = 0; i < 6; i++) v.box(0, 8.4, -3.2 + i * 1.3, 0.8, 1.4, 0.8, D);
      for (let i = 0; i < 4; i++) v.box(0, 7.4 + i * 1.6, 4 + i * 0.8, 2.6 - i * 0.15, 1.8, 2.2, R);
      v.box(0, 13, 7.4, 3.4, 2.6, 4, R);
      v.box(0, 12.4, 9.4, 2.6, 1.2, 1.4, D);
      for (const s of [-1, 1]) { v.box(s * 1.1, 15.6, 6.6, 0.6, 2.4, 0.6, '#f4eedc', { rx: -0.5 }); v.box(s * 0.9, 14.4, 9.42, 0.6, 0.4, 0.1, '#ffe14a'); }
    },
    limbs: [...legs4({ x: 1.9, y: 4.2, front: 2.6, back: -3, w: 1.6, h: 4.2, color: '#8a0e18', foot: '#5a0a12' }),
      ...[-1, 1].map((side) => ({
        kind: 'flap', pivot: [side * 2.2, 8, 0], amp: 0.6, side,
        build(v) {
          v.box(side * 5, 0.6, 0, 10, 0.6, 0.8, '#5a0a12');
          for (let i = 0; i < 4; i++) v.box(side * (2.6 + i * 2.4), -0.1, -2.4, 2.2, 0.3, 4.8 - i * 0.4, i % 2 ? '#d8202e' : '#a8141e');
          v.box(side * 10.2, 0.8, 0.2, 0.6, 1.4, 0.6, '#f4eedc');
        },
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        kind: 'wave', pivot: [0, 4.2 - i * 0.4, -4.4 - i * 1.8], amp: 0.2 + i * 0.15, phase: i * 0.6,
        build(v) { const w = 2.2 - i * 0.3; v.box(0, 0, 0, w, w, 2, i % 2 ? '#8a0e18' : '#a8141e'); v.box(0, w, 0, 0.4, 0.7, 0.4, '#5a0a12'); },
      }))],
  },

  // ---------------------------------------------------------------- Dino Valley
  // the reference microraptor: deep blue feathers with light-blue tips, a tan face and belly
  microraptor: {
    body(v) {
      const B = '#1f3aa8', L = '#35a8ff', T = '#c8a070';
      v.box(0, 3.4, -0.4, 2.6, 2.6, 4, B);
      v.box(0, 3.4, 0.4, 2, 1.2, 3, T);
      v.box(0, 5.4, 1.8, 1.4, 2.6, 1.4, B, { rx: 0.35 });
      v.box(0, 7.4, 2.6, 2, 1.6, 2.6, B);
      v.box(0, 7.2, 4, 1.4, 0.9, 1.4, T);
      for (let i = 0; i < 5; i++) v.box(0, 8.2 + (i % 2) * 0.3, 1.8 - i * 0.7, 0.4, 1 + i * 0.2, 0.5, i % 2 ? L : B, { rx: -0.5 });
      eyes(v, 7.9, 3.92, 0.55, 0.38);
    },
    limbs: [...legs2({ x: 0.8, y: 3.4, z: -0.6, w: 0.5, h: 3.4, color: '#1f3aa8', foot: '#c8a070' }),
      ...wings({ x: 1.3, y: 5.4, z: 0.4, span: 5, depth: 3, color: '#1f3aa8', tip: '#35a8ff', feathers: 6, amp: 0.8 }),
      tailWag([0, 3.8, -2.4], (v) => { v.box(0, 0, -2, 0.8, 0.6, 4, '#1f3aa8', { rx: -0.2 }); for (const s of [-1, 1]) v.box(s * 0.8, 0.3, -3.4, 1.2, 0.2, 2, '#35a8ff', { ry: s * 0.3 }); }, 0.35)],
  },
  // the reference ankylosaurus: brown, a dark spiky shell, a club on the tail
  ankylosaurus: {
    body(v) {
      const F = '#7a4a24', S = '#3a2418';
      v.box(0, 2.4, -0.4, 5, 3, 8, F);
      v.box(0, 5.2, -0.4, 5.4, 1.6, 7.6, S);
      for (let z = -3.4; z < 3.6; z += 1.4) for (const x of [-2, 0, 2]) v.box(x, 6.6, z, 0.9, 0.9, 0.9, '#2a1810', { ry: 0.785 });
      v.box(0, 2.8, 4.4, 2.8, 2.2, 2, F);
      v.box(0, 3.4, 5.42, 0.8, 0.2, 0.1, BLACK);
      eyes(v, 4.2, 5.42, 0.8, 0.4);
    },
    limbs: [...legs4({ x: 1.8, y: 2.4, front: 2.6, back: -3, w: 1.2, h: 2.4, color: '#7a4a24', knee: false }),
      tailWag([0, 3.6, -4.4], (v) => { for (let i = 0; i < 3; i++) v.box(0, 0, -0.8 - i * 1.6, 1.6 - i * 0.3, 1.2, 1.7, '#7a4a24'); v.box(0, -0.4, -5.6, 2.6, 2, 2, '#1a1410'); }, 0.45)],
  },
  tRex: {
    body(v) {
      const G = '#4a8a3a', D = '#2f6a2a';
      v.box(0, 5, -0.6, 4, 4.4, 6, G);
      for (let i = 0; i < 5; i++) v.box(0, 9.4, -2.4 + i * 1.2, 0.6, 0.8, 0.8, D);
      v.box(0, 8.4, 2.4, 2.6, 3, 2.4, G, { rx: 0.3 });
      v.box(0, 10.4, 4, 3.2, 2.6, 4.4, G);
      v.box(0, 9.8, 6.3, 2.8, 0.6, 0.3, '#d8202e');
      for (let i = 0; i < 5; i++) v.box(-1.1 + i * 0.55, 10.1, 6.25, 0.3, 0.4, 0.1, WHITE);
      eyes(v, 11.6, 5.22, 1.2, 0.5);
      for (const s of [-1, 1]) v.box(s * 1.6, 6.6, 2.4, 0.4, 0.4, 1.4, D, { rx: 0.5 }); // tiny arms
    },
    limbs: [...legs2({ x: 1.4, y: 5.4, z: -1, w: 1.2, h: 5.4, color: '#4a8a3a', foot: '#2f6a2a' }),
      ...Array.from({ length: 4 }, (_, i) => ({
        kind: 'wave', pivot: [0, 6 - i * 0.5, -3.8 - i * 2], amp: 0.15 + i * 0.15, phase: i * 0.7,
        build(v) { const w = 2.6 - i * 0.5; v.box(0, -w / 2, 0, w, w, 2.2, i % 2 ? '#2f6a2a' : '#4a8a3a'); },
      }))],
  },
  // the reference quetzalcoatlus: a huge pterosaur, brown wings, purple neck, a long golden beak
  quetzalcoatlus: {
    body(v) {
      const B = '#6a3e2a', P = '#5a4a7a', Y = '#c88a2a';
      v.box(0, 5, -0.4, 2.8, 2.8, 4, B);
      for (let i = 0; i < 4; i++) v.box(0, 7.6 + i * 1.6, 1.4 + i * 0.7, 1.2, 1.8, 1.2, P, { rx: 0.4 });
      v.box(0, 13.6, 4, 2, 1.8, 2.4, P);
      v.box(0, 13.6, 6.6, 1, 0.8, 4.2, Y);
      v.box(0, 13, 6.4, 0.9, 0.5, 3.6, Y);
      v.box(0, 15, 3, 0.6, 1.6, 2, '#1f3aa8', { rx: -0.6 });     // the crest
      eyes(v, 14.2, 5.22, 0.55, 0.38);
    },
    limbs: [...legs2({ x: 0.8, y: 5, w: 0.7, h: 5, color: '#4a2a1a', foot: '#3a2014' }),
      ...[-1, 1].map((side) => ({
        kind: 'flap', pivot: [side * 1.3, 6.4, 0.4], amp: 0.5, side,
        build(v) {
          v.box(side * 4.5, 0.6, 0.8, 9, 0.6, 0.8, '#4a2a1a');
          v.box(side * 4.5, 0, -1.4, 9, 0.3, 4, '#8a5a3a');
          v.box(side * 9.2, 0.6, 1, 0.6, 1.2, 0.6, '#c88a2a');
        },
      }))],
  },
};

export const hasPetRig = (id) => !!PET_RIGS[id];
