// Sweets floating in the sky (lollipops, donuts, candy canes, wrapped candies) and two big
// rainbows. Like the sky dome they move with the camera, so they always look far away and high up;
// anything in the world nearer than them draws in front. The mist does not touch them, so they stay bright.

import * as THREE from 'three';

const DIST = 900;          // how far away they float (under the lowest camera.far)
const CANDY_COUNT = 18;
const RAINBOW = ['#ff3b3b', '#ff8a1a', '#ffe14a', '#5ff04a', '#35a8ff', '#4a5aff', '#a86aff'];

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, fog: false, ...extra });

function lollipop(rnd) {
  const g = new THREE.Group();
  const colors = [['#ff5fa8', '#ffffff'], ['#5fd0ff', '#ffffff'], ['#ffe14a', '#ff5fa8'], ['#7dff3f', '#ffffff']][Math.floor(rnd() * 4)];
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4 + i * 3.2, 1.7, 8, 32), mat(colors[i % 2]));
    ring.position.z = 0.2 * i;
    g.add(ring);
  }
  const center = new THREE.Mesh(new THREE.CircleGeometry(4, 24), mat(colors[1]));
  g.add(center);
  const stick = new THREE.Mesh(new THREE.BoxGeometry(2.2, 34, 2.2), mat('#ffffff'));
  stick.position.y = -32;
  g.add(stick);
  return g;
}

function donut(rnd) {
  const g = new THREE.Group();
  const icing = ['#ff7ab8', '#8a4a2a', '#ffe14a', '#a86aff'][Math.floor(rnd() * 4)];
  g.add(new THREE.Mesh(new THREE.TorusGeometry(12, 6.5, 12, 32), mat('#e8a85a')));
  const top = new THREE.Mesh(new THREE.TorusGeometry(12, 5.2, 12, 32), mat(icing));
  top.position.z = 2.2;
  g.add(top);
  const colors = ['#ffffff', '#5fd0ff', '#ffe14a', '#7dff3f', '#ff3b3b'];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 8 + rnd() * 8;
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.8), mat(colors[i % colors.length]));
    s.position.set(Math.cos(a) * r, Math.sin(a) * r, 7.6);
    s.rotation.z = rnd() * 3;
    g.add(s);
  }
  return g;
}

function candyCane() {
  const g = new THREE.Group();
  const seg = (x, y, rz, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5, 4.4), mat(i % 2 ? '#ffffff' : '#ff2a3c'));
    m.position.set(x, y, 0);
    m.rotation.z = rz;
    g.add(m);
  };
  for (let i = 0; i < 9; i++) seg(0, -i * 4.8, 0.25, i);                       // the straight part
  for (let i = 0; i < 7; i++) {                                                 // the hook
    const a = (i / 6) * Math.PI;
    seg(-7 + Math.cos(a) * 7, Math.sin(a) * 7 + 3, a - Math.PI / 2, i + 1);
  }
  return g;
}

function wrappedCandy(rnd) {
  const g = new THREE.Group();
  const color = ['#ff5fa8', '#ffcf33', '#5fd0ff', '#a86aff', '#5ff04a'][Math.floor(rnd() * 5)];
  const body = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), mat(color));
  body.scale.set(1.4, 1, 1);
  g.add(body);
  for (const side of [-1, 1]) {
    const twist = new THREE.Mesh(new THREE.ConeGeometry(7, 11, 6), mat(color));
    twist.rotation.z = side * Math.PI / 2;
    twist.position.x = side * 17;
    g.add(twist);
  }
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(8.6, 1.2, 8, 24), mat('#ffffff'));
  stripe.rotation.y = Math.PI / 2;
  g.add(stripe);
  return g;
}

// A rainbow arc of seven bands, its foot below the horizon so it rises out of the ground.
function rainbow(radius, opacity) {
  const g = new THREE.Group();
  RAINBOW.forEach((color, i) => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(radius - i * 13, 7, 6, 80, Math.PI),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, fog: false, depthWrite: false }),
    );
    g.add(band);
  });
  return g;
}

export class SkyCandy {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.renderOrder = -9;
    scene.add(this.group);
    let seed = 4242;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    // rainbows: a big one over the forests (north) and a smaller one over the candy islands (south)
    const north = rainbow(560, 0.55);
    north.position.set(-120, -170, -DIST);
    const south = rainbow(380, 0.45);
    south.position.set(260, -120, DIST * 0.95);
    south.rotation.y = Math.PI;
    this.group.add(north, south);

    // sweets all around the sky, at different heights, slowly turning and bobbing
    const makers = [lollipop, donut, candyCane, wrappedCandy];
    this.candies = Array.from({ length: CANDY_COUNT }, (_, i) => {
      const mesh = makers[i % makers.length](rnd);
      const a = (i / CANDY_COUNT) * Math.PI * 2 + rnd() * 0.3;
      const up = 0.18 + rnd() * 0.42;                       // elevation, radians above the horizon
      const d = DIST * (0.8 + rnd() * 0.2);
      mesh.position.set(Math.cos(a) * Math.cos(up) * d, Math.sin(up) * d, Math.sin(a) * Math.cos(up) * d);
      mesh.lookAt(0, mesh.position.y * 0.6, 0);
      mesh.scale.setScalar(1.6 + rnd() * 1.6);
      mesh.userData = { base: mesh.position.y, spin: (rnd() - 0.5) * 0.4, phase: rnd() * 6 };
      this.group.add(mesh);
      return mesh;
    });
    this.group.traverse((o) => { if (o.isMesh) o.renderOrder = -9; });
  }

  update(time, cameraPosition) {
    this.group.position.copy(cameraPosition);
    for (const c of this.candies) {
      const u = c.userData;
      c.position.y = u.base + Math.sin(time * 0.4 + u.phase) * 14;
      c.rotateZ(u.spin * 0.016);
    }
  }
}
