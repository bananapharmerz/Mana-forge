// The store's cinematic product stage (Regent-style): one product under a spotlight in a dark,
// misty room. Scroll drives the camera and the product's own animation.

import { buildProductModel, themeFor, type ProductLike } from "./productModels";
import { createStage, glowTexture, THREE } from "./stage";

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function fogTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 30 + Math.random() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.10)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  // Fade every edge out so the planes never show as rectangles.
  g.globalCompositeOperation = "destination-in";
  const mask = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = mask;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function mountShowcase(host: HTMLElement, product: ProductLike, progress: () => number, opts: { still: boolean }) {
  const stage = createStage(host, { fov: 30, bloom: { strength: 0.5, radius: 0.6, threshold: 0.85 }, exposure: 1.0 });
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.35;
  const th = themeFor(product.name);
  scene.fog = new THREE.FogExp2(0x07050c, 0.06);

  scene.add(new THREE.AmbientLight(0x4a4060, 0.35));
  const spot = new THREE.SpotLight(0xfff0d8, 45, 18, 0.42, 0.65, 1.4);
  spot.position.set(0, 7, 1.5);
  spot.target.position.set(0, 0, 0);
  scene.add(spot, spot.target);
  const rim = new THREE.PointLight(new THREE.Color(th.glow), 18, 12);
  rim.position.set(-3, 2.6, -3.6);
  scene.add(rim);
  const fill = new THREE.PointLight(0x7a6cff, 6, 12);
  fill.position.set(3.5, 0.5, 2);
  scene.add(fill);

  // Light shaft from above.
  const shaft = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 7.5, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.025, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  shaft.position.y = 2.6;
  scene.add(shaft);

  // Plinth + floor.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x0b0910, roughness: 0.35, metalness: 0.4 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.35;
  scene.add(floor);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.05, 0.18, 64), new THREE.MeshStandardMaterial({ color: 0x15111c, roughness: 0.5, metalness: 0.6 }));
  plinth.position.y = -1.27;
  scene.add(plinth);
  const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(1.93, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(th.accent) }));
  ringGlow.rotation.x = Math.PI / 2;
  ringGlow.position.y = -1.18;
  scene.add(ringGlow);

  // Low drifting mist.
  const fogTex = fogTexture();
  const mists = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 2.2),
      new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0.16, depthWrite: false, color: i % 2 ? 0xb8b0e8 : 0xe8d4b8 })
    );
    m.position.set((Math.random() - 0.5) * 4, -1.15 + Math.random() * 0.3, -2.5 + i * 0.7);
    m.rotation.z = Math.random() * Math.PI;
    scene.add(m);
    return { m, speed: 0.04 + Math.random() * 0.06, phase: Math.random() * 10 };
  });

  // Dust in the light.
  const glow = glowTexture();
  const D = 260;
  const dPos = new Float32Array(D * 3);
  const dust = Array.from({ length: D }, () => ({ x: (Math.random() - 0.5) * 3.6, y: Math.random() * 6 - 1.2, z: (Math.random() - 0.5) * 3.6, v: 0.03 + Math.random() * 0.08 }));
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  const motes = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.035, map: glow, color: 0xffe9c2, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(motes);

  const model = buildProductModel(product);
  const hold = new THREE.Group();
  hold.add(model.group);
  scene.add(hold);
  const fit = 1.25 / model.size;
  hold.scale.setScalar(fit);

  // Camera path keyed on scroll: wide hero → close-up → pull back to the side for "reserve".
  const camAt = (p: number) => {
    const a = ease(p / 0.45);
    const b = ease((p - 0.45) / 0.25);
    const c = ease((p - 0.7) / 0.3);
    const pos = new THREE.Vector3(0, 1.0, 9.5)
      .lerp(new THREE.Vector3(-1.8, 0.8, 7.4), a)
      .lerp(new THREE.Vector3(1.3, 0.45, 5.4), b)
      .lerp(new THREE.Vector3(-0.6, 1.1, 9.0), c);
    const look = new THREE.Vector3(0, 0, 0)
      .lerp(new THREE.Vector3(0.9, 0.05, 0), a)
      .lerp(model.focus.clone().multiplyScalar(fit).add(new THREE.Vector3(-0.6, 0, 0)), b)
      .lerp(new THREE.Vector3(1.9, -0.1, 0), c);
    return { pos, look };
  };

  let smooth = progress();
  const step = (t: number, dt: number) => {
    const target = progress();
    smooth += (target - smooth) * Math.min(1, dt * 4);
    const p = smooth;
    const narrow = camera.aspect < 0.9;
    const { pos, look } = camAt(p);
    if (narrow) {
      pos.z += 6;
      pos.y += 0.6;
      pos.x *= 0.3;
      look.x *= 0.2;
      look.y += 0.35;
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    hold.rotation.y = p * Math.PI * 1.2 * (model.turn ?? 1) + Math.sin(t * 0.3) * 0.12;
    hold.position.y = Math.sin(t * 0.9) * 0.05;
    model.animate(p, t);
    mists.forEach((o) => {
      o.m.position.x = Math.sin(t * o.speed + o.phase) * 2.5;
      o.m.lookAt(camera.position.x, o.m.position.y, camera.position.z);
    });
    for (let i = 0; i < D; i++) {
      const d = dust[i];
      d.y += d.v * dt;
      if (d.y > 4.8) d.y = -1.2;
      dPos[i * 3] = d.x + Math.sin(t * 0.3 + i) * 0.08;
      dPos[i * 3 + 1] = d.y;
      dPos[i * 3 + 2] = d.z;
    }
    dGeo.attributes.position.needsUpdate = true;
    shaft.material.opacity = 0.022 + Math.sin(t * 0.7) * 0.006;
  };

  if (opts.still) {
    step(1, 1);
    stage.renderOnce();
    const onScroll = () => {
      step(1, 1);
      stage.renderOnce();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      fogTex.dispose();
      glow.dispose();
      stage.dispose();
    };
  }
  stage.start(step);
  return () => {
    fogTex.dispose();
    glow.dispose();
    stage.dispose();
  };
}
