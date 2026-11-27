// All the game's sound, made live with the Web Audio API (no sound files): sound effects here, the
// background music in MusicPlayer. Volumes follow Boxity's synced settings (master_volume,
// music_volume, the profile card's speaker), and everything goes quiet during an ad break.
// Browsers only allow sound after the player touches the page, so it starts on the first input.

const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = 1;
    this.musicLevel = 1;
    this.unlocked = false;
    const unlock = () => {
      this.start();
      if (this.ctx?.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    // every button in the UI makes a little water-drop sound
    this.onButton = (e) => { if (e.target.closest?.('button')) this.drop(); };
    window.addEventListener('pointerdown', this.onButton, true);
  }

  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.out = this.ctx.createGain();            // master volume
      this.out.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();            // sound effects
      this.sfx.gain.value = 0.8;
      this.sfx.connect(this.out);
      this.music = this.ctx.createGain();          // music bus (MusicPlayer plays into it)
      this.music.connect(this.out);
      const n = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, n, n); // one second of white noise, reused
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.onStart?.();
    }
    if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume().catch(() => {});
    this.unlocked = true;
  }

  // Boxity settings are strings "0".."100"
  setVolumes(settings) {
    this.master = Math.max(0, Math.min(1, Number(settings.master_volume ?? 80) / 100));
    this.musicLevel = Math.max(0, Math.min(1, Number(settings.music_volume ?? 80) / 100));
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(this.master, t, 0.05);
    this.music.gain.setTargetAtTime(this.musicLevel * 0.42, t, 0.05);
  }

  // ad breaks: silence everything until they end
  setPaused(paused) {
    this.paused = paused;
    if (!this.ctx) return;
    if (paused) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  // ---------------------------------------------------------------- building blocks

  // a tone gliding from f to f2 with a quick attack and a decay
  tone(f, dur, { type = 'sine', vol = 0.3, f2 = f, at = 0, attack = 0.005, out = this.sfx, curve = 'exp' } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2 !== f) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
      else o.frequency.linearRampToValueAtTime(f2, t + dur);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // filtered noise: crunches, whooshes, crashes
  noise(dur, { vol = 0.3, type = 'bandpass', freq = 1000, freq2 = freq, q = 1, at = 0, attack = 0.003, out = this.sfx } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    if (freq2 !== freq) filter.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------- the game's sounds

  // a water drop: a quick upward "plip" with a tiny echo drop (every button click)
  drop() {
    const f = 520 + Math.random() * 120;
    this.tone(f, 0.11, { f2: f * 2.6, vol: 0.22, attack: 0.002 });
    this.tone(f * 1.9, 0.06, { f2: f * 3.2, vol: 0.06, at: 0.09 });
  }

  // an axe (or fist) biting into wood: a woody thunk with a crunch
  chop() {
    const k = 0.9 + Math.random() * 0.2;
    this.noise(0.09, { type: 'bandpass', freq: 900 * k, q: 2.2, vol: 0.45 });
    this.tone(150 * k, 0.13, { f2: 70, vol: 0.45 });
    this.tone(1800 * k, 0.03, { type: 'triangle', vol: 0.06 });
  }

  // a tree cracking and crashing down (quieter the further away it is)
  timber(level = 1) {
    if (level <= 0.03) return;
    this.noise(0.55, { type: 'lowpass', freq: 2400, freq2: 250, vol: 0.35 * level });
    this.tone(220, 0.25, { type: 'sawtooth', f2: 90, vol: 0.06 * level });
    this.noise(0.4, { type: 'lowpass', freq: 400, freq2: 80, vol: 0.55 * level, at: 0.55 });
    this.tone(95, 0.45, { f2: 38, vol: 0.7 * level, at: 0.55 });
  }

  // grabbing an egg: a bright little rising sparkle
  pickup() {
    [784, 988, 1319].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.18, at: i * 0.06 }));
    this.tone(2637, 0.22, { vol: 0.05, at: 0.18 });
  }

  // an egg landing on the drop pad: a soft pop
  plop() {
    this.tone(520, 0.14, { f2: 240, vol: 0.32 });
    this.noise(0.05, { type: 'highpass', freq: 3000, vol: 0.06 });
  }

  // pulling the lever: a clunk, then the machine whirring up
  lever() {
    this.tone(120, 0.07, { type: 'square', vol: 0.14 });
    this.noise(0.06, { type: 'bandpass', freq: 600, vol: 0.25 });
    this.tone(70, 0.9, { type: 'sawtooth', f2: 190, vol: 0.07, at: 0.08, curve: 'lin' });
  }

  // the new egg flying out of the machine
  whoosh() {
    this.noise(0.6, { type: 'bandpass', freq: 350, freq2: 2600, q: 1.4, vol: 0.28 });
  }

  // an egg hatching: a happy little fanfare with sparkles
  hatch() {
    [72, 76, 79, 84].forEach((m, i) => this.tone(midiHz(m), 0.22, { type: 'triangle', vol: 0.2, at: i * 0.09 }));
    [72, 76, 79].forEach((m) => this.tone(midiHz(m + 12), 0.7, { type: 'sine', vol: 0.08, at: 0.38 }));
    for (let i = 0; i < 5; i++) this.tone(2000 + Math.random() * 2000, 0.12, { vol: 0.04, at: 0.4 + i * 0.07 });
  }

  // an animal has spotted you: two sharp alarm beeps
  alert() {
    this.tone(880, 0.09, { type: 'square', vol: 0.1 });
    this.tone(1175, 0.12, { type: 'square', vol: 0.1, at: 0.11 });
  }

  // caught: you burst into pieces
  shatter() {
    this.noise(0.4, { type: 'lowpass', freq: 3500, freq2: 300, vol: 0.55 });
    this.tone(620, 0.45, { type: 'square', f2: 110, vol: 0.1 });
    this.tone(110, 0.35, { f2: 40, vol: 0.6 });
  }

  // money: a coin ding (big = a fuller jingle)
  coin(big = false) {
    this.tone(988, 0.07, { type: 'square', vol: 0.08 });
    this.tone(1319, 0.25, { type: 'square', vol: 0.08, at: 0.07 });
    if (big) [1568, 2093].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.07, at: 0.16 + i * 0.07 }));
  }

  // something did not work (not enough cash...)
  error() {
    this.tone(196, 0.12, { type: 'square', vol: 0.07 });
    this.tone(165, 0.16, { type: 'square', vol: 0.07, at: 0.13 });
  }

  jump() {
    this.tone(280, 0.16, { f2: 640, vol: 0.12 });
  }

  // entering a new forest: a short bright chime
  zone() {
    [67, 72, 76].forEach((m, i) => this.tone(midiHz(m), 0.3, { type: 'triangle', vol: 0.12, at: i * 0.07 }));
  }

  // a popup opening
  // thunder: a sharp crack, then a long low rumble that rolls away (quieter when far)
  thunder(at = 0, loud = 1) {
    this.noise(0.35, { type: 'highpass', freq: 1800, freq2: 600, vol: 0.28 * loud, at });
    this.noise(3.8, { type: 'lowpass', freq: 520, freq2: 55, vol: 0.75 * loud, attack: 0.08, at: at + 0.05 });
    this.noise(2.6, { type: 'lowpass', freq: 260, freq2: 40, vol: 0.5 * loud, attack: 0.3, at: at + 0.9 });
  }

  // the steady hiss of rain while it storms (level 0..1), one looping sound faded up and down
  setRain(level) {
    if (!this.ready) return;
    if (!this.rainGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 0.5;
      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      src.connect(filter).connect(this.rainGain).connect(this.sfx);
      src.start();
    }
    this.rainGain.gain.setTargetAtTime(0.09 * level, this.ctx.currentTime, 0.4);
  }

  pop() {
    this.tone(660, 0.08, { f2: 990, vol: 0.1 });
  }

  dispose() {
    window.removeEventListener('pointerdown', this.onButton, true);
    this.ctx?.close().catch(() => {});
  }
}

export { midiHz };
