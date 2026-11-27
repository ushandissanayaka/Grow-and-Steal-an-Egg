// Pictures of the pets for the popups: each pet's own voxel model rendered once into a small image
// (data URL) and cached. Drawing a picture takes a few milliseconds, so they are NEVER drawn all at
// once (that froze the game for a second when the Index opened): they are queued and drawn one at a
// time when the browser is idle. Until a picture is ready, petThumb() returns '' and the popup shows
// a placeholder; onThumbReady() tells it when to redraw.

import * as THREE from 'three';
import { createPetMesh, disposeObject } from '../entities/PetDisplay.js';

const SIZE = 128;
const cache = new Map();      // id -> data URL ('' if it could not be drawn)
const queue = [];
const queued = new Set();
const listeners = new Set();
let renderer = null;
let scene = null;
let camera = null;
let working = false;

function setup() {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#9a9a9a', 2.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(4, 8, 6);
  scene.add(sun);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
}

// The pet seen from the front, a little from the side and above.
function draw(id) {
  try {
    if (!renderer) setup();
    const mesh = createPetMesh(id);
    mesh.rotation.y = 0.55;
    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    camera.position.set(center.x + size * 0.35, center.y + size * 0.45, center.z + size * 1.75);
    camera.lookAt(center);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(mesh);
    disposeObject(mesh);
    return url;
  } catch (err) {
    console.warn('[petArt] could not draw', id, err);
    return '';
  }
}

const GAP_MS = 150; // at least this long between two pictures
// a moment when the browser has nothing else to do (or, at worst, after a couple of seconds)
const idle = (fn) => setTimeout(() => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 2000 }) : fn()), GAP_MS);

function work() {
  if (working || !queue.length) return;
  working = true;
  idle(() => {
    const id = queue.shift();
    queued.delete(id);
    cache.set(id, draw(id));          // one picture per idle moment
    listeners.forEach((fn) => fn(id));
    working = false;
    work();
  });
}

function request(id) {
  if (cache.has(id) || queued.has(id)) return;
  queued.add(id);
  queue.push(id);
  work();
}

// The picture if it is ready, '' otherwise (it is then queued; onThumbReady fires when it is).
export function petThumb(id) {
  if (cache.has(id)) return cache.get(id);
  request(id);
  return '';
}

export function onThumbReady(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Queue pictures ahead of time, a few seconds after loading (not while the world is still settling),
// so popups usually find them ready.
export function prewarmPetThumbs(ids, delayMs = 6000) {
  setTimeout(() => { for (const id of ids) request(id); }, delayMs);
}
