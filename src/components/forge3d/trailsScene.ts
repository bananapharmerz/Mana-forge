// Light trails: ribbons of mana-coloured light sweeping across the screen like a long-exposure
// photo. Each trail is a strip whose head runs along its own gentle 3D curve; the strip fades
// from a white-hot head to nothing at the tail. Scrolling through the section speeds them up,
// and they lean toward the cursor.

import { createStage, glowTexture, THREE } from "./stage";

const TRAILS = 44;
const SEG = 56; // points along each ribbon
const COLORS = ["#ffd27a", "#f7efc4", "#3d8fe0", "#9a6ad8", "#ff5130", "#2fd27a", "#ffb347"];

interface Trail {
  phase: number;
  amp: number;
  freq: number;
  depth: number;
  y0: number;
  speed: number;
  len: number; // tail length, in path units
  width: number;
  head: number; // progress along the path; wraps
  dir: 1 | -1;
}

const vert = /* glsl */ `
  attribute float along;
  attribute float side;
  attribute vec3 tint;
  varying float vAlong;
  varying float vSide;
  varying vec3 vTint;
  void main() {
    vAlong = along;
    vSide = side;
    vTint = tint;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  uniform float uIntensity;
  varying float vAlong;
  varying float vSide;
  varying vec3 vTint;
  void main() {
    float tail = pow(1.0 - vAlong, 1.7);
    float edge = 1.0 - smoothstep(0.15, 1.0, abs(vSide));
    float core = smoothstep(0.75, 1.0, 1.0 - vAlong) * (1.0 - smoothstep(0.0, 0.5, abs(vSide)));
    vec3 col = mix(vTint, vec3(1.0, 0.97, 0.9), core * 0.85);
    float a = tail * edge * uIntensity;
    gl_FragColor = vec4(col * a, a);
  }
`;

export function mountTrails(host: HTMLElement, progress: () => number, opts: { still: boolean }) {
  const stage = createStage(host, { fov: 40, bloom: { strength: 1.1, radius: 0.7, threshold: 0.0 }, exposure: 1 });
  const { scene, camera } = stage;
  camera.position.set(0, 0, 14);

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const trails: Trail[] = Array.from({ length: TRAILS }, () => ({
    phase: rand(0, Math.PI * 2),
    amp: rand(0.6, 2.6),
    freq: rand(0.8, 2.2),
    depth: rand(-9, 3),
    y0: rand(-4.2, 4.2),
    speed: rand(0.07, 0.16),
    len: rand(0.18, 0.42),
    width: rand(0.035, 0.11),
    head: rand(0, 1.6),
    dir: Math.random() < 0.82 ? 1 : -1,
  }));

  const verts = TRAILS * SEG * 2;
  const pos = new Float32Array(verts * 3);
  const along = new Float32Array(verts);
  const side = new Float32Array(verts);
  const tint = new Float32Array(verts * 3);
  const index: number[] = [];
  trails.forEach((_, ti) => {
    const c = new THREE.Color(COLORS[ti % COLORS.length]);
    for (let s = 0; s < SEG; s++) {
      const v = (ti * SEG + s) * 2;
      along[v] = along[v + 1] = s / (SEG - 1);
      side[v] = -1;
      side[v + 1] = 1;
      tint.set([c.r, c.g, c.b], v * 3);
      tint.set([c.r, c.g, c.b], (v + 1) * 3);
      if (s < SEG - 1) index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("along", new THREE.BufferAttribute(along, 1));
  geo.setAttribute("side", new THREE.BufferAttribute(side, 1));
  geo.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
  geo.setIndex(index);
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: { uIntensity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const ribbons = new THREE.Mesh(geo, mat);
  ribbons.frustumCulled = false;
  scene.add(ribbons);

  // A spark at every head.
  const glow = glowTexture();
  const headPos = new Float32Array(TRAILS * 3);
  const headCol = new Float32Array(TRAILS * 3);
  trails.forEach((_, ti) => {
    const c = new THREE.Color(COLORS[ti % COLORS.length]).lerp(new THREE.Color("#ffffff"), 0.55);
    headCol.set([c.r, c.g, c.b], ti * 3);
  });
  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute("position", new THREE.BufferAttribute(headPos, 3));
  headGeo.setAttribute("color", new THREE.BufferAttribute(headCol, 3));
  const heads = new THREE.Points(
    headGeo,
    new THREE.PointsMaterial({ size: 0.42, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  heads.frustumCulled = false;
  scene.add(heads);

  // Faint embers drifting in the dark.
  const E = 260;
  const ePos = new Float32Array(E * 3).map((_, i) => (i % 3 === 0 ? rand(-16, 16) : i % 3 === 1 ? rand(-8, 8) : rand(-12, 2)));
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
  const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({ size: 0.05, map: glow, color: 0xffc27a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(embers);

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const halfWidth = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect + 4;
  const point = (tr: Trail, u: number, out: THREE.Vector3, hw: number) => {
    // u in 0..1 runs edge to edge (beyond the screen on both sides)
    const x = (u * 2 - 1) * hw * tr.dir;
    const w = u * Math.PI * 2 * tr.freq + tr.phase;
    const pull = Math.exp(-((x / hw - pointer.sx) ** 2) * 6);
    out.set(x, tr.y0 + Math.sin(w) * tr.amp * 0.6 - pointer.sy * 1.6 * pull, tr.depth + Math.cos(w * 0.7) * tr.amp);
    return out;
  };

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const dirV = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  let smooth = progress();

  const step = (t: number, dt: number) => {
    smooth += (progress() - smooth) * Math.min(1, dt * 4 || 1);
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3 || 1);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3 || 1);
    // Fastest while the section is centred on screen.
    const boost = 1 + 2.2 * Math.sin(Math.min(1, Math.max(0, smooth)) * Math.PI);
    const hw = halfWidth();
    trails.forEach((tr, ti) => {
      tr.head += tr.speed * dt * boost;
      if (tr.head > 1 + tr.len) {
        tr.head = -rand(0, 0.5);
        tr.y0 = rand(-4.2, 4.2);
        tr.phase = rand(0, Math.PI * 2);
      }
      for (let s = 0; s < SEG; s++) {
        const u = tr.head - (s / (SEG - 1)) * tr.len;
        point(tr, u, a, hw);
        point(tr, u - 0.004, b, hw);
        dirV.subVectors(a, b).normalize();
        toCam.subVectors(camera.position, a).normalize();
        nrm.crossVectors(dirV, toCam).normalize().multiplyScalar(tr.width * (1 - (s / SEG) * 0.6));
        const v = (ti * SEG + s) * 2;
        pos[v * 3] = a.x - nrm.x;
        pos[v * 3 + 1] = a.y - nrm.y;
        pos[v * 3 + 2] = a.z - nrm.z;
        pos[(v + 1) * 3] = a.x + nrm.x;
        pos[(v + 1) * 3 + 1] = a.y + nrm.y;
        pos[(v + 1) * 3 + 2] = a.z + nrm.z;
        if (s === 0) headPos.set([a.x, a.y, a.z], ti * 3);
      }
    });
    geo.attributes.position.needsUpdate = true;
    headGeo.attributes.position.needsUpdate = true;
    embers.rotation.y = Math.sin(t * 0.05) * 0.1;
    camera.position.x = pointer.sx * 0.6;
    camera.position.y = -pointer.sy * 0.35;
    camera.lookAt(0, 0, -2);
  };

  if (opts.still) {
    // Reduced motion: lay the trails out mid-flight once.
    trails.forEach((tr) => (tr.head = rand(0.4, 1.1)));
    step(0, 0);
    stage.renderOnce();
    return () => {
      window.removeEventListener("pointermove", onMove);
      glow.dispose();
      stage.dispose();
    };
  }
  stage.start(step);
  return () => {
    window.removeEventListener("pointermove", onMove);
    glow.dispose();
    stage.dispose();
  };
}
