// The background music: the game's own tune (songs.js), played live with the Web Audio API.
// Notes are scheduled a little ahead of time on the audio clock, so the beat stays steady even when
// a frame is slow. Drums, a bouncy bass, offbeat chord stabs, the lead with an echo, and (every
// other loop) a sparkly bell part an octave up for variety.

import { SONGS } from './songs.js';
import { midiHz } from './AudioManager.js';

const LOOKAHEAD = 0.15;  // seconds scheduled ahead
const TICK_MS = 30;

export class MusicPlayer {
  constructor(audio) {
    this.audio = audio;
    this.song = SONGS[0];
    this.step = 0;        // step within the whole loop (bars * 16)
    this.loop = 0;
    this.timer = null;
  }

  start() {
    const { audio } = this;
    if (this.timer || !audio.ctx) return;
    const ctx = audio.ctx;
    // the lead's echo
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = (60 / this.song.bpm) * 0.75; // a dotted eighth
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.28;
    this.delay.connect(this.feedback).connect(this.delay);
    this.delay.connect(audio.music);
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const ctx = this.audio.ctx;
    if (!ctx || ctx.state !== 'running') {
      if (ctx) this.nextTime = ctx.currentTime + 0.1;
      return;
    }
    const stepDur = 60 / this.song.bpm / 4;
    const bars = this.song.chords.length;
    // after a stall (tab hidden), restart cleanly instead of playing everything missed at once
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % (bars * 16);
      if (this.step === 0) this.loop++;
    }
  }

  playStep(step, t, stepDur) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const { chords, melody, drums } = this.song;
    const chord = chords[bar];

    // drums
    if (drums.k.includes(s)) this.kick(t);
    if (drums.s.includes(s)) this.snare(t);
    if (drums.h.includes(s)) this.hat(t, 0.035, 0.05);
    if (drums.o.includes(s)) this.hat(t, 0.11, 0.035);

    // bass: root on the beats, octave up on the offbeats (bouncy)
    if (s % 2 === 0) {
      const m = chord.root + (s % 4 === 2 ? 12 : 0);
      this.note(midiHz(m), t, stepDur * 1.6, 'triangle', 0.32);
    }
    // chord stabs on the offbeats
    if (s % 4 === 2) for (const m of chord.tones) this.note(midiHz(m), t, stepDur * 0.9, 'square', 0.035, 1400);

    // the lead melody (with echo)
    for (const [at, m, len] of melody[bar]) {
      if (at !== s) continue;
      this.note(midiHz(m), t, stepDur * len * 0.92, 'square', 0.07, 2600, true);
      // every other loop: a bell an octave up joins in
      if (this.loop % 2 === 1) this.note(midiHz(m + 12), t, stepDur * len * 0.8, 'sine', 0.035);
    }
  }

  note(freq, t, dur, type, vol, lowpass = 0, echo = false) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      node = node.connect(f);
    }
    node.connect(g);
    g.connect(this.audio.music);
    if (echo) g.connect(this.delay);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(this.audio.music);
    o.start(t);
    o.stop(t + 0.18);
  }

  snare(t) {
    this.noiseHit(t, 0.14, 'bandpass', 1900, 0.35);
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(this.audio.music);
    o.start(t);
    o.stop(t + 0.1);
  }

  hat(t, dur, vol) {
    this.noiseHit(t, dur, 'highpass', 7500, vol);
  }

  noiseHit(t, dur, type, freq, vol) {
    const ctx = this.audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.audio.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.audio.music);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}
