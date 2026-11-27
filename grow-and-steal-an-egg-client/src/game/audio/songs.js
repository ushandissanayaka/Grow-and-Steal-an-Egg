// The game's own background tune: "Egg Heist" - an upbeat, bouncy chiptune loop in C major.
// 8 bars (C G Am F | C G F G), 136 BPM, 16 steps per bar. Notes are MIDI numbers.
// Melody notes: [step, midi, length in steps].

export const SONGS = [
  {
    name: 'Egg Heist',
    bpm: 136,
    // one chord per bar: bass root and the chord tones for the offbeat stabs
    chords: [
      { root: 36, tones: [60, 64, 67] }, // C
      { root: 43, tones: [59, 62, 67] }, // G
      { root: 45, tones: [57, 60, 64] }, // Am
      { root: 41, tones: [57, 60, 65] }, // F
      { root: 36, tones: [60, 64, 67] }, // C
      { root: 43, tones: [59, 62, 67] }, // G
      { root: 41, tones: [57, 60, 65] }, // F
      { root: 43, tones: [59, 62, 67] }, // G
    ],
    melody: [
      [[0, 76, 2], [2, 79, 2], [4, 81, 2], [6, 79, 1], [7, 76, 1], [8, 72, 3], [12, 74, 2], [14, 76, 2]],
      [[0, 79, 2], [2, 83, 2], [4, 81, 2], [6, 79, 2], [8, 74, 4], [12, 71, 2], [14, 74, 2]],
      [[0, 76, 2], [2, 81, 2], [4, 84, 2], [6, 81, 1], [7, 79, 1], [8, 76, 3], [12, 72, 2], [14, 76, 2]],
      [[0, 77, 2], [2, 81, 2], [4, 79, 2], [6, 77, 2], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
      [[0, 84, 2], [2, 83, 1], [3, 81, 1], [4, 79, 2], [6, 76, 2], [8, 79, 2], [10, 81, 2], [12, 79, 4]],
      [[0, 79, 2], [2, 81, 1], [3, 79, 1], [4, 74, 2], [6, 71, 2], [8, 74, 2], [10, 76, 2], [12, 79, 4]],
      [[0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2], [8, 79, 2], [10, 77, 2], [12, 76, 2], [14, 77, 2]],
      [[0, 79, 3], [3, 83, 1], [4, 86, 4], [8, 83, 2], [10, 79, 2], [12, 74, 4]],
    ],
    // drums per bar step: k = kick, s = snare/clap, h = closed hat, o = open hat
    drums: {
      k: [0, 4, 8, 12],
      s: [4, 12],
      h: [0, 2, 4, 6, 8, 10, 12, 14],
      o: [6, 14],
    },
  },
];
