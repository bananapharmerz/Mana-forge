// The homepage hero: an original Mana Forge card floating in a five-colour mana vortex.
// Everything is drawn in code (no Wizards of the Coast art or card backs).

import { createStage, glowTexture, THREE } from "./stage";
import { SITE } from "@/lib/site";

// Shrinks the font until the text fits, so a longer site name still sits inside the card art.
function fitFont(g: CanvasRenderingContext2D, text: string, weight: string, size: number, family: string, maxWidth: number) {
  let s = size;
  g.font = `${weight} ${s}px ${family}`;
  while (s > 12 && g.measureText(text).width > maxWidth) {
    s -= 2;
    g.font = `${weight} ${s}px ${family}`;
  }
}

const MANA = [
  { key: "W", hex: "#f7efc4", core: "#fff8dc" },
  { key: "U", hex: "#3d8fe0", core: "#a8d4ff" },
  { key: "B", hex: "#9a6ad8", core: "#d9c2ff" },
  { key: "R", hex: "#ff5130", core: "#ffc2a8" },
  { key: "G", hex: "#2fd27a", core: "#b6ffd4" },
];

const CARD_W = 2.5;
const CARD_H = 3.49;
const TEX_W = 768;
const TEX_H = Math.round((TEX_W * CARD_H) / CARD_W);

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  return [c, c.getContext("2d")!];
}

// The forge sigil: an anvil with a flame rising out of it.
function sigil(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string | CanvasGradient, flame: string | CanvasGradient) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.fillStyle = fill;
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
  g.closePath();
  g.fill();
  g.fillRect(-40, 44, 80, 10);
  g.fillStyle = flame;
  g.beginPath();
  g.moveTo(0, -8);
  g.bezierCurveTo(-34, -22, -22, -58, -6, -76);
  g.bezierCurveTo(-8, -58, 6, -52, 4, -38);
  g.bezierCurveTo(14, -48, 18, -64, 12, -92);
  g.bezierCurveTo(40, -62, 38, -24, 0, -8);
  g.closePath();
  g.fill();
  g.restore();
}

function pip(g: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string) {
  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, hex);
  grad.addColorStop(1, "#111");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.6)";
  g.lineWidth = 2;
  g.stroke();
}

function cardFront(): { map: THREE.Texture; emissive: THREE.Texture } {
  const [c, g] = canvas();
  const [ec, eg] = canvas();
  eg.fillStyle = "#000";
  eg.fillRect(0, 0, TEX_W, TEX_H);
  const W = TEX_W;
  const H = TEX_H;
  const pad = 26;

  // Black border, rounded corners (transparent outside).
  g.clearRect(0, 0, W, H);
  roundRect(g, 0, 0, W, H, 36);
  g.fillStyle = "#0b0a0c";
  g.fill();
  g.save();
  roundRect(g, 0, 0, W, H, 36);
  g.clip();

  // Bronze frame.
  const frame = g.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, "#4a3418");
  frame.addColorStop(0.5, "#8a6427");
  frame.addColorStop(1, "#3a2810");
  roundRect(g, pad, pad, W - pad * 2, H - pad * 2, 22);
  g.fillStyle = frame;
  g.fill();

  // Title bar.
  const tb = { x: pad + 22, y: pad + 22, w: W - pad * 2 - 44, h: 70 };
  const tbg = g.createLinearGradient(0, tb.y, 0, tb.y + tb.h);
  tbg.addColorStop(0, "#f3e6c2");
  tbg.addColorStop(1, "#cdb27a");
  roundRect(g, tb.x, tb.y, tb.w, tb.h, 14);
  g.fillStyle = tbg;
  g.fill();
  g.fillStyle = "#1d150a";
  fitFont(g, SITE.name, "700", 40, "Georgia, 'Times New Roman', serif", tb.w - 240);
  g.textBaseline = "middle";
  g.fillText(SITE.name, tb.x + 22, tb.y + tb.h / 2 + 2);
  MANA.forEach((m, i) => pip(g, tb.x + tb.w - 30 - (4 - i) * 38, tb.y + tb.h / 2, 15, m.hex));
  MANA.forEach((m, i) => {
    eg.fillStyle = m.hex;
    eg.globalAlpha = 0.5;
    eg.beginPath();
    eg.arc(tb.x + tb.w - 30 - (4 - i) * 38, tb.y + tb.h / 2, 10, 0, Math.PI * 2);
    eg.fill();
    eg.globalAlpha = 1;
  });

  // Art window: the forge.
  const art = { x: pad + 30, y: tb.y + tb.h + 16, w: W - pad * 2 - 60, h: Math.round(H * 0.44) };
  const sky = g.createRadialGradient(art.x + art.w / 2, art.y + art.h * 0.62, 10, art.x + art.w / 2, art.y + art.h * 0.6, art.w * 0.8);
  sky.addColorStop(0, "#ffb347");
  sky.addColorStop(0.18, "#c2410c");
  sky.addColorStop(0.45, "#3b0f4a");
  sky.addColorStop(1, "#07040d");
  g.fillStyle = sky;
  g.fillRect(art.x, art.y, art.w, art.h);
  // Swirling mana ribbons.
  MANA.forEach((m, i) => {
    g.strokeStyle = m.hex;
    g.globalAlpha = 0.55;
    g.lineWidth = 5;
    g.beginPath();
    const a0 = (i / 5) * Math.PI * 2;
    for (let k = 0; k <= 60; k++) {
      const a = a0 + k * 0.09;
      const r = 40 + k * 3.4;
      const x = art.x + art.w / 2 + Math.cos(a) * r;
      const y = art.y + art.h * 0.6 + Math.sin(a) * r * 0.45;
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  });
  const flame = g.createLinearGradient(0, art.y + art.h * 0.2, 0, art.y + art.h * 0.7);
  flame.addColorStop(0, "#fff7d1");
  flame.addColorStop(0.5, "#ffb020");
  flame.addColorStop(1, "#ff4d1a");
  sigil(g, art.x + art.w / 2, art.y + art.h * 0.68, 1.9, "#120b07", flame);
  // Sparks.
  for (let i = 0; i < 90; i++) {
    const x = art.x + art.w / 2 + (Math.random() - 0.5) * art.w * 0.9;
    const y = art.y + art.h * (0.1 + Math.random() * 0.6);
    g.fillStyle = `rgba(255,${180 + Math.random() * 70},${80 + Math.random() * 80},${0.4 + Math.random() * 0.6})`;
    g.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  g.strokeStyle = "#1d150a";
  g.lineWidth = 6;
  g.strokeRect(art.x, art.y, art.w, art.h);
  // Glow layer for the art (bloom picks it up).
  const eglow = eg.createRadialGradient(art.x + art.w / 2, art.y + art.h * 0.55, 5, art.x + art.w / 2, art.y + art.h * 0.55, art.w * 0.42);
  eglow.addColorStop(0, "#ffcf73");
  eglow.addColorStop(0.4, "#a1360f");
  eglow.addColorStop(1, "#000");
  eg.fillStyle = eglow;
  eg.fillRect(art.x, art.y, art.w, art.h);
  sigil(eg, art.x + art.w / 2, art.y + art.h * 0.68, 1.9, "#000", "#ffd27a");

  // Type line.
  const tl = { x: tb.x, y: art.y + art.h + 16, w: tb.w, h: 58 };
  roundRect(g, tl.x, tl.y, tl.w, tl.h, 12);
  g.fillStyle = tbg;
  g.fill();
  g.fillStyle = "#1d150a";
  g.font = "600 30px Georgia, 'Times New Roman', serif";
  g.fillText("Legendary Artifact — Forge", tl.x + 22, tl.y + tl.h / 2 + 2);
  sigil(g, tl.x + tl.w - 40, tl.y + tl.h / 2 + 4, 0.22, "#6b4a17", "#b5872a");

  // Text box.
  const tx = { x: art.x, y: tl.y + tl.h + 14, w: art.w, h: H - (tl.y + tl.h + 14) - pad - 64 };
  g.fillStyle = "#efe4c6";
  g.fillRect(tx.x, tx.y, tx.w, tx.h);
  g.fillStyle = "#1d150a";
  g.font = "26px Georgia, 'Times New Roman', serif";
  g.textBaseline = "top";
  const rules = ["{T}: Add one mana of any color.", "Whenever you build a deck, it", "begins here."];
  rules.forEach((l, i) => g.fillText(l, tx.x + 22, tx.y + 22 + i * 34));
  g.font = "italic 24px Georgia, 'Times New Roman', serif";
  g.fillStyle = "#4a3c22";
  ["“Every legend was hammered out", "of a single spark.”"].forEach((l, i) => g.fillText(l, tx.x + 22, tx.y + 150 + i * 31));

  // Footer.
  g.fillStyle = "#e9dcbb";
  g.font = "600 18px ui-monospace, monospace";
  g.textBaseline = "middle";
  g.fillText(`${SITE.initials} · 001 · ${SITE.upper.replace(/\s+/g, "")}`.slice(0, 34), tx.x, H - pad - 30);
  g.restore();

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const emissive = new THREE.CanvasTexture(ec);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function cardBack(): THREE.Texture {
  const [c, g] = canvas();
  const W = TEX_W;
  const H = TEX_H;
  roundRect(g, 0, 0, W, H, 36);
  g.fillStyle = "#0b0a0c";
  g.fill();
  g.save();
  roundRect(g, 18, 18, W - 36, H - 36, 26);
  g.clip();
  const bg = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, H * 0.7);
  bg.addColorStop(0, "#5b2a86");
  bg.addColorStop(0.45, "#25103d");
  bg.addColorStop(1, "#08040f");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(224,178,82,0.55)";
  for (let i = 0; i < 9; i++) {
    g.lineWidth = i % 3 === 0 ? 3 : 1;
    g.beginPath();
    g.ellipse(W / 2, H / 2, 70 + i * 30, 90 + i * 40, 0, 0, Math.PI * 2);
    g.stroke();
  }
  MANA.forEach((m, i) => {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    pip(g, W / 2 + Math.cos(a) * 230, H / 2 + Math.sin(a) * 300, 30, m.hex);
  });
  const fl = g.createLinearGradient(0, H / 2 - 120, 0, H / 2 + 60);
  fl.addColorStop(0, "#fff3c4");
  fl.addColorStop(1, "#e0b252");
  sigil(g, W / 2, H / 2 + 40, 1.5, "#e0b252", fl);
  g.fillStyle = "#e0b252";
  g.textAlign = "center";
  fitFont(g, SITE.upper, "700", 46, "Georgia, 'Times New Roman', serif", W - 120);
  g.fillText(SITE.upper, W / 2, H - 110);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

export function mountHero(host: HTMLElement, opts: { still: boolean }) {
  const stage = createStage(host, { fov: 32, bloom: { strength: 0.7, radius: 0.5, threshold: 0.62 } });
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.22;
  camera.position.set(0, 0, 11);

  scene.add(new THREE.AmbientLight(0x6a5a9a, 0.35));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.1);
  key.position.set(3, 4, 6);
  scene.add(key);
  const rimL = new THREE.PointLight(0x8f5cff, 30, 20);
  rimL.position.set(-4, 1, -2);
  scene.add(rimL);
  const rimR = new THREE.PointLight(0xff7a2e, 30, 20);
  rimR.position.set(4, -1, -1.5);
  scene.add(rimR);

  // The card: front, back and a thin gilded edge.
  const rig = new THREE.Group();
  scene.add(rig);
  const card = new THREE.Group();
  rig.add(card);
  const front = cardFront();
  const faceGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const frontMat = new THREE.MeshPhysicalMaterial({
    map: front.map,
    emissiveMap: front.emissive,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.9,
    transparent: true,
    alphaTest: 0.5,
    roughness: 0.55,
    metalness: 0.08,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
    iridescence: 0.35,
    iridescenceIOR: 1.6,
  });
  const f = new THREE.Mesh(faceGeo, frontMat);
  f.position.z = 0.012;
  card.add(f);
  const backMat = new THREE.MeshPhysicalMaterial({ map: cardBack(), transparent: true, alphaTest: 0.5, roughness: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const bk = new THREE.Mesh(faceGeo, backMat);
  bk.rotation.y = Math.PI;
  bk.position.z = -0.012;
  card.add(bk);
  const edge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(CARD_W - 0.01, CARD_H - 0.01, 0.115), { depth: 0.022, bevelEnabled: false, curveSegments: 10 }),
    new THREE.MeshStandardMaterial({ color: 0x1a1308, metalness: 0.9, roughness: 0.35 })
  );
  edge.position.z = -0.011;
  card.add(edge);

  // Five mana orbs orbiting the card.
  const glow = glowTexture();
  const orbs = MANA.map((m, i) => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 16),
      new THREE.MeshStandardMaterial({ color: m.core, emissive: new THREE.Color(m.hex), emissiveIntensity: 1.8, roughness: 0.3 })
    );
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: m.hex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
    halo.scale.setScalar(0.75);
    g.add(core, halo);
    rig.add(g);
    return { g, phase: (i / 5) * Math.PI * 2 };
  });

  // The vortex: mana motes spiralling up around the card, plus rising forge embers.
  const N = 900;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => {
    const m = i % 7 < 5 ? MANA[i % 7] : null;
    const c = new THREE.Color(m ? m.hex : i % 2 ? "#ffcf6e" : "#ff8a3d");
    col.set([c.r, c.g, c.b], i * 3);
    return { r: 1.45 + Math.random() ** 1.6 * 2.2, a: Math.random() * Math.PI * 2, y: (Math.random() - 0.5) * 6, v: 0.12 + Math.random() * 0.35, up: 0.15 + Math.random() * 0.5, ember: !m };
  });
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const motes = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 0.11, map: glow, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
  );
  rig.add(motes);

  // A few big, soft out-of-focus lights for depth.
  const B = 46;
  const bPos = new Float32Array(B * 3);
  const bCol = new Float32Array(B * 3);
  for (let i = 0; i < B; i++) {
    bPos.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 7, -3 - Math.random() * 5], i * 3);
    const c = new THREE.Color(MANA[i % 5].hex).lerp(new THREE.Color("#e0b252"), 0.35);
    bCol.set([c.r, c.g, c.b], i * 3);
  }
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
  bGeo.setAttribute("color", new THREE.BufferAttribute(bCol, 3));
  const bokeh = new THREE.Points(
    bGeo,
    new THREE.PointsMaterial({ size: 0.9, map: glow, vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  scene.add(bokeh);

  // A faint rune ring behind everything.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.01, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0xe0b252, transparent: true, opacity: 0.32 })
  );
  ring.rotation.x = Math.PI / 2.25;
  rig.add(ring);
  const ring2 = ring.clone();
  ring2.scale.setScalar(1.18);
  (ring2.material as THREE.MeshBasicMaterial) = (ring.material as THREE.MeshBasicMaterial).clone();
  (ring2.material as THREE.MeshBasicMaterial).opacity = 0.14;
  rig.add(ring2);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const place = () => {
    // Wide screens: card to the right of the headline. Narrow screens: centred, higher up.
    const wide = camera.aspect > 1.15;
    // (Phones: a little smaller and higher, so the card clears the headline under it.)
    rig.position.set(wide ? Math.min(2.6, 0.55 + camera.aspect * 0.95) : 0, wide ? 0.1 : 2.05, 0);
    rig.scale.setScalar(wide ? 0.92 : 0.42);
  };

  const step = (t: number, dt: number) => {
    place();
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    card.rotation.y = Math.sin(t * 0.35) * 0.5 + pointer.x * 0.35 + (Math.max(0, Math.sin(t * 0.11)) ** 24) * Math.PI * 2;
    card.rotation.x = Math.sin(t * 0.5) * 0.06 - pointer.y * 0.18;
    card.position.y = Math.sin(t * 0.8) * 0.08;
    orbs.forEach((o, i) => {
      const a = t * 0.45 + o.phase;
      o.g.position.set(Math.cos(a) * 2.35, Math.sin(a * 1.0) * 0.55 + Math.sin(t * 1.3 + i) * 0.12, Math.sin(a) * 1.25);
    });
    bokeh.rotation.y = Math.sin(t * 0.05) * 0.15;
    ring.rotation.z = t * 0.06;
    ring2.rotation.z = -t * 0.04;
    for (let i = 0; i < N; i++) {
      const s = seeds[i];
      s.a += s.v * dt * (s.ember ? 0.4 : 1);
      s.y += s.up * dt * (s.ember ? 1.6 : 1);
      if (s.y > 3.6) s.y = -3.6;
      if (s.ember) {
        // Embers drift straight up from the forge.
        pos[i * 3] = Math.cos(s.a) * s.r * 0.45;
        pos[i * 3 + 1] = s.y;
        pos[i * 3 + 2] = Math.sin(s.a) * s.r * 0.3 - 0.8;
      } else {
        // Mana motes ride a tilted disc that wobbles with height, like the rune ring.
        const lift = Math.sin(s.y * 0.9 + s.a) * 0.35;
        const x = Math.cos(s.a) * s.r;
        const z = Math.sin(s.a) * s.r;
        pos[i * 3] = x;
        pos[i * 3 + 1] = z * 0.38 + lift + (s.y / 6) * 0.6;
        pos[i * 3 + 2] = z * 0.9;
      }
    }
    pGeo.attributes.position.needsUpdate = true;
    camera.position.x = pointer.x * 0.25;
    camera.position.y = -pointer.y * 0.15;
    camera.lookAt(0, 0, 0);
  };

  if (opts.still) {
    step(2.4, 0);
    stage.renderOnce();
  } else stage.start(step);

  return () => {
    window.removeEventListener("pointermove", onMove);
    glow.dispose();
    stage.dispose();
  };
}
