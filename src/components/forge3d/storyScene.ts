// The homepage "story": thousands of glowing motes that reform into a new shape for each
// chapter as you scroll — a crown, a fan of cards, a d20, the forge sigil.
// Shapes are drawn on a small canvas and sampled, so adding a chapter is just a draw function.

import { createStage, glowTexture, THREE } from "./stage";

const N = 5200;
const SPAN = 3.4; // world units across a shape

type Draw = (g: CanvasRenderingContext2D, s: number) => void;

// Draw a shape on a canvas and return N points spread over its painted pixels.
function sample(draw: Draw): Float32Array {
  const S = 220;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  draw(g, S);
  const data = g.getImageData(0, 0, S, S).data;
  const filled: number[] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (data[(y * S + x) * 4 + 3] > 100) filled.push(x, y);
  const out = new Float32Array(N * 3);
  const count = filled.length / 2;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(Math.random() * count) * 2;
    out[i * 3] = ((filled[k] + Math.random()) / S - 0.5) * SPAN;
    out[i * 3 + 1] = -((filled[k + 1] + Math.random()) / S - 0.5) * SPAN;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
  }
  return out;
}

const crown: Draw = (g, S) => {
  const u = S / 100;
  g.lineWidth = 2.6 * u;
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(14 * u, 70 * u);
  g.lineTo(18 * u, 32 * u);
  g.lineTo(34 * u, 50 * u);
  g.lineTo(50 * u, 22 * u);
  g.lineTo(66 * u, 50 * u);
  g.lineTo(82 * u, 32 * u);
  g.lineTo(86 * u, 70 * u);
  g.closePath();
  g.globalAlpha = 0.55;
  g.fill();
  g.globalAlpha = 1;
  g.stroke();
  g.fillRect(14 * u, 74 * u, 72 * u, 7 * u);
  for (const [x, y] of [[18, 30], [50, 19], [82, 30]]) {
    g.beginPath();
    g.arc(x * u, y * u, 4.2 * u, 0, Math.PI * 2);
    g.fill();
  }
  for (const x of [30, 50, 70]) {
    g.beginPath();
    g.arc(x * u, 62 * u, 3 * u, 0, Math.PI * 2);
    g.fill();
  }
};

const cardFan: Draw = (g, S) => {
  const u = S / 100;
  const card = (rot: number, dx: number) => {
    g.save();
    g.translate(50 * u + dx * u, 86 * u);
    g.rotate(rot);
    const w = 30 * u;
    const h = 42 * u;
    g.beginPath();
    g.roundRect(-w / 2, -h - 6 * u, w, h, 3 * u);
    g.lineWidth = 2.2 * u;
    g.stroke();
    g.globalAlpha = 0.18;
    g.fill();
    g.globalAlpha = 1;
    g.lineWidth = 1.2 * u;
    g.strokeRect(-w / 2 + 3 * u, -h - 3 * u, w - 6 * u, h * 0.45);
    g.restore();
  };
  card(-0.5, -14);
  card(-0.18, -5);
  card(0.18, 5);
  card(0.5, 14);
};

const d20: Draw = (g, S) => {
  const u = S / 100;
  const cx = 50 * u;
  const cy = 52 * u;
  const R = 38 * u;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] as const;
  });
  const inner = [0, 2, 4].map((i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52 + 4 * u] as const;
  });
  g.lineWidth = 2.4 * u;
  g.lineJoin = "round";
  const line = (a: readonly [number, number], b: readonly [number, number]) => {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  };
  for (let i = 0; i < 6; i++) line(hex[i], hex[(i + 1) % 6]);
  line(inner[0], inner[1]);
  line(inner[1], inner[2]);
  line(inner[2], inner[0]);
  line(hex[0], inner[0]);
  line(hex[1], inner[0]);
  line(hex[1], inner[1]);
  line(hex[2], inner[1]);
  line(hex[3], inner[1]);
  line(hex[3], inner[2]);
  line(hex[4], inner[2]);
  line(hex[5], inner[2]);
  line(hex[5], inner[0]);
  g.font = `700 ${16 * u}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("20", cx, cy + 6 * u);
};

const sigil: Draw = (g, S) => {
  const u = S / 260;
  g.save();
  g.translate(S / 2, S / 2 + 30 * u);
  g.scale(u * 1.05, u * 1.05);
  g.beginPath();
  g.moveTo(-60, 0);
  g.lineTo(60, 0);
  g.quadraticCurveTo(52, 16, 30, 18);
  g.lineTo(18, 18);
  g.lineTo(26, 44);
  g.lineTo(-26, 44);
  g.lineTo(-18, 18);
  g.lineTo(-44, 18);
  g.quadraticCurveTo(-78, 14, -92, -2);
  g.quadraticCurveTo(-70, 0, -60, 0);
  g.fill();
  g.fillRect(-40, 44, 80, 10);
  g.beginPath();
  g.moveTo(0, -8);
  g.bezierCurveTo(-34, -22, -22, -58, -6, -76);
  g.bezierCurveTo(-8, -58, 6, -52, 4, -38);
  g.bezierCurveTo(14, -48, 18, -64, 12, -92);
  g.bezierCurveTo(40, -62, 38, -24, 0, -8);
  g.fill();
  g.lineWidth = 4;
  g.beginPath();
  g.arc(0, -20, 108, 0, Math.PI * 2);
  g.stroke();
  g.restore();
};

// Colour palettes per chapter (picked per particle).
const PALETTES = [
  ["#ffe2a8", "#e0b252", "#fff6dc"], // crown: gold
  ["#f7efc4", "#3d8fe0", "#9a6ad8", "#ff5130", "#2fd27a"], // cards: the five colours
  ["#8fb8ff", "#b48cff", "#e6ecff"], // d20: arcane blue
  ["#ffb347", "#ff6a2e", "#fff1c4"], // forge: fire
];

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function mountStory(host: HTMLElement, progress: () => number, opts: { still: boolean }) {
  const stage = createStage(host, { fov: 34, bloom: { strength: 0.95, radius: 0.55, threshold: 0.05 }, exposure: 1 });
  const { scene, camera } = stage;
  camera.position.set(0, 0, 7.2);

  const shapes = [sample(crown), sample(cardFan), sample(d20), sample(sigil)];
  const colors = PALETTES.map((pal) => {
    const out = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const c = new THREE.Color(pal[i % pal.length]);
      out.set([c.r, c.g, c.b], i * 3);
    }
    return out;
  });
  // Each mote leaves at a slightly different moment and swirls on the way.
  const lag = new Float32Array(N).map(() => Math.random() * 0.35);
  const swirl = new Float32Array(N).map(() => 0.6 + Math.random() * 1.6);

  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const glow = glowTexture();
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: 0.055, map: glow, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  const rig = new THREE.Group();
  rig.add(points);
  scene.add(rig);

  // Faint dust in the background.
  const D = 400;
  const dPos = new Float32Array(D * 3).map((_, i) => (i % 3 === 2 ? -3 - Math.random() * 4 : (Math.random() - 0.5) * 12));
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.03, map: glow, color: 0x9a8ac8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));

  let smooth = progress();
  const pointer = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const step = (t: number, dt: number) => {
    smooth += (progress() - smooth) * Math.min(1, dt * 5 || 1);
    // Scroll 0..1 across 4 chapters: hold each shape, morph in the gaps between.
    const f = smooth * (shapes.length - 1);
    const a = Math.min(shapes.length - 2, Math.floor(f));
    const local = f - a;
    const A = shapes[a];
    const B = shapes[a + 1];
    const CA = colors[a];
    const CB = colors[a + 1];
    for (let i = 0; i < N; i++) {
      // morph window: 0.25..0.75 of each gap, offset per mote
      const m = ease((local - 0.22 - lag[i] * 0.5) / 0.4);
      const k = i * 3;
      const burst = Math.sin(m * Math.PI) * swirl[i];
      const ang = t * 0.6 + i;
      pos[k] = A[k] + (B[k] - A[k]) * m + Math.cos(ang) * burst * 0.5;
      pos[k + 1] = A[k + 1] + (B[k + 1] - A[k + 1]) * m + Math.sin(ang * 1.3) * burst * 0.35;
      pos[k + 2] = A[k + 2] + (B[k + 2] - A[k + 2]) * m + Math.sin(ang) * burst * 0.8;
      // gentle shimmer while holding a shape
      pos[k] += Math.sin(t * 1.7 + i * 0.37) * 0.006;
      pos[k + 1] += Math.cos(t * 1.3 + i * 0.29) * 0.006;
      col[k] = CA[k] + (CB[k] - CA[k]) * m;
      col[k + 1] = CA[k + 1] + (CB[k + 1] - CA[k + 1]) * m;
      col[k + 2] = CA[k + 2] + (CB[k + 2] - CA[k + 2]) * m;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    const wide = camera.aspect > 1.1;
    rig.position.set(wide ? 1.55 : 0, wide ? 0 : 1.35, 0);
    rig.scale.setScalar(wide ? 1 : Math.min(0.62, camera.aspect * 1.2));
    rig.rotation.y = Math.sin(t * 0.25) * 0.18 + pointer.x * 0.25;
    rig.rotation.x = -pointer.y * 0.12;
  };

  if (opts.still) {
    const render = () => {
      step(0, 1);
      stage.renderOnce();
    };
    render();
    window.addEventListener("scroll", render, { passive: true });
    return () => {
      window.removeEventListener("scroll", render);
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
