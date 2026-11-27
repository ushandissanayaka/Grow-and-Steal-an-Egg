// A clear blue sky all round, with soft white clouds drifting across it. In a storm (uStorm) thick
// dark clouds roll in and cover it, and lightning (uFlash) lights them up.

import * as THREE from 'three';

const fragment = /* glsl */ `
  varying vec3 vDir;
  uniform float uTime;
  uniform float uFog;      // 0 = clear, 1 = thick mist
  uniform vec3 uFogColor;
  uniform float uStorm;    // 0 = clear, 1 = dark storm clouds everywhere
  uniform float uFlash;    // lightning, 0..1

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float up = clamp(dir.y, 0.0, 1.0);
    vec3 horizon = vec3(0.72, 0.87, 1.0);
    vec3 zenith = vec3(0.20, 0.50, 0.92);
    vec3 color = mix(horizon, zenith, pow(up, 0.55));
    color = mix(color, mix(vec3(0.34, 0.36, 0.42), vec3(0.16, 0.17, 0.21), pow(up, 0.6)), uStorm);

    if (dir.y > 0.01) {
      vec2 uv = dir.xz / (dir.y + 0.18) * 1.5 + vec2(uTime * (0.008 + 0.03 * uStorm), 0.0);
      float n = fbm(uv);
      float cloud = smoothstep(0.52 - 0.4 * uStorm, 0.78 - 0.3 * uStorm, n);
      // storm clouds: dark grey, with darker billows where they are thickest
      vec3 cloudColor = mix(vec3(1.0), mix(vec3(0.30, 0.31, 0.36), vec3(0.14, 0.14, 0.18), smoothstep(0.4, 0.8, n)), uStorm);
      color = mix(color, cloudColor, cloud * smoothstep(0.01, 0.14, dir.y));
    }
    color += uFlash * vec3(0.55, 0.6, 0.75) * (0.4 + 0.6 * up);
    // the mist: a band of fog colour along the horizon, thicker when the fog is thicker,
    // so the fogged-out world melts into the sky instead of ending in a hard line
    float band = 1.0 - smoothstep(-0.02, 0.06 + 0.3 * uFog, dir.y);
    color = mix(color, uFogColor, band * uFog);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export class Sky {
  constructor() {
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: { uTime: { value: 0 }, uFog: { value: 0 }, uFogColor: { value: new THREE.Color() }, uStorm: { value: 0 }, uFlash: { value: 0 } },
      // z = w pins the dome to the far plane, so it never gets clipped when the
      // quality tier shortens camera.far below the sphere radius (that showed as black sky).
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.99999; }',
      fragmentShader: fragment,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 20), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  setFog(color, amount) {
    this.material.uniforms.uFogColor.value.copy(color);
    this.material.uniforms.uFog.value = amount;
  }

  setStorm(storm, flash) {
    this.material.uniforms.uStorm.value = storm;
    this.material.uniforms.uFlash.value = flash;
  }

  update(dt, cameraPosition) {
    this.material.uniforms.uTime.value += dt;
    this.mesh.position.copy(cameraPosition);
  }
}
