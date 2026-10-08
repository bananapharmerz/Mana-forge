// Procedural 3D models of Mana Forge's products, one per product icon type. Each model
// exposes animate(p, t): p is the scroll progress through the showcase (0..1), t is seconds.

import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { THREE } from "./stage";
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

export interface ProductLike {
  name: string;
  icon: string;
  category: string;
}

export interface ProductModel {
  group: THREE.Group;
  animate: (p: number, t: number) => void;
  focus: THREE.Vector3; // where the close-up looks
  size: number; // rough radius, for framing
  turn?: number; // how far the stage turns it while scrolling (flat things barely turn)
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (p: number, a: number, b: number) => ease((p - a) / (b - a));

// A colour that suits the product, from words in its name.
export function themeFor(name: string): { base: string; accent: string; glow: string } {
  const n = name.toLowerCase();
  if (/dragon|fire|red|mountain|ember/.test(n)) return { base: "#5a1410", accent: "#e0b252", glow: "#ff6a2e" };
  if (/forest|grove|green|elf/.test(n)) return { base: "#13361f", accent: "#d8c27a", glow: "#3ddc84" };
  if (/island|blue|sea|ocean/.test(n)) return { base: "#0e2a4d", accent: "#cfd9e8", glow: "#4aa3ff" };
  if (/swamp|black|matte|shadow|obsidian/.test(n)) return { base: "#111014", accent: "#c9a45a", glow: "#9b6bd6" };
  if (/plains|white|angel/.test(n)) return { base: "#e9e2cc", accent: "#b5872a", glow: "#fff1c4" };
  return { base: "#3a1f52", accent: "#e0b252", glow: "#ffb347" };
}

function sigilTexture(color: string, size = 512, bg = "rgba(0,0,0,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  g.translate(size / 2, size / 2 + size * 0.08);
  const s = size / 260;
  g.scale(s, s);
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(0, -20, 112, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(0, -20, 100, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = color;
  // anvil
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
  // flame
  g.beginPath();
  g.moveTo(0, -8);
  g.bezierCurveTo(-34, -22, -22, -58, -6, -76);
  g.bezierCurveTo(-8, -58, 6, -52, 4, -38);
  g.bezierCurveTo(14, -48, 18, -64, 12, -92);
  g.bezierCurveTo(40, -62, 38, -24, 0, -8);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function cardShape(w: number, h: number, r: number) {
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

// ---- deck box: the lid lifts off as you scroll ----------------------------------------------
function deckBox(p: ProductLike): ProductModel {
  const th = themeFor(p.name);
  const group = new THREE.Group();
  const leather = new THREE.MeshPhysicalMaterial({ color: th.base, roughness: 0.62, metalness: 0.05, sheen: 1, sheenColor: new THREE.Color(th.accent), sheenRoughness: 0.5, clearcoat: 0.25 });
  const three = /3-?deck|three/i.test(p.name);
  const w = three ? 2.3 : 1.45;
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, 1.75, 1.15, 6, 0.08), leather);
  body.position.y = -0.2;
  group.add(body);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(w + 0.04, 0.62, 1.19, 6, 0.09), leather.clone());
  (lid.material as THREE.MeshPhysicalMaterial).color = new THREE.Color(th.base).multiplyScalar(0.8);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.67, -0.58);
  lid.position.set(0, 0.0, 0.58);
  lidPivot.add(lid);
  group.add(lidPivot);
  // gold trim + emblem
  const gold = new THREE.MeshStandardMaterial({ color: th.accent, metalness: 1, roughness: 0.28 });
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.04, 1.17), gold);
  trim.position.y = 0.36;
  group.add(trim);
  const emblem = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.95),
    new THREE.MeshStandardMaterial({ map: sigilTexture(th.accent), transparent: true, metalness: 0.9, roughness: 0.3, emissive: new THREE.Color(th.glow), emissiveIntensity: 0.25, emissiveMap: sigilTexture("#ffffff") })
  );
  emblem.position.set(0, -0.15, 0.581);
  group.add(emblem);
  // cards peeking out once the lid is up
  const deckCount = three ? 3 : 1;
  const decks: THREE.Mesh[] = [];
  for (let i = 0; i < deckCount; i++) {
    const d = new THREE.Mesh(new RoundedBoxGeometry(0.62, 1.6, 0.98, 4, 0.03), new THREE.MeshStandardMaterial({ color: ["#2b1846", "#132f4a", "#3d1410"][i], roughness: 0.6 }));
    d.position.set((i - (deckCount - 1) / 2) * 0.72, -0.25, 0);
    group.add(d);
    decks.push(d);
  }
  return {
    group,
    focus: new THREE.Vector3(0, 0.3, 0),
    size: three ? 1.6 : 1.25,
    animate(pr, t) {
      const open = span(pr, 0.3, 0.55) * (1 - span(pr, 0.82, 0.95));
      lidPivot.rotation.x = -open * 1.9;
      decks.forEach((d, i) => (d.position.y = -0.25 + open * (0.55 + Math.sin(t * 1.2 + i) * 0.03)));
    },
  };
}

// ---- sleeves: a stack that fans out ---------------------------------------------------------
function sleeves(p: ProductLike): ProductModel {
  const th = themeFor(p.name);
  const group = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(cardShape(1.26, 1.76, 0.07), { depth: 0.012, bevelEnabled: false, curveSegments: 8 });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({ color: th.base, roughness: /matte/i.test(p.name) ? 0.75 : 0.25, clearcoat: /matte/i.test(p.name) ? 0 : 1, clearcoatRoughness: 0.15, metalness: 0.1, sheen: 0.6, sheenColor: new THREE.Color(th.glow) });
  const emblemMat = new THREE.MeshStandardMaterial({ map: sigilTexture(th.accent), transparent: true, metalness: 0.8, roughness: 0.35, emissive: new THREE.Color(th.glow), emissiveIntensity: 0.2, emissiveMap: sigilTexture("#ffffff") });
  const cards: THREE.Group[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    const m = new THREE.Mesh(geo, mat);
    c.add(m);
    if (i === n - 1) {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), emblemMat);
      e.position.z = 0.008;
      c.add(e);
    }
    c.position.z = i * 0.016;
    group.add(c);
    cards.push(c);
  }
  return {
    group,
    focus: new THREE.Vector3(0, 0.2, 0),
    size: 1.4,
    turn: 0.3,
    animate(pr, t) {
      const fan = span(pr, 0.25, 0.6) * (1 - span(pr, 0.85, 0.98));
      cards.forEach((c, i) => {
        const k = i - (n - 1) / 2;
        c.rotation.z = k * 0.13 * fan;
        c.position.x = k * 0.09 * fan;
        c.position.y = -Math.abs(k) * 0.02 * fan + Math.sin(t * 1.3 + i * 0.4) * 0.01 * fan;
      });
    },
  };
}

// ---- playmat: painted scene, tilts from edge-on to face-on ----------------------------------
function matTexture(name: string, th: { base: string; accent: string; glow: string }) {
  const W = 1536;
  const H = 880;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const n = name.toLowerCase();
  const sky = g.createLinearGradient(0, 0, 0, H);
  if (/forest|grove/.test(n)) {
    sky.addColorStop(0, "#0d2a1e");
    sky.addColorStop(0.55, "#1f5a35");
    sky.addColorStop(1, "#08140d");
  } else if (/mountain|peak/.test(n)) {
    sky.addColorStop(0, "#2a0d0b");
    sky.addColorStop(0.5, "#b4471c");
    sky.addColorStop(1, "#1a0806");
  } else {
    sky.addColorStop(0, "#120a24");
    sky.addColorStop(0.5, "#3b1d55");
    sky.addColorStop(1, "#08040f");
  }
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // glow sun / moon
  const sun = g.createRadialGradient(W * 0.68, H * 0.32, 10, W * 0.68, H * 0.32, 260);
  sun.addColorStop(0, th.glow);
  sun.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);
  if (/forest|grove/.test(n)) {
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = ["#0f3a24", "#0b2a1a", "#061a10"][layer];
      for (let x = -40; x < W + 40; x += 34 + layer * 10) {
        const h = 160 + Math.random() * 160 + layer * 90;
        const base = H * (0.7 + layer * 0.1);
        g.beginPath();
        g.moveTo(x, base);
        g.lineTo(x + 30 + layer * 8, base - h);
        g.lineTo(x + 60 + layer * 16, base);
        g.fill();
      }
      g.fillRect(0, H * (0.7 + layer * 0.1), W, H);
    }
  } else if (/mountain|peak/.test(n)) {
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = ["#5a1f12", "#3a120a", "#1c0805"][layer];
      g.beginPath();
      g.moveTo(0, H);
      let x = 0;
      while (x < W) {
        const peak = H * (0.32 + layer * 0.14) + Math.random() * 90;
        g.lineTo(x + 90, peak);
        x += 180 + Math.random() * 120;
        g.lineTo(x, H * (0.6 + layer * 0.1));
      }
      g.lineTo(W, H);
      g.fill();
    }
  } else {
    g.strokeStyle = th.accent;
    g.globalAlpha = 0.6;
    for (let i = 0; i < 6; i++) {
      g.lineWidth = i % 2 ? 1.5 : 3;
      g.beginPath();
      g.arc(W / 2, H / 2, 120 + i * 55, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  // card zones like a real playmat
  g.strokeStyle = "rgba(255,240,200,0.28)";
  g.lineWidth = 3;
  const zw = 150;
  const zh = 210;
  for (let i = 0; i < 2; i++) {
    g.strokeRect(W - zw - 70, 90 + i * (zh + 40), zw, zh);
  }
  g.fillStyle = "rgba(255,240,200,0.55)";
  fitFont(g, SITE.upper, "600", 56, "Georgia, serif", W - 140);
  g.fillText(SITE.upper, 70, H - 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function playmat(p: ProductLike): ProductModel {
  const th = themeFor(p.name);
  const group = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ map: matTexture(p.name, th), roughness: 0.92, color: 0xbdb5a8 });
  const side = new THREE.MeshStandardMaterial({ color: th.accent, roughness: 0.6, metalness: 0.3 });
  // The rubber base, with the printed face laid on top.
  group.add(new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.05, 2.4, 2, 0.02), side));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.12, 2.32), top);
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.026;
  group.add(face);
  const tilt = new THREE.Group();
  tilt.add(group);
  return {
    group: tilt,
    focus: new THREE.Vector3(0.4, 0, 0),
    size: 2.1,
    turn: 0.25,
    animate(pr, t) {
      group.rotation.x = THREE.MathUtils.lerp(0.12, 1.05, span(pr, 0.05, 0.5)) - span(pr, 0.75, 1) * 0.25;
      group.position.y = Math.sin(t * 0.8) * 0.03;
    },
  };
}

// ---- dice: a 7-piece set that gathers into a ring --------------------------------------------
function bipyramid(sides: number, r: number, h: number) {
  const pts = [new THREE.Vector2(0, -h), new THREE.Vector2(r, 0), new THREE.Vector2(0, h)];
  return new THREE.LatheGeometry(pts, sides);
}

function diceSet(p: ProductLike): ProductModel {
  const th = themeFor(p.name);
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: th.glow, roughness: 0.12, metalness: 0, transmission: 0.55, thickness: 0.8, ior: 1.5, clearcoat: 1, attenuationColor: new THREE.Color(th.base), attenuationDistance: 0.8 });
  const edge = new THREE.LineBasicMaterial({ color: th.accent, transparent: true, opacity: 0.6 });
  const geos = [
    new THREE.TetrahedronGeometry(0.42),
    new RoundedBoxGeometry(0.56, 0.56, 0.56, 3, 0.07),
    new THREE.OctahedronGeometry(0.42),
    bipyramid(5, 0.4, 0.42),
    bipyramid(5, 0.4, 0.42),
    new THREE.DodecahedronGeometry(0.42),
    new THREE.IcosahedronGeometry(0.46),
  ];
  const dice = geos.map((geo, i) => {
    const m = new THREE.Mesh(geo, mat);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edge));
    const a = (i / geos.length) * Math.PI * 2;
    const home = new THREE.Vector3(Math.cos(a) * 1.25, Math.sin(i * 1.7) * 0.15, Math.sin(a) * 1.25);
    const scatter = new THREE.Vector3(Math.cos(a) * 2.6, 0.3 + Math.random() * 0.9, Math.sin(a) * 2.2);
    group.add(m);
    return { m, home, scatter, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()) };
  });
  return {
    group,
    focus: new THREE.Vector3(0, 0, 0),
    size: 1.7,
    animate(pr, t) {
      const gather = span(pr, 0.0, 0.35);
      dice.forEach((d, i) => {
        d.m.position.lerpVectors(d.scatter, d.home, gather);
        d.m.position.y += Math.sin(t * 1.4 + i) * 0.05;
        d.m.rotation.set(d.spin.x * (t * 0.5 + (1 - gather) * 6), d.spin.y * (t * 0.4 + (1 - gather) * 6), d.spin.z * t * 0.3);
      });
      group.rotation.y = pr * 2.2;
    },
  };
}

// ---- spindown life counter: a big d20 that slows to a stop ----------------------------------
function spindown(p: ProductLike): ProductModel {
  const th = themeFor(p.name);
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1.05);
  const die = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: th.base, roughness: 0.38, metalness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.5, sheenColor: new THREE.Color(th.glow), flatShading: true }));
  die.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: th.accent })));
  group.add(die);
  return {
    group,
    focus: new THREE.Vector3(0, 0, 0),
    size: 1.2,
    animate(pr, t) {
      const slow = 1 - span(pr, 0.1, 0.7);
      die.rotation.x = t * 0.35 * slow + pr * 3.2;
      die.rotation.y = t * 0.6 * slow + pr * 4.1;
    },
  };
}

export function buildProductModel(p: ProductLike): ProductModel {
  switch (p.icon) {
    case "deckbox":
      return deckBox(p);
    case "sleeve":
      return sleeves(p);
    case "playmat":
      return playmat(p);
    case "dice":
      return diceSet(p);
    case "spindown":
      return spindown(p);
    default:
      return p.category === "playmat" ? playmat(p) : deckBox(p);
  }
}
