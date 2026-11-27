// Owns the renderer, the scene and the main loop, and mirrors the room's state into the world.

import * as THREE from 'three';
import { avatarPfpUrl, bloxity } from '../bloxity/bloxity.js';
import { connect, reloadGame, startedFine } from '../net/connection.js';
import { ANIMALS, AXES, EGGS, PETS, PLOT, PLOTS, SHOPS, TREES, WEATHER, WORLD, formatNumber, plotToWorld, treeHp, walkSpeed, zoneAt } from '../shared/gameData.js';
import { AnimalView } from './entities/Animals.js';
import { GuideArrows } from './entities/GuideArrows.js';
import { QualityManager } from './systems/QualityManager.js';
import { Sky } from './entities/Sky.js';
import { Weather } from './entities/Weather.js';
import { LIMITED, adCashAmount, featuredEndsAt, limitedPrice } from '../shared/progression.js';
import { Effects } from './entities/Effects.js';
import { GroundEggView } from './entities/Egg.js';
import { EggNodeView } from './entities/EggNodes.js';
import { InviteSpot } from './entities/InviteSpot.js';
import { LocalPlayer, RemotePlayer } from './entities/Player.js';
import { preloadAvatar } from './entities/BloxityAvatar.js';
import { loadEmotes } from '../bloxity/emotes.js';
import { prewarmPetThumbs } from './util/petArt.js';
import { AudioManager } from './audio/AudioManager.js';
import { MusicPlayer } from './audio/MusicPlayer.js';
import { buildStartingPlace } from './scenes/StartingPlace.js';
import { CameraController } from './systems/CameraController.js';
import { InputSystem } from './systems/InputSystem.js';
import { InteractionSystem } from './systems/InteractionSystem.js';
import { PhysicsWorld } from './systems/PhysicsWorld.js';
import { loadFonts } from './util/canvasText.js';

const CULL_EVERY = 0.25;      // seconds between draw-distance checks
const SHAKE_SECONDS = 0.35;
const CLICK_MOVE_LIMIT = 6;
const SHADOW_RANGE = 170;
const SUN_OFFSET = new THREE.Vector3(175, 425, 225);
const AVATAR_HIP = 2.6;
const CAMERA_TRUNK_MARGIN = 0.8;
const SPARKLE_STEP = 3.5; // a puff of magic sparkles every this many units run
const _sparkleAt = new THREE.Vector3();
// A light mist in the distance, always: far-away things soften into it, and as you walk closer they
// come out of it clear (nothing pops in or vanishes, and things right by the player are never misted).
// How far the mist starts depends on the device (quality tier); a lower frame rate or a worse ping
// pulls it in closer (so less is drawn and the game keeps running smoothly) and it eases back out
// again when they get better. It moves slowly, so it never jumps.
// near = where the mist starts, far = where it is complete (and beyond which nothing is drawn).
const FOG_COLOR = new THREE.Color('#cfe4f7'); // a pale sky blue, the same as the sky's horizon
const STORM_FOG = new THREE.Color('#7a8290');  // the grey mist of a rain storm
const _fog = new THREE.Color();
const FOG = {
  low: { near: 160, far: 520 },
  medium: { near: 280, far: 850 },
  high: { near: 500, far: 1400 },
  ultra: { near: 650, far: 1800 },
};
const FOG_MIN_FAR = 260;       // however bad things get, at least this far is always visible
const FOG_NEAR_KEEP = 90;      // and the mist never starts nearer than this to the camera
const FOG_EASE = 0.6;          // how fast the mist moves to a new distance (slow, so it never jumps)
const CULL_MARGIN = 1.04;      // things are hidden only once they're fully inside the mist
// Live adjustment on top of the tier, from the measured frame rate and ping:
const FOG_FPS = { good: 55, bad: 30, min: 0.55 };   // at 55+ FPS no mist change; at 30 FPS 55% of the distance
const FOG_PING = { good: 110, bad: 320, min: 0.5 }; // at 110 ms or less no change; at 320 ms half the distance
const lerpFactor = (value, good, bad, min) => {
  const k = Math.max(0, Math.min(1, (value - good) / (bad - good)));
  return 1 - k * (1 - min);
};

function safeParse(json) {
  try { return JSON.parse(json); } catch { return {}; }
}

export class Game {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.sendTimer = 0;
    this.lastSent = '';
    this.remotes = new Map();
    this.myHits = new Map();   // giant egg id -> when I last hit it (the Eggs panel)
    this.tool = 'scythe';     // hotbar: scythe | bat
    this.groundEggs = new Map();
    this.animals = new Map();
    this.eggsSynced = false;
    this.zoneId = null;
    this.lastSpeed = null;
    this.sendInterval = 0.1;
    this.cullTimer = 0;
    this.shakeLeft = 0;
    this.me = null;
    this.running = false;
    this.focus = new THREE.Vector3();
  }

  // One loading stage: tells Boxity and our loading page, then lets the browser draw the bar before
  // the next (possibly heavy) stage runs.
  async loadingStep(text, progress) {
    bloxity.loadingStep(text);
    this.store.set({ loading: { text, progress } });
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  }

  async start() {
    // sound: starts on the player's first touch / key (browsers block it before that), even while loading
    this.audio = new AudioManager();
    this.music = new MusicPlayer(this.audio);
    this.audio.onStart = () => this.music.start();
    bloxity.loadingStart(); // Bloxity shows its loading page until loadingEnd
    bloxity.adScreen('lobby'); // banners only while loading
    await this.loadingStep('Loading fonts', 0.08);
    await loadFonts();
    this.setupRenderer();

    await this.loadingStep('Building the world', 0.22);
    this.physics = new PhysicsWorld();
    this.effects = new Effects(this.scene);
    this.world = buildStartingPlace(this.scene, this.physics, this.effects);
    this.guideArrows = new GuideArrows(this.scene);
    this.inviteSpot = new InviteSpot(this.scene, SHOPS.invite.x, SHOPS.invite.z);
    this.sky = new Sky();
    this.scene.add(this.sky.mesh);
    // snow or a rain storm, every 5 minutes (the server says which)
    this.weather = new Weather(this.scene, 'high');
    this.weather.onThunder = (delay, loud) => this.audio.thunder(delay, loud);
    // the storm's darkness and the lightning's white flash, laid over the whole picture (most of the
    // world is unlit, so dimming the lights alone would not darken it)
    this.stormTint = document.createElement('div');
    this.stormTint.className = 'storm-tint';
    this.container.appendChild(this.stormTint);

    await this.loadingStep('Loading your avatar', 0.62);
    await preloadAvatar();

    await this.loadingStep('Joining a server', 0.75);
    this.room = await connect({
      token: bloxity.token(),
      guestKey: bloxity.guestKey(),
      guestName: bloxity.displayName(),
      avatar: bloxity.equipped,
      props: bloxity.proportions,
    });
    // listen for the first state straight away: on a slow device it can arrive while the loading
    // page is still redrawing, and waiting only after that would wait forever
    const firstState = new Promise((resolve) => {
      if (this.room.state?.players?.get?.(this.room.sessionId)) return resolve();
      this.room.onStateChange.once(resolve);
    });
    await this.loadingStep('Getting ready', 0.92);
    await firstState;
    bloxity.updateRoom(this.room.roomId);

    this.me = this.room.state.players.get(this.room.sessionId);
    this.player = new LocalPlayer({
      name: bloxity.displayName(),
      equipped: bloxity.equipped,
      proportions: bloxity.proportions,
      skinUrl: bloxity.skinTextureUrl(),
      x: this.me.x,
      z: this.me.z,
    });
    this.scene.add(this.player.root, this.player.trail.mesh);

    this.setupInput();
    this.listen();
    this.setupQuality();
    this.setupPlatform();
    this.showMyBase();
    this.room.send('offlineCheck'); // "you earned while away" popup, once we are listening

    this.running = true;
    this.store.set({ loading: { text: 'Ready!', progress: 1 } });
    bloxity.loadingEnd();
    bloxity.adScreen('gameplay'); // playing: no banners from here on
    bloxity.gameplayStart();
    this.store.set({ phase: 'playing' });
    startedFine();
    // pet pictures for the popups, drawn in idle moments (on Low quality only when a popup needs them)
    if (this.quality?.tier !== 'low') prewarmPetThumbs(Object.keys(PETS));
    if (import.meta.env.DEV) window.__game = this;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = FOG_COLOR.clone(); // fallback behind the sky dome, never black
    // The mist and draw distance follow the quality tier and the connection (see updateFogTarget).
    this.scene.fog = new THREE.Fog(FOG_COLOR, FOG.ultra.near, FOG.ultra.far);
    this.fogTarget = { near: FOG.ultra.near, far: FOG.ultra.far };
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.5, 6000);

    this.hemi = new THREE.HemisphereLight('#ffffff', '#b8d8a0', 1.7);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff4e0', 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -SHADOW_RANGE;
    c.right = SHADOW_RANGE;
    c.top = SHADOW_RANGE;
    c.bottom = -SHADOW_RANGE;
    c.near = 1;
    c.far = 1000;
    this.sun.shadow.bias = -0.001;
    this.sun.shadow.normalBias = 0.4;
    this.scene.add(this.sun, this.sun.target);

    // Any change of size (window, rotation, Bloxity's frame, browser zoom, another monitor) is
    // handled once per frame at most: dragging a window edge fires dozens of events, and rebuilding
    // the picture for each of them made the game stutter.
    this.onResize = () => {
      if (this.resizeQueued) return;
      this.resizeQueued = true;
      requestAnimationFrame(() => { this.resizeQueued = false; this.updateResolution(); });
    };
    window.addEventListener('resize', this.onResize);
    this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this.onResize) : null;
    this.resizeObserver?.observe(this.container);
    this.watchSharpness();
    this.updateResolution();
  }

  // How many pixels the game draws, from the screen's size, its sharpness (devicePixelRatio, which
  // browser zoom and moving to another monitor change) and the quality tier:
  //   never blurry: never fewer pixels than the screen really has (1 per CSS pixel, or the screen's
  //                 own pixels when zoomed out);
  //   never laggy:  on sharp screens the extra sharpness stops at the tier's pixel budget, so a big
  //                 (or fullscreen 4K) window does not suddenly cost twice as much to draw.
  updateResolution() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    const q = this.q;
    const wanted = Math.min(dpr, q ? q.pixelRatio : 1, Math.sqrt((q?.maxPixels || Infinity) / (w * h)));
    const ratio = Math.round(Math.max(wanted, Math.min(1, dpr)) * 100) / 100;
    if (w === this.viewW && h === this.viewH && ratio === this.renderer.getPixelRatio()) return;
    this.viewW = w;
    this.viewH = h;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.quality?.settle(); // the frame that rebuilt the picture is not a sign of a slow device
  }

  // devicePixelRatio has no event of its own: a media query for the current value tells when it changes.
  watchSharpness() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const changed = () => { this.sharpnessOff?.(); this.onResize(); this.watchSharpness(); };
    mq.addEventListener?.('change', changed);
    this.sharpnessOff = () => mq.removeEventListener?.('change', changed);
  }

  setupInput() {
    this.input = new InputSystem();
    this.camController = new CameraController(this.camera, this.renderer.domElement);
    this.camController.focus.copy(this.player.body.pos);
    this.interaction = new InteractionSystem(this);

    this.input.onKey((code) => {
      if (code === 'KeyE') this.interaction.interact();
      else if (code === 'KeyQ') this.interaction.dropEggs();
      else if (code === 'KeyF') this.interaction.toggleAutoSwing();
      else if (code === 'Digit1') this.setTool('scythe'); // the hotbar: 1 = your scythe, 2 = the bat
      else if (code === 'Digit2') this.setTool('bat');
      else if (code === 'Escape') {
        // close what is open; with nothing open, Escape opens Boxity's menu (the game draws no menu of its own)
        const ui = this.store.get();
        if (ui.giftFor) this.store.set({ giftFor: null });
        else if (ui.popup || ui.opened || ui.shop) this.store.set({ shop: false, popup: null, opened: null });
        else bloxity.showMenu();
      }
    });

    const dom = this.renderer.domElement;
    let press = null;
    this.onPointerDown = (e) => {
      press = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    };
    this.onPointerUp = (e) => {
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < CLICK_MOVE_LIMIT) {
        if (this.clickedAdBoard(e)) this.room.send('adCash'); // the Watch Ad board on the front wall
        else if (this.clickedMesh(e, this.world.plots[this.me?.plot]?.board)) this.room.send('buy', { kind: 'treadmill' }); // my Upgrade Treadmill board
        else this.interaction.click();
      }
      press = null;
    };
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerup', this.onPointerUp);

    this.unsubscribeSettings = bloxity.onSettings((s) => {
      this.camController.sensitivity = Number(s.camera_sensitivity) || 1;
      this.audio.setVolumes(s); // master / music volume (and the profile card's speaker)
      this.quality?.setCap(s.graphics_quality);
    });
  }

  listen() {
    this.room.onMessage('hit', ({ id, by, damage, hp, reward, fx, fz }) => {
      const view = this.world.trees.get(id);
      if (!view) return;
      view.hit(fx, fz, hp);
      if (by === this.room.sessionId) {
        this.audio.chop();
        this.myHits.set(id, performance.now());
      }
      if (hp <= 0) {
        // the egg cracking open, quieter the further away it is
        const far = Math.hypot(this.player.body.pos.x - view.tree.x, this.player.body.pos.z - view.tree.z);
        this.audio.timber(1 - far / 140);
      }
      const { x, z, scale } = view.tree;
      const top = view.topHeight;
      this.effects.floatText(`+${formatNumber(damage)}`, new THREE.Vector3(x + (Math.random() - 0.5) * 4, top * 0.7 + Math.random() * 3, z), '#7dff3f');
      // the egg grows: sparkles and a puff of its own colour burst out of it on every hit
      const shellColor = EGGS[view.type]?.color || '#fff1dc';
      this.effects.burst(new THREE.Vector3(x, top * 0.45, z), shellColor, 8, 10);
      this.effects.magicDust(new THREE.Vector3(x, top * 0.4, z), 10, 2.2 * scale, 7);
      if (hp <= 0) {
        // fully grown: it cracks open and the pet pops out
        this.effects.burst(new THREE.Vector3(x, top * 0.4, z), shellColor, 30, 22);
        this.effects.burst(new THREE.Vector3(x, top * 0.5, z), '#ffffff', 18, 18);
        this.effects.magicDust(new THREE.Vector3(x, 4 * scale, z), 36, 5 * scale, 12);
        this.effects.floatText('HATCHED!', new THREE.Vector3(x, top + 2, z), '#ffd21f', 2.2);
        if (by === this.room.sessionId) this.interaction.markDone('chop'); // the guide's first step is done
        if (reward && by === this.room.sessionId) this.effects.floatText(`+${formatNumber(reward)}`, new THREE.Vector3(x, 10 * scale, z), '#7dff3f', 1.6);
        this.effects.burst(new THREE.Vector3(x, 3, z), '#a8e85c', 22, 18);
        const d = this.player.body.pos.distanceTo(new THREE.Vector3(x, 0, z));
        if (d < 60) this.shake(0.5 * (1 - d / 60));
      }
      if (by !== this.room.sessionId) this.remotes.get(by)?.punch();
    });
    // someone's bat knocked what a player carried out of their hands
    this.room.onMessage('bonked', ({ by, target }) => {
      const victim = target === this.room.sessionId ? this.player : this.remotes.get(target);
      if (victim) this.effects.burst(victim.root.position.clone().add(new THREE.Vector3(0, 5, 0)), '#ffd21f', 16, 14);
      if (by !== this.room.sessionId) this.remotes.get(by)?.punch();
      if (target === this.room.sessionId) this.toast('BONK! You dropped what you carried!', '#ff5a5a');
      else if (by === this.room.sessionId) this.toast('BONK! Grab it!', '#7dff3f');
    });
    this.room.onMessage('stolen', ({ animal, from, x, z }) => {
      this.effects.burst(new THREE.Vector3(x, 4, z), '#fff3b0', 18, 16);
      // the animal rammed them from behind: they burst into pieces that fly up, then pop back
      if (from !== this.room.sessionId) {
        const remote = this.remotes.get(from);
        if (remote?.root.visible) {
          this.effects.shatter(remote.root.position);
          remote.shatter();
        }
        return;
      }
      this.effects.shatter(this.player.body.pos);
      this.audio.shatter();
      this.player.shatter();
      this.player.knock(x, z);
      this.shake(0.8);
      this.toast('Your egg was stolen!', '#ff5a5a');
    });
    this.room.onMessage('bought', ({ name }) => { this.toast(`You got the ${name}!`, '#7dff3f'); this.audio.coin(true); });
    // shop / pets / index / rebirth results
    this.room.onMessage('notice', ({ text, ok }) => {
      this.toast(text, ok ? '#7dff3f' : '#ff5a5a');
      if (ok) this.audio.coin(); else this.audio.error();
    });
    this.room.onMessage('opened', ({ pets }) => this.store.set({ opened: { pets, at: performance.now() } }));
    this.room.onMessage('offline', (info) => this.store.set({ offline: info }));
    this.room.onMessage('gift', ({ amount }) => {
      this.audio.coin(true);
      const p = this.player.body.pos;
      this.effects.floatText(`+$${formatNumber(amount)}`, new THREE.Vector3(p.x, p.y + 8, p.z), '#7dff3f', 1.8);
      this.effects.magicDust(new THREE.Vector3(p.x, p.y + 4, p.z), 30, 4, 10);
    });
    this.room.onMessage('hatched', (result) => {
      this.interaction.markDone('hatch');
      this.audio.hatch();
      this.store.set({ reveal: { ...result, at: performance.now() } });
      if (result.bonus > 0) {
        clearTimeout(this.bonusTimer);
        this.bonusTimer = setTimeout(() => this.toast(`+$${formatNumber(result.bonus)} Starter Cash! Buy your first scythe!`, '#7dff3f'), 3300);
      }
      clearTimeout(this.revealTimer);
      this.revealTimer = setTimeout(() => this.store.set({ reveal: null }), 3200);
    });
    this.room.onLeave(() => {
      if (this.disposed) return; // we left on purpose
      this.connectionLost();
    });
  }

  // The connection dropped (bad signal, the phone slept, the server restarted...). No dead end: the
  // loading page comes back (ours and Bloxity's), we wait for the internet if it is gone, then load
  // the game again in the same room. Progress is kept on the server, eggs in progress included.
  connectionLost() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.music?.stop();
    const roomId = this.room?.roomId;
    const step = (text, progress) => {
      bloxity.loadingStep(text);
      this.store.set({ phase: 'reconnecting', loading: { text, progress } });
    };
    bloxity.gameplayEnd();
    bloxity.loadingStart();
    step('Connection lost. Reconnecting', 0.1);
    const go = () => {
      if (!navigator.onLine) { step('Waiting for the internet', 0.1); return; }
      window.removeEventListener('online', go);
      clearInterval(this.onlineTimer);
      step('Reconnecting', 0.4);
      setTimeout(() => reloadGame(roomId), 900);
    };
    window.addEventListener('online', go);
    this.onlineTimer = setInterval(go, 2000);
    go();
  }

  setupQuality() {
    this.quality = new QualityManager({
      onTier: (tier, q) => this.applyQuality(tier, q),
      onNetwork: (grade, n) => {
        this.sendInterval = n.sendInterval;
        RemotePlayer.smoothing = n.smoothing;
        AnimalView.smoothing = n.smoothing - 2;
        this.network = grade;
        this.updateFogTarget();
        this.effects.setMagicLevel(this.tier, grade);
      },
    });
    this.quality.setCap(bloxity.settings.graphics_quality);
    this.quality.start();
    this.room.onMessage('pong', ({ t }) => { if (typeof t === 'number') this.quality.pong(t); });
  }

  // Turns the heavy things up or down for the chosen tier.
  applyQuality(tier, q) {
    this.q = q;
    this.updateResolution(); // sharpness for this tier (never blurry, see updateResolution)
    const sun = this.sun;
    sun.castShadow = q.shadows;
    if (q.shadows) {
      if (sun.shadow.mapSize.x !== q.shadowSize) {
        sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
      const c = sun.shadow.camera;
      c.left = c.bottom = -q.shadowRange;
      c.right = c.top = q.shadowRange;
      c.updateProjectionMatrix();
    }
    // shadows redrawn every frame, or every 2nd frame on Medium (half the shadow cost)
    this.renderer.shadowMap.autoUpdate = !q.shadows || q.shadowEvery <= 1;
    this.renderer.shadowMap.needsUpdate = true;
    // the extras weaker devices skip
    GroundEggView.sparkles = q.sparkles;
    EggNodeView.sparkles = q.sparkles;
    RemotePlayer.trails = q.otherTrails;
    this.weather?.setTier(this.quality.tier); // less snow and rain on weaker devices
    this.effects.particles = q.particles;
    this.world.smoke.mesh.visible = q.smoke;
    // the camera sees the whole world: the mist and cull decide what is drawn, so there is never a hard edge
    this.camera.far = 6000;
    this.camera.updateProjectionMatrix();
    this.tier = tier;
    this.updateFogTarget();
    this.effects.setMagicLevel(tier, this.network);
    this.cullTimer = CULL_EVERY; // re-check what is in view now
    this.store.set({ perf: { ...this.store.get().perf, tier: q.label } });
  }

  // How far you see. High/Ultra with a smooth frame rate and a good ping: no mist at all. When the
  // FPS drops or the ping rises, the mist comes in (the worse, the closer); Low and Medium (a weak
  // device or a bad connection) always have some. Re-checked every second (publishPerf) and
  // whenever the tier or connection grade changes.
  updateFogTarget() {
    const q = this.quality;
    const fps = q ? lerpFactor(-q.fps, -FOG_FPS.good, -FOG_FPS.bad, FOG_FPS.min) : 1; // lower FPS -> closer mist
    const ping = q?.ping == null ? 1 : lerpFactor(q.ping, FOG_PING.good, FOG_PING.bad, FOG_PING.min);
    const net = this.network === 'poor' ? 0.65 : 1; // a poor connection grade pulls it in too
    const k = Math.min(fps, ping, net);              // whichever is worst decides
    const base = FOG[this.tier] || FOG.medium;
    const far = Math.max(FOG_MIN_FAR, base.far * k);
    // a wide soft band between near and far, so things fade in gradually
    this.fogTarget = { near: Math.max(FOG_NEAR_KEEP, Math.min(base.near * k, far * 0.4)), far };
  }

  // The mist eases towards its target distance. The sky's horizon gets a matching haze: faint when
  // the mist is far away, a little stronger when it has come in close.
  updateFog(dt) {
    const fog = this.scene.fog;
    const t = Math.min(1, dt * FOG_EASE);
    fog.near += (this.fogTarget.near - fog.near) * t;
    fog.far += (this.fogTarget.far - fog.far) * t;
    const close = 1 - (fog.far - FOG_MIN_FAR) / (FOG.ultra.far - FOG_MIN_FAR);
    // a storm turns the mist grey and darkens the light; lightning lights everything up for a moment
    const storm = this.weather?.rainK || 0;
    const flash = this.weather?.flash || 0;
    _fog.copy(FOG_COLOR).lerp(STORM_FOG, storm);
    fog.color.copy(_fog);
    this.scene.background.copy(_fog);
    this.sky.setFog(_fog, Math.max(0.25, Math.min(0.85, 0.25 + close * 0.6)) + storm * 0.1);
    this.sky.setStorm(storm, flash);
    this.hemi.intensity = 1.7 * (1 - 0.25 * storm) + flash * 1.6;
    this.sun.intensity = 2.5 * (1 - 0.45 * storm) + flash * 0.8;
    const dark = 0.24 * storm * (1 - flash); // a storm is darker, but you can still see well
    this.stormTint.style.background = flash > 0.02 ? `rgba(235, 240, 255, ${(flash * 0.45).toFixed(3)})` : `rgba(12, 16, 30, ${dark.toFixed(3)})`;
  }

  // Hides trees, animals and other players beyond the draw distance (checked a few times a second).
  cull(dt) {
    this.cullTimer += dt;
    if (this.cullTimer < CULL_EVERY) return;
    this.cullTimer = 0;
    // only things fully inside the mist are skipped, so nothing pops in or out of sight
    const far = Math.max(this.scene.fog.far, this.fogTarget.far) * CULL_MARGIN;
    const p = this.player.body.pos;
    const near = (x, z, margin = 0) => Math.hypot(x - p.x, z - p.z) < far + margin;
    for (const tree of this.world.trees.values()) tree.group.visible = near(tree.tree.x, tree.tree.z, 30 * tree.tree.scale);
    for (const animal of this.animals.values()) {
      animal.visible = near(animal.target.x, animal.target.z, 20);
      animal.root.visible = animal.visible;
    }
    for (const remote of this.remotes.values()) remote.root.visible = near(remote.target.x, remote.target.z, 40);
    for (const egg of this.groundEggs.values()) egg.group.visible = near(egg.x, egg.z, 10);
    // world chunks (ground, walls, decor) further along the road than that are not drawn
    for (const chunk of this.world.chunks) {
      const c = chunk.userData.chunk;
      if (c) chunk.visible = Math.abs(c.z - p.z) - c.half < far + 80;
    }
  }

  shake(strength) {
    if (!this.q?.cameraShake) return;
    this.shakeLeft = SHAKE_SECONDS;
    this.shakeStrength = strength;
  }

  // A trunk between the player and the camera pulls the camera in front of it.
  keepCameraOutOfTrunks() {
    const f = this.focus, c = this.camera.position;
    const dx = c.x - f.x, dz = c.z - f.z;
    const a = dx * dx + dz * dz;
    if (a < 1e-4) return;
    let nearest = 1;
    for (const circle of this.physics.circles) {
      if (!circle.active) continue;
      const r = circle.r + CAMERA_TRUNK_MARGIN;
      const fx = f.x - circle.x, fz = f.z - circle.z;
      const b = 2 * (fx * dx + fz * dz);
      const cc = fx * fx + fz * fz - r * r;
      if (cc < 0) continue; // the player is up against it
      const disc = b * b - 4 * a * cc;
      if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t < 0 || t >= nearest) continue;
      if (f.y + (c.y - f.y) * t > (circle.top ?? Infinity)) continue;
      nearest = t;
    }
    if (nearest >= 1) return;
    c.set(f.x + dx * nearest, f.y + (c.y - f.y) * nearest, f.z + dz * nearest);
    this.camera.lookAt(f);
  }

  // The trunk of the tree you are close enough to chop glows see-through green.
  highlightNearTree() {
    const t = this.interaction.tree;
    const view = t?.near ? this.world.trees.get(t.def.id) : null;
    if (view !== this.glowTree) {
      this.glowTree?.setHighlight(false);
      this.glowTree = view;
    }
    view?.setHighlight(true);
  }

  // The player's Bloxity friends: for the invite popup, and sent to the server for the friend cash boost.
  // Called on joining, on sign-in and every time the Invite popup opens (so the list is fresh).
  async loadFriends() {
    if (!this.room) return;
    if (!bloxity.user) {
      this.store.set({ friends: [], friendsLoading: false, roomId: this.room.roomId });
      return;
    }
    this.store.set({ friendsLoading: true });
    const res = await bloxity.friends();
    const list = Array.isArray(res) ? res : res?.friends || res?.data || [];
    const friends = list.map((f) => ({
      id: String(f.id ?? f.userId ?? f._id ?? ''),
      name: f.displayName || f.username || f.name || 'Friend',
      online: !!(f.online ?? f.isOnline ?? (f.status === 'online' || f.status === 'in_game')),
      avatar: f.avatarUrl || f.pfp || f.avatar?.headshot || null,
    })).filter((f) => f.id);
    this.store.set({ friends, friendsLoading: false, roomId: this.room.roomId });
    this.room.send('friends', { ids: friends.map((f) => f.id) });
  }

  // Running leaves a trail of magic sparkles: a small puff at the feet every few steps. Few particles
  // each, and Effects caps how many are alive, so it never makes the game lag.
  runSparkles() {
    const p = this.player.body.pos;
    const last = this.lastSparkleAt;
    this.lastSparkleAt = last || p.clone();
    if (!last || !this.player.body.grounded || this.player.onTreadmill) {
      if (last) last.copy(p);
      return;
    }
    const moved = Math.hypot(p.x - last.x, p.z - last.z);
    const step = Math.max(SPARKLE_STEP, this.player.walkSpeed * 0.13); // faster runners: puffs further apart
    if (moved > step * 4) return void last.copy(p); // a jump in position (respawn, knockback)
    if (moved < step) return;
    last.copy(p);
    _sparkleAt.set(p.x, p.y + 0.3, p.z);
    this.effects.magicDust(_sparkleAt, 4, 0.9, 4);
  }

  // ---------------------------------------------------------------- Boxity platform hooks

  setupPlatform() {
    loadEmotes(); // the emote catalogue, so emotes from Boxity's picker can play
    this.platformOff = [
      bloxity.onAdBreak((on) => { this.adBreak = on; this.audio.setPaused(on); if (!on) this.clock.getDelta(); }),
      // a popup opening
      this.store.subscribe(() => {
        const popup = this.store.get().popup;
        if (popup && popup !== this.lastPopup) this.audio.pop();
        if (popup === 'invite' && this.lastPopup !== 'invite') this.loadFriends();
        this.lastPopup = popup;
      }),
      bloxity.onPlayerEvent(({ event, data }) => {
        if (event === 'respawn_request') this.sendHome(); // Boxity menu: Reset Character (instant)
        else if (event === 'play_emote' && typeof data === 'string') {
          this.player.avatar.playEmote(data);
          this.room.send('emote', { id: data }); // everyone else sees it too
        }
      }),
      // chat: Boxity draws the chat; the game shows each message over the sender's head
      bloxity.onChat((m) => {
        const who = m.isLocalPlayer ? this.player : this.remoteByUser(m.userId);
        if (!who) return;
        who.bubble?.parent?.remove(who.bubble);
        who.bubble = bloxity.attachBubble(THREE, who.root, m);
      }),
    ];
    // the top-right card: name + picture (the account when signed in, the Boxity guest otherwise),
    // the speaker (Boxity master volume) and the Gems balance
    this.platformOff.push(
      bloxity.onUser(() => { this.refreshProfile(); this.loadFriends(); }),
      bloxity.onSettings(() => this.refreshProfile(false)),
    );
    this.store.set({ embedded: bloxity.embedded });
    this.gemsTimer = setInterval(() => this.refreshProfile(), 30_000);
  }

  async refreshProfile(withGems = true) {
    if (withGems) this.gems = bloxity.user ? (await bloxity.gemsBalance()) ?? this.gems ?? 0 : 0;
    this.store.set({
      profile: { name: bloxity.displayName(), pfp: bloxity.pfp(), gems: this.gems ?? 0, muted: bloxity.settings.master_volume === '0' },
    });
  }

  remoteByUser(userId) {
    const id = String(userId || '');
    for (const [sessionId, remote] of this.remotes) {
      const p = this.room.state.players.get(sessionId);
      if (p && (p.userId === id || p.userId.replace(/^[a-z]+_/, '') === id)) return remote;
    }
    return null;
  }

  // back to your own base, popping back into view
  sendHome() {
    const at = { x: SHOPS.spawn.x + (Math.random() - 0.5) * 8, z: SHOPS.spawn.z + (Math.random() - 0.5) * 8 }; // the shared spawn
    this.player.body.pos.set(at.x, 0, at.z);
    this.player.body.vel.set(0, 0, 0);
    this.player.knockback = 0;
    this.player.root.visible = true;
    this.player.shatter();
    this.player.shatterT = 0.35; // just the pop back
  }

  toast(text, color) {
    this.store.set({ toast: { text, color, at: performance.now() } });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.store.set({ toast: null }), 2000);
  }

  syncAnimals() {
    const animals = this.room.state.animals;
    let chased = false;
    animals.forEach((a, id) => {
      let view = this.animals.get(id);
      if (!view) {
        view = new AnimalView(a, this.scene);
        this.animals.set(id, view);
      }
      view.setState(a);
      if ((a.mood === 'chase' || a.mood === 'alert') && a.target === this.room.sessionId) chased = true;
    });
    if (chased && !this.wasChased) this.audio.alert(); // an animal has spotted me
    this.wasChased = chased;
    this.store.set({ chased });
  }

  // sounds for what changed on me since last frame: an egg picked up, dropped on the pad, the lever
  // pulled (the machine starting) and the new egg launching
  eventSounds(me) {
    const carried = me.carried === '[]' ? 0 : (me.carried.match(/"type"/g) || []).length;
    const pad = this.padCount(me);
    if (this.soundState) {
      const was = this.soundState;
      if (carried > was.carried) this.audio.pickup();
      if (pad > was.pad) this.audio.plop();
      if (me.stage !== was.stage) {
        if (me.stage === 'shredding') this.audio.lever();
        else if (me.stage === 'launch') this.audio.whoosh();
      }
    }
    this.soundState = { carried, pad, stage: me.stage };
  }

  ownedAxes(me) {
    if (me.axes !== this.axesJson) {
      this.axesJson = me.axes;
      this.axesList = JSON.parse(me.axes || '[]');
    }
    return this.axesList;
  }

  padCount(me) {
    if (me.pad !== this.padJson) {
      this.padJson = me.pad;
      this.padLength = JSON.parse(me.pad || '[]').length;
    }
    return this.padLength;
  }

  // My cash, speed and axe, the zone I am in, and speed gained on the treadmill.
  publishPerf() {
    const now = performance.now();
    if (now - (this.perfAt || 0) < 1000) return;
    this.perfAt = now;
    this.updateFogTarget(); // follow the live frame rate and ping
    const q = this.quality;
    this.store.set({ perf: { tier: q.settings.label, fps: Math.round(q.fps), ping: q.ping === null ? null : Math.round(q.ping), network: this.network } });
  }

  syncMe() {
    const me = this.me;
    this.eventSounds(me);
    // passes, potions, pets, index and rebirths (only re-read when the server changes them)
    if (me.meta !== this.metaJson) {
      this.metaJson = me.meta;
      this.meta = safeParse(me.meta);
      this.store.set({ meta: { ...this.meta, at: performance.now() } });
    }
    if (me.allPets !== this.allPetsJson) {
      this.allPetsJson = me.allPets;
      this.store.set({ allPets: JSON.parse(me.allPets || '[]') });
    }
    this.player.walkSpeed = walkSpeed(me.speed) * (this.meta?.walk || 1) * (this.store.get().slowMode ? 0.5 : 1); // Walk potion, Slow Mode
    this.player.setAxe(me.axe);
    this.player.setTrail(me.trail);
    this.store.set({
      stats: {
        // the same array object until the axes change: a new one every frame would redraw the whole
        // HUD (and any open popup) 60 times a second
        cash: me.cash, income: me.income, speed: me.speed, axe: me.axe, axes: this.ownedAxes(me),
        stage: me.stage, eggType: me.eggType, eggLuck: me.eggLuck, pad: this.padCount(me),
      },
    });
    if (this.lastSpeed !== null && me.speed > this.lastSpeed) {
      const p = this.player.body.pos;
      this.effects.floatText(`+${formatNumber(me.speed - this.lastSpeed)} Speed`, new THREE.Vector3(p.x, p.y + 7, p.z), '#35b8ff');
      // the first speed earned by running (not on the treadmill) explains how it works
      if (!this.player.onTreadmill && !this.runHintShown) {
        this.runHintShown = true;
        this.toast('Running makes you faster! Keep running!', '#35b8ff');
      }
    }
    this.lastSpeed = me.speed;

    const zone = zoneAt(this.player.body.pos.z);
    const id = zone?.id || null;
    if (id !== this.zoneId) {
      if (zone && this.zoneId !== undefined) this.audio.zone(); // a new forest
      this.zoneId = id;
      clearTimeout(this.zoneTimer);
      this.store.set({ zone: zone ? { name: zone.name, difficulty: zone.difficulty, speed: zone.speed } : null });
      if (zone) this.zoneTimer = setTimeout(() => this.store.set({ zone: null }), 4000);
    }
  }

  pfpOf(p) {
    const key = p.avatar + p.props;
    if (!this.pfps) this.pfps = new Map();
    if (!this.pfps.has(key)) this.pfps.set(key, avatarPfpUrl(safeParse(p.avatar), safeParse(p.props)));
    return this.pfps.get(key);
  }

  // On joining: look at your own frame and say which one it is.
  showMyBase() {
    // facing the road into the forest (where the track starts), with the camera behind the player
    const p = this.player.body.pos;
    const dx = 0 - p.x, dz = WORLD.lineZ - p.z;
    this.player.ry = Math.atan2(dx, dz);
    this.camController.yaw = this.player.ry + Math.PI;
    this.camController.pitch = 0.22;
    this.camController.distance = this.camController.targetDistance = 36;
    this.toast('Welcome! Your base is the one with your name on it.', '#46e24a');
  }

  syncTrees() {
    const trees = this.room.state.trees;
    for (const def of TREES) {
      const state = trees.get(def.id);
      if (!state) continue;
      const view = this.world.trees.get(def.id);
      if (view.hp !== state.hp) view.setHp(state.hp); // only trees whose HP changed (most frames: none)
    }
  }

  syncGroundEggs() {
    const eggs = this.room.state.eggs;
    eggs.forEach((egg, id) => {
      if (!this.groundEggs.has(id)) this.groundEggs.set(id, new GroundEggView(id, egg, this.scene, { fly: this.eggsSynced, effects: this.effects }));
    });
    this.eggsSynced = true;
    for (const [id, view] of this.groundEggs) {
      if (eggs.has(id)) continue;
      view.dispose();
      this.groundEggs.delete(id);
    }
  }

  // The Alien Crate's stock and countdown, and what the Watch Ad board pays (or how long until it is ready).
  updateCrateAndBoard() {
    const meta = this.meta;
    const now = performance.now();
    const at = this.store.get().meta?.at || now;
    const two = (n) => String(n).padStart(2, '0');
    const ms = featuredEndsAt(Date.now()) - Date.now();
    const sec = Math.max(0, Math.floor(ms / 1000));
    const ends = `${Math.floor(sec / 86400)}d ${two(Math.floor(sec / 3600) % 24)}:${two(Math.floor(sec / 60) % 60)}:${two(sec % 60)}`;
    const left = meta ? Math.max(0, LIMITED.alienCrate.stock - (meta.bought?.alienCrate || 0)) : undefined;
    this.world.crate?.(this.time, { left, ends });
    const wait = Math.max(0, (meta?.adIn || 0) - (now - at));
    const w = Math.ceil(wait / 1000);
    // the Fuse Machine's "n/3": the most pets of one kind you have (unlocked), up to 3
    const counts = {};
    const locked = new Set(meta?.locked || []);
    for (const p of this.store.get().allPets) if (!locked.has(p.uid)) counts[p.id] = (counts[p.id] || 0) + 1;
    this.world.fuse?.(this.time, { have: Math.min(3, Math.max(0, ...Object.values(counts))) });
    const dragonLeft = meta ? Math.max(0, LIMITED.infernoDragon.stock - (meta.bought?.infernoDragon || 0)) : undefined;
    this.world.dragon?.(this.time, { left: dragonLeft, price: meta ? formatNumber(limitedPrice('infernoDragon', meta.income || 0)) : '' });
    // the weather sign: snow -> day -> rain, WEATHER.switchMs each
    const kind = this.room.state.weather || 'day';
    const leftS = this.room.state.weatherLeft || 0;
    const span = WEATHER.switchMs / 1000;
    const order = WEATHER.kinds;
    const until = (target) => {
      if (kind === target) return '';
      const steps = (order.indexOf(target) - order.indexOf(kind) + order.length) % order.length;
      const t = leftS + (steps - 1) * span;
      return `${Math.floor(t / 60)}:${two(t % 60)}`;
    };
    this.world.weatherSign?.(until('rain'), until('snow'));
    this.world.adBoard?.update(formatNumber(adCashAmount(meta?.income || 0)), w > 0 ? `${Math.floor(w / 60)}:${two(w % 60)}` : '');
  }

  // Did this click land on a board (its face, while it is shown)?
  clickedMesh(e, board) {
    if (!board?.group.visible) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    return ray.intersectObject(board.face).length > 0;
  }

  // Did this click land on the Watch Ad board? (a quick ray test against the board alone)
  clickedAdBoard(e) {
    const board = this.world.adBoard?.mesh;
    if (!board) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    return ray.intersectObject(board).length > 0;
  }

  // Slot 1 (scythe) or 2 (bat): everyone sees what you hold.
  setTool(id) {
    const tool = id === 'bat' ? 'bat' : 'scythe';
    if (tool === this.tool) return;
    this.tool = tool;
    this.player.setHeld(tool);
    this.store.set({ tool });
    this.room?.send('tool', { id: tool });
    if (tool === 'bat' && this.interaction?.autoSwing) this.interaction.toggleAutoSwing();
  }

  // Twice a second: the players here (for gifts) and the giant eggs I am growing (the Eggs panel).
  publishLists() {
    const now = performance.now();
    if (now - (this.listsAt || 0) < 500) return;
    this.listsAt = now;
    const players = [];
    this.room.state.players.forEach((p, id) => players.push({ id, name: p.name, me: id === this.room.sessionId }));
    const pkey = players.map((p) => p.id + p.name).join('|');
    if (pkey !== this.playersKey) {
      this.playersKey = pkey;
      this.store.set({ players: players.map((p) => ({ ...p, pfp: p.me ? '' : this.pfpOf(this.room.state.players.get(p.id)) })) });
    }
    const growing = [];
    for (const [id, at] of this.myHits) {
      const state = this.room.state.trees.get(id);
      const view = this.world.trees.get(id);
      if (!state || !view || state.hp <= 0 || now - at > 120_000) { this.myHits.delete(id); continue; }
      const def = view.tree;
      growing.push({ tree: def, hp: state.hp, max: treeHp(def), egg: view.type, name: `Giant ${EGGS[view.type]?.name || 'Egg'}` });
    }
    const gkey = growing.map((g) => `${g.tree.id}:${Math.floor((1 - g.hp / g.max) * 100)}`).join('|');
    if (gkey !== this.growingKey) {
      this.growingKey = gkey;
      this.store.set({ growing });
    }
  }

  syncPlayers() {
    const players = this.room.state.players;
    const owners = new Map();
    players.forEach((p, sessionId) => {
      owners.set(p.plot, { p, sessionId });
      if (sessionId === this.room.sessionId) return;
      let remote = this.remotes.get(sessionId);
      if (!remote) {
        remote = new RemotePlayer({
          name: p.name, x: p.x, y: p.y, z: p.z, ry: p.ry,
          equipped: safeParse(p.avatar), proportions: safeParse(p.props),
        });
        this.remotes.set(sessionId, remote);
        this.scene.add(remote.root, remote.trail.mesh);
        bloxity.playerJoined(p.name);
      }
      remote.setState(p);
    });
    for (const [sessionId, remote] of this.remotes) {
      if (players.has(sessionId)) continue;
      remote.dispose();
      this.remotes.delete(sessionId);
    }
    this.world.plots.forEach((plot, i) => {
      const owner = owners.get(i);
      const mine = owner?.sessionId === this.room.sessionId;
      const sign = owner ? { name: owner.p.name, mine, pfp: mine ? bloxity.pfp() : this.pfpOf(owner.p) } : null;
      plot.sync(owner?.p || null, mine, sign);
    });
    this.player.setCarried(this.me.carried);
  }

  sendPosition(dt) {
    this.sendTimer += dt;
    if (this.sendTimer < this.sendInterval) return;
    this.sendTimer = 0;
    const p = this.player.body.pos;
    const message = { x: p.x, y: p.y, z: p.z, ry: this.player.ry, anim: this.player.anim };
    const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)},${this.player.ry.toFixed(2)},${this.player.anim}`;
    if (key === this.lastSent) return;
    this.lastSent = key;
    this.room.send('move', message);
  }

  frame() {
    const rawDt = this.clock.getDelta();
    if (this.adBreak) return; // a Boxity ad break: everything stands still until it ends
    const dt = Math.min(0.05, rawDt);
    // Every part of the frame runs on its own (safe): if one part ever throws, the rest of the game
    // still moves, updates and draws, instead of the whole frame stopping (which looks like a freeze).
    const safe = this.safe;
    safe('quality', () => this.quality.frame(rawDt, (t) => this.room.send('ping', { t })));
    safe('cull', () => this.cull(dt));
    this.time += dt;

    safe('player', () => {
      this.input.update();
      this.player.update(dt, this.input, this.camController.yaw, this.physics);
      if (this.player.justJumped) { this.player.justJumped = false; this.audio.jump(); }
    });
    safe('sparkles', () => this.runSparkles());
    safe('camera', () => {
      this.focus.copy(this.player.body.pos).setY(this.player.body.pos.y + AVATAR_HIP);
      this.camController.update(dt, this.focus, this.input.cameraTurn(false), this.input.cameraPitch());
      this.keepCameraOutOfTrunks();
      if (this.shakeLeft > 0) {
        this.shakeLeft = Math.max(0, this.shakeLeft - dt);
        const k = this.shakeStrength * (this.shakeLeft / SHAKE_SECONDS);
        this.camera.position.x += (Math.random() - 0.5) * k * 2;
        this.camera.position.y += (Math.random() - 0.5) * k * 2;
      }
    });

    safe('syncTrees', () => this.syncTrees());
    safe('syncEggs', () => this.syncGroundEggs());
    safe('syncPlayers', () => this.syncPlayers());
    safe('syncAnimals', () => this.syncAnimals());
    safe('syncMe', () => this.syncMe());
    safe('perf', () => this.publishPerf());
    safe('lists', () => this.publishLists());
    AnimalView.viewer = this.player.body.pos; // difficulty badges show near the player
    // one broken thing (an animal, a tree, another player...) never stops the others
    for (const animal of this.animals.values()) if (animal.visible !== false) safe('animal', () => animal.update(dt));
    for (const tree of this.world.trees.values()) if (tree.group.visible) safe('tree', () => tree.update(dt)); // only trees in view
    for (const egg of this.groundEggs.values()) safe('egg', () => egg.update(dt));
    for (const remote of this.remotes.values()) if (remote.root.visible) safe('remote', () => remote.update(dt));
    for (const plot of this.world.plots) safe('plot', () => plot.update(dt, this.lampsLit || 0));
    safe('effects', () => this.effects.update(dt));
    if (this.q.smoke) safe('smoke', () => this.world.smoke.update(dt, this.camera));
    for (const glow of this.world.boardGlows) glow.uTime.value = this.time;
    // the dancing invite character only when it can be seen
    if (Math.hypot(this.player.body.pos.x - SHOPS.invite.x, this.player.body.pos.z - SHOPS.invite.z) < 260) safe('invite', () => this.inviteSpot.update(dt, this.time));
    for (const update of this.world.shine) safe('shine', () => update(this.time));
    safe('crate', () => this.updateCrateAndBoard());

    safe('sky', () => {
      this.sun.position.copy(this.player.body.pos).add(SUN_OFFSET);
      this.sun.target.position.copy(this.player.body.pos);
      this.updateFog(dt);
      this.sky.update(dt, this.camera.position);
      const weather = this.room.state.weather || 'day';
      // the Starting Place's wall lamps come on in snow and rain, and go off on sunny days
      this.lampsLit = (this.lampsLit || 0) + ((weather === 'day' ? 0 : 1) - (this.lampsLit || 0)) * Math.min(1, dt * 0.8);
      this.world.lamps?.(this.time, this.lampsLit);
      this.weather.set(weather);
      this.weather.update(dt, this.camera);
      this.audio.setRain(this.weather.rainK);
      if (weather !== this.weatherNow) {
        const say = { rain: ['A storm is coming! It is raining!', '#9ab8ff'], snow: ['It is snowing!', '#e8fbff'], day: ['The sun is out!', '#ffd84a'] }[weather];
        if (this.weatherNow && say) this.toast(say[0], say[1]);
        this.weatherNow = weather;
      }
      const left = this.room.state.weatherLeft || 0;
      if (weather !== this.store.get().weather?.kind || Math.abs(left - (this.store.get().weather?.left || 0)) >= 1) this.store.set({ weather: { kind: weather, left } });
    });

    safe('interaction', () => {
      this.interaction.update();
      this.highlightNearTree();
      this.interaction.publish();
    });
    safe('arrows', () => this.guideArrows.update(dt, this.player.body.pos, this.interaction.guide));
    safe('network', () => this.sendPosition(dt));
    safe('render', () => {
      if (!this.renderer.shadowMap.autoUpdate && (this.shadowFrame = (this.shadowFrame || 0) + 1) % this.q.shadowEvery === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }
      this.renderer.render(this.scene, this.camera);
    });
  }

  // Runs one part of the frame; an error is logged once per part (not 60 times a second) and the
  // game carries on.
  safe = (name, fn) => {
    try {
      fn();
    } catch (err) {
      this.frameErrors ??= new Set();
      if (!this.frameErrors.has(name)) {
        this.frameErrors.add(name);
        console.error(`[game] ${name} failed (the game keeps running):`, err);
      }
    }
  };

  dispose() {
    this.running = false;
    this.renderer?.setAnimationLoop(null);
    this.unsubscribeSettings?.();
    this.music?.stop();
    this.audio?.dispose();
    this.platformOff?.forEach((off) => off?.());
    clearInterval(this.gemsTimer);
    this.input?.dispose();
    clearTimeout(this.revealTimer);
    clearTimeout(this.bonusTimer);
    clearTimeout(this.toastTimer);
    clearTimeout(this.zoneTimer);
    this.quality?.dispose();
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    this.sharpnessOff?.();
    this.room?.leave();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
