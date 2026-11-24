/* Maiza Events — WebGL stage: golden ring arch, silk drape, florals, chandelier.
   The camera travels through the scene as the page scrolls. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const ready = () => dispatchEvent(new Event('scene-ready'));

const fail = () => { document.documentElement.classList.add('no-webgl'); ready(); };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene');

/* Camera shots per section: d = desktop, m = portrait/mobile. p = position, t = look-at, o = canvas opacity */
const SHOTS = {
  hero:     { d: { p: [-1.4, 2.7, 14.2], t: [-2.2, 2.45, 0] }, m: { p: [0, 2.6, 19.5], t: [0, -1.9, 0] }, o: 1 },
  services: { d: { p: [-0.6, 4.3, 7.4],   t: [-1.2, 3.5, 0] },  m: { p: [0.8, 4.4, 10],  t: [0, 3.2, 0] }, o: 0.5, om: 0.2 },
  about:    { d: { p: [0, 2.6, 15.5],     t: [0.2, 2.4, 0] }, m: { p: [0, 2.3, 15],    t: [0, 2.3, 0] }, o: 1 },
  gallery:  { d: { p: [0, 2.5, 2.2],      t: [0, 2.6, -6] },    m: { p: [0, 2.5, 3],     t: [0, 2.6, -6] }, o: 0 },
};

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    fail();
    return;
  }
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4 && innerWidth < 860;
  const DPR = Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const BG = 0x060503;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.032);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

  /* ---------- materials ---------- */
  const gold = new THREE.MeshStandardMaterial({ color: 0xdba646, metalness: 1, roughness: 0.16, envMapIntensity: 1.25 });
  const goldSatin = new THREE.MeshStandardMaterial({ color: 0xc9983c, metalness: 1, roughness: 0.34, envMapIntensity: 1.1 });
  const onyx = new THREE.MeshStandardMaterial({ color: 0x0c0a07, metalness: 0.9, roughness: 0.2, envMapIntensity: 0.75 });
  const slat = new THREE.MeshStandardMaterial({ color: 0x120e08, metalness: 0.7, roughness: 0.45, envMapIntensity: 0.35 });
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

  const world = new THREE.Group();
  scene.add(world);

  /* ---------- floor + glow ---------- */
  const floor = new THREE.Mesh(new THREE.CircleGeometry(44, 72), new THREE.MeshStandardMaterial({ color: 0x080705, metalness: 0.92, roughness: 0.28, envMapIntensity: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);

  const radial = (inner, outer) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, inner); grd.addColorStop(0.45, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: radial('rgba(255,196,96,.3)', 'rgba(190,120,30,.09)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.012;
  world.add(pool);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: radial('rgba(255,205,120,.2)', 'rgba(170,105,25,.06)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.set(0, 2.6, -2.2);
  world.add(halo);

  /* ---------- tiered stage ---------- */
  const TIERS = [[3.7, 0.18], [3.05, 0.36], [2.4, 0.54]];
  TIERS.forEach(([r, top]) => {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.18, 120), onyx);
    tier.position.y = top - 0.09;
    world.add(tier);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 10, 180), gold);
    rim.rotation.x = Math.PI / 2; rim.position.y = top;
    world.add(rim);
    const led = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.028, 120, 1, true), glow(1.9, 1.15, 0.4));
    led.position.y = top - 0.15;
    world.add(led);
  });
  const STAGE_TOP = 0.54;

  /* ---------- ring arch ---------- */
  const RING_R = 2.15, RING_Y = STAGE_TOP + RING_R - 0.22;
  const rings = new THREE.Group();
  rings.position.y = RING_Y;
  world.add(rings);
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.17, 40, 220), gold);
  rings.add(ringA);
  const ringLed = new THREE.Mesh(new THREE.TorusGeometry(RING_R - 0.185, 0.011, 8, 220), glow(2.0, 1.3, 0.5));
  ringLed.position.z = 0.03;
  rings.add(ringLed);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.06, 20, 220), gold);
  ringB.rotation.set(0.22, 0.7, 0);
  rings.add(ringB);
  const ringC = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.04, 16, 200), goldSatin);
  ringC.rotation.set(-0.15, -0.85, 0.1);
  rings.add(ringC);
  const ringD = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.02, 12, 220), goldSatin);
  ringD.rotation.set(1.2, 0.2, 0);
  rings.add(ringD);

  /* ---------- helpers ---------- */
  const rnd = (() => { let s = 20261124; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color(), eul = new THREE.Euler();
  const unitBox = new THREE.BoxGeometry(1, 1, 1), unitBall = new THREE.SphereGeometry(1, 12, 8);
  const box = (parent, mat, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m);
    return m;
  };
  /* collects boxes / balls and draws them in one instanced call */
  const batch = (parent, mat, geo = unitBox) => {
    const items = [];
    return {
      add: (x, y, z, sx, sy, sz, color = null, ry = 0, rz = 0) => items.push([x, y, z, sx, sy, sz, color, ry, rz]),
      build: () => {
        const mesh = new THREE.InstancedMesh(geo, mat, items.length);
        items.forEach(([x, y, z, sx, sy, sz, color, ry, rz], i) => {
          m4.compose(v3.set(x, y, z), q.setFromEuler(eul.set(0, ry, rz)), s3.set(sx, sy, sz));
          mesh.setMatrixAt(i, m4);
          if (color !== null) mesh.setColorAt(i, col.setHex(color));
        });
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.frustumCulled = false;
        parent.add(mesh);
        return mesh;
      },
    };
  };
  const FONT = '"Cinzel", "Times New Roman", serif';
  const redraws = [];
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const paint = (...a) => { draw(c.getContext('2d'), w, h, ...a); t.needsUpdate = true; };
    paint();
    return { tex: t, paint };
  };
  const sign = (parent, text, w, h, x, y, z) => {
    const { tex, paint } = canvasTex(512, Math.round((512 * h) / w), (g, W, H) => {
      g.fillStyle = '#0b0906'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#c9983c'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12);
      g.fillStyle = '#f3d98b'; g.font = `600 ${Math.round(H * 0.44)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      if ('letterSpacing' in g) g.letterSpacing = '8px';
      g.fillText(text, W / 2, H / 2 + 2);
    });
    redraws.push(paint);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(x, y, z); parent.add(m);
    return m;
  };

  /* ---------- conference: LED wall, lectern, lighting truss, audience ---------- */
  const SCREEN = [
    ['Conferences', 'Share · Learn · Grow'], ['Book Fairs', 'Read · Discover · Meet'], ['Open Markets', 'Shop · Taste · Connect'],
    ['Exhibitions', 'Showcase · Launch · Sell'], ['Weddings', 'A perfect start to forever'], ['Festivals', 'Experience the joy'],
  ];
  let shown = 0;
  const screen = canvasTex(1024, 512, (g, W, H, i = shown) => {
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#16205a'); bg.addColorStop(0.55, '#0a0d24'); bg.addColorStop(1, '#3a2608');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 9; k++) {
      g.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = H * 0.5 + Math.sin(x * 0.0052 + k * 0.42 + i * 1.3) * (60 + k * 16) + Math.sin(x * 0.013 + k) * 14;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = `rgba(236,190,98,${0.07 + k * 0.022})`; g.lineWidth = 1.6; g.stroke();
    }
    const vg = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.42);
    vg.addColorStop(0, 'rgba(5,5,10,.6)'); vg.addColorStop(1, 'rgba(5,5,10,0)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = '9px';
    g.fillStyle = 'rgba(247,241,229,.92)'; g.font = '600 22px "Manrope", system-ui, sans-serif';
    g.fillText('MAIZA EVENTS PRESENTS', W / 2, 158);
    if ('letterSpacing' in g) g.letterSpacing = '3px';
    const word = SCREEN[i][0].toUpperCase();
    let size = 112; g.font = `600 ${size}px ${FONT}`;
    const tw = g.measureText(word).width;
    if (tw > 600) { size *= 600 / tw; g.font = `600 ${size}px ${FONT}`; }
    const gg = g.createLinearGradient(0, 250 - size / 2, 0, 250 + size / 2);
    gg.addColorStop(0, '#fff3c8'); gg.addColorStop(0.45, '#e9c46e'); gg.addColorStop(0.7, '#b98a2e'); gg.addColorStop(1, '#f0d488');
    g.fillStyle = gg; g.fillText(word, W / 2, 252);
    g.fillStyle = '#d8a94a'; g.fillRect(W / 2 - 46, 318, 92, 2);
    if ('letterSpacing' in g) g.letterSpacing = '1px';
    g.fillStyle = '#f7f1e5'; g.font = 'italic 500 34px "Cormorant Garamond", Georgia, serif';
    g.fillText(SCREEN[i][1], W / 2, 362);
  });
  redraws.push(() => screen.paint(shown));
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false });
  const WALL_W = 5.1, WALL_H = 2.55, WALL_Y = 2.62, WALL_Z = -1.45;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_W, WALL_H), screenMat);
  wall.position.set(0, WALL_Y, WALL_Z);
  world.add(wall);
  box(world, onyx, WALL_W + 0.16, WALL_H + 0.16, 0.12, 0, WALL_Y, WALL_Z - 0.08);
  box(world, onyx, WALL_W + 0.16, WALL_Y - WALL_H / 2, 0.3, 0, (WALL_Y - WALL_H / 2) / 2, WALL_Z - 0.1);
  [-1, 1].forEach((s) => box(world, gold, 0.035, WALL_H + 0.16, 0.14, s * (WALL_W / 2 + 0.09), WALL_Y, WALL_Z - 0.06));

  const lectern = new THREE.Group();
  lectern.position.set(-1.28, STAGE_TOP, 1.1); lectern.rotation.y = 0.35;
  world.add(lectern);
  box(lectern, onyx, 0.5, 0.96, 0.34, 0, 0.48, 0);
  box(lectern, gold, 0.5, 0.03, 0.34, 0, 0.975, 0);
  box(lectern, gold, 0.06, 0.96, 0.012, 0, 0.48, 0.177);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), goldSatin);
  mic.position.set(0.1, 1.12, -0.05); mic.rotation.x = -0.5; lectern.add(mic);
  const micHead = new THREE.Mesh(unitBall, onyx);
  micHead.scale.setScalar(0.028); micHead.position.set(0.1, 1.26, 0.03); lectern.add(micHead);

  const TRUSS_Y = 6.3, TRUSS_Z = -0.7, TRUSS_X = 4.75;
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3a, metalness: 1, roughness: 0.38, envMapIntensity: 0.9 });
  const truss = batch(world, trussMat);
  [-0.16, 0.16].forEach((o) => {
    truss.add(0, TRUSS_Y + o, TRUSS_Z, TRUSS_X * 2 + 0.4, 0.05, 0.05);
    [-1, 1].forEach((s) => truss.add(s * TRUSS_X + o, TRUSS_Y / 2, TRUSS_Z, 0.05, TRUSS_Y + 0.36, 0.05));
  });
  for (let i = 0, n = 26; i < n; i++) truss.add(-TRUSS_X + ((i + 0.5) / n) * TRUSS_X * 2, TRUSS_Y, TRUSS_Z, 0.028, 0.46, 0.028, null, 0, i % 2 ? 0.75 : -0.75);
  for (let i = 0, n = 15; i < n; i++) [-1, 1].forEach((s) => truss.add(s * TRUSS_X, ((i + 0.5) / n) * (TRUSS_Y - 0.2), TRUSS_Z, 0.46, 0.028, 0.028, null, 0, i % 2 ? 0.75 : -0.75));
  truss.build();

  const beamTex = canvasTex(4, 128, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,.4)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.clearRect(0, 0, W, H); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }).tex;
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: new THREE.Color(1, 0.7, 0.32), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beamGeo = new THREE.ConeGeometry(0.95, 6.4, 28, 1, true); beamGeo.translate(0, -3.2, 0);
  const lampGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.2, 14);
  const beams = [-3.3, -1.1, 1.1, 3.3].map((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, TRUSS_Y - 0.3, TRUSS_Z + 0.1);
    g.userData = { base: -x * 0.085, ph: i * 1.7 };
    g.add(new THREE.Mesh(beamGeo, beamMat));
    const head = new THREE.Mesh(lampGeo, onyx); head.position.y = 0.02; g.add(head);
    const lens = new THREE.Mesh(unitBall, glow(2.4, 1.7, 0.8)); lens.scale.set(0.085, 0.03, 0.085); lens.position.y = -0.09; g.add(lens);
    world.add(g);
    return g;
  });

  /* gold banquet chairs facing the stage */
  const chairs = batch(world, goldSatin), cushions = batch(world, new THREE.MeshStandardMaterial({ color: 0xe9dfc8, roughness: 0.8, envMapIntensity: 0.3 }));
  [[5.5, 11], [6.35, 13], [7.2, 15]].forEach(([r, n]) => {
    for (let i = 0; i < n; i++) {
      const a = THREE.MathUtils.degToRad(-54 + (i / (n - 1)) * 108);
      if (Math.abs(a) < 0.07) continue;
      const cx = Math.sin(a) * r, cz = Math.cos(a) * r, ca = Math.cos(a), sa = Math.sin(a);
      const put = (b, lx, y, lz, sx, sy, sz) => b.add(cx + lx * ca + lz * sa, y, cz - lx * sa + lz * ca, sx, sy, sz, null, a);
      [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].forEach(([lx, lz]) => put(chairs, lx, 0.21, lz, 0.024, 0.42, 0.024));
      put(chairs, 0, 0.42, 0, 0.37, 0.022, 0.37);
      put(cushions, 0, 0.455, 0, 0.33, 0.05, 0.33);
      [-0.16, 0.16].forEach((lx) => put(chairs, lx, 0.7, 0.17, 0.024, 0.56, 0.024));
      put(chairs, 0, 0.96, 0.17, 0.37, 0.045, 0.026);
      put(chairs, 0, 0.6, 0.17, 0.32, 0.024, 0.02);
      [-0.08, 0, 0.08].forEach((lx) => put(chairs, lx, 0.78, 0.17, 0.014, 0.34, 0.014));
    }
  });
  chairs.build(); cushions.build();

  /* ---------- book fair: shelf wall and display table ---------- */
  const matte = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0, envMapIntensity: 0.3 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a4f26, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.35 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x24170b, roughness: 0.6, envMapIntensity: 0.3 });
  const BOOKS = [0x8c2f39, 0x1f3a5f, 0x1e6b52, 0xd9a441, 0xe8dcc2, 0xb5532a, 0x4a2d6b, 0x2f6f8f, 0xc9302a, 0xf0c9a0];
  const pickBook = () => BOOKS[(rnd() * BOOKS.length) | 0];
  const books = new THREE.Group();
  world.add(books);
  const SHELF_W = 2.0, SHELF_H = 2.14;
  box(books, darkWood, SHELF_W, SHELF_H, 0.04, 0, SHELF_H / 2, -0.19);
  [-1, 1].forEach((s) => box(books, wood, 0.05, SHELF_H, 0.36, s * (SHELF_W / 2), SHELF_H / 2, 0));
  box(books, gold, SHELF_W + 0.1, 0.05, 0.4, 0, SHELF_H + 0.025, 0);
  const tomes = batch(books, matte);
  for (let k = 0; k < 4; k++) {
    const sy = 0.08 + k * 0.52;
    box(books, wood, SHELF_W, 0.04, 0.36, 0, sy, 0);
    box(books, glow(1.5, 0.95, 0.35), SHELF_W - 0.1, 0.012, 0.012, 0, sy + 0.49, 0.15);
    let x = -SHELF_W / 2 + 0.06;
    while (x < SHELF_W / 2 - 0.12) {
      if (rnd() < 0.09) {                       // cover facing out
        tomes.add(x + 0.15, sy + 0.215, 0.05, 0.26, 0.37, 0.03, pickBook(), 0, 0);
        x += 0.33; continue;
      }
      const w = 0.045 + rnd() * 0.055, h = 0.29 + rnd() * 0.13, lean = rnd() < 0.12 ? (rnd() - 0.5) * 0.3 : 0;
      tomes.add(x + w / 2, sy + 0.02 + h / 2, (rnd() - 0.5) * 0.03, w, h, 0.24, pickBook(), 0, lean);
      x += w + 0.006 + Math.abs(lean) * 0.12;
    }
  }
  box(books, new THREE.MeshStandardMaterial({ color: 0x14100a, roughness: 0.75 }), 1.9, 0.6, 0.72, 0.05, 0.3, 0.95);
  box(books, goldSatin, 1.9, 0.012, 0.3, 0.05, 0.607, 0.95);
  for (let sIdx = 0; sIdx < 7; sIdx++) {
    const sx = -0.74 + sIdx * 0.265 + (rnd() - 0.5) * 0.04, sz = 0.95 + (sIdx % 2 ? 0.14 : -0.12), n = 3 + ((rnd() * 6) | 0), stackCol = pickBook();
    for (let b = 0; b < n; b++) tomes.add(sx + (rnd() - 0.5) * 0.02, 0.62 + 0.024 + b * 0.05, sz + (rnd() - 0.5) * 0.02, 0.2, 0.046, 0.29, rnd() < 0.6 ? stackCol : pickBook(), (rnd() - 0.5) * 0.4, 0);
  }
  tomes.build();
  sign(books, 'BOOK FAIR', 1.5, 0.3, 0, SHELF_H + 0.24, 0.02);
  const booksLight = new THREE.PointLight(0xffd9a0, 7, 6.5, 1.8);
  booksLight.position.set(-0.4, 1.7, 1.9);
  books.add(booksLight);

  /* ---------- open market: canopy stalls ---------- */
  const stripeTex = (hex) => {
    const t = canvasTex(256, 4, (g, W, H) => {
      for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? hex : '#f1e6cc'; g.fillRect((i * W) / 20, 0, W / 20 + 1, H); }
    }).tex;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  };
  const canopyGeo = new THREE.ConeGeometry(1, 0.66, 4, 1, true); canopyGeo.rotateY(Math.PI / 4);
  const postGeo = new THREE.CylinderGeometry(0.026, 0.026, 2, 8);
  const FRUIT = [0xe8891c, 0xc9302a, 0x7fae2f, 0xe7b52c];
  const CLOTH = [0xc9302a, 0x1f6f6b, 0xe7b52c, 0x5a2d82, 0xd9622b, 0x1f4f9f];
  const makeStall = (stripe, accent, label) => {
    const g = new THREE.Group();
    const map = stripeTex(stripe);
    const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.16, envMapIntensity: 0.2 }));
    canopy.scale.set(1.5, 1, 1.1); canopy.position.y = 2.33;
    g.add(canopy);
    const HX = 1.0, HZ = 0.72;
    [[-HX, -HZ], [HX, -HZ], [-HX, HZ], [HX, HZ]].forEach(([x, z]) => { const p = new THREE.Mesh(postGeo, goldSatin); p.position.set(x, 1, z); g.add(p); });
    const trim = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.8, envMapIntensity: 0.2 });
    [-1, 1].forEach((s) => { box(g, trim, HX * 2 + 0.1, 0.17, 0.02, 0, 1.94, s * (HZ + 0.03)); box(g, trim, 0.02, 0.17, HZ * 2 + 0.1, s * (HX + 0.03), 1.94, 0); });
    box(g, trim, HX * 2 - 0.1, 0.78, 0.5, 0, 0.39, 0.42);
    box(g, wood, HX * 2, 0.04, 0.6, 0, 0.8, 0.42);
    const goods = batch(g, matte, unitBall), flat = batch(g, matte);
    FRUIT.forEach((c, i) => {
      const cx = -0.69 + i * 0.46;
      flat.add(cx, 0.87, 0.44, 0.38, 0.1, 0.34, 0x8a5a2b);
      for (let k = 0; k < 16; k++) goods.add(cx + (rnd() - 0.5) * 0.27, 0.93 + (k > 8 ? 0.07 : 0) + rnd() * 0.02, 0.44 + (rnd() - 0.5) * 0.23, 0.052, 0.052, 0.052, c);
    });
    CLOTH.forEach((c, i) => flat.add(-0.8 + i * 0.32, 1.3 - (i % 2) * 0.06, -HZ + 0.03, 0.27, 1.0 - (i % 3) * 0.1, 0.02, c));
    for (let i = 0; i < 5; i++) goods.add(-0.76 + i * 0.38, 1.8, 0.2, 0.04, 0.05, 0.04, 0xfff0c0);
    goods.build(); flat.build();
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(unitBall, glow(2.3, 1.6, 0.7)); b.scale.setScalar(0.034); b.position.set(-0.76 + i * 0.38, 1.76, 0.2); g.add(b); }
    sign(g, label, 1.25, 0.24, 0, 2.15, HZ + 0.12);
    const l = new THREE.PointLight(0xffc98a, 6, 5.5, 1.9);
    l.position.set(0, 1.55, 0.75); g.add(l);
    world.add(g);
    return g;
  };
  const stallR = makeStall('#c8962e', 0x9a6f1e, 'OPEN MARKET');
  const stallL = makeStall('#a5482b', 0x8a3a22, 'MARKET');

  /* ---------- festoon lights across the venue ---------- */
  const bulbs = batch(world, glow(2.3, 1.55, 0.62), unitBall), wirePts = [];
  const festoon = (a, b, sag) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), n = Math.max(6, Math.round(A.distanceTo(B) / 0.44));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = new THREE.Vector3().lerpVectors(A, B, t); p.y -= sag * 4 * t * (1 - t);
      if (prev) wirePts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      if (i && i < n) bulbs.add(p.x, p.y - 0.05, p.z, 0.04, 0.05, 0.04);
      prev = p;
    }
  };
  const TOP = [0, TRUSS_Y + 0.2, TRUSS_Z];
  festoon(TOP, [-9.5, 3.7, 3.4], 1.0); festoon(TOP, [9.5, 3.7, 3.4], 1.0);
  festoon(TOP, [-8.2, 4.4, -5], 0.8); festoon(TOP, [8.2, 4.4, -5], 0.8);
  festoon([-TRUSS_X, TRUSS_Y, TRUSS_Z], [-7.6, 3.0, 6.2], 0.7); festoon([TRUSS_X, TRUSS_Y, TRUSS_Z], [7.6, 3.0, 6.2], 0.7);
  bulbs.build();
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
  world.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x4a3a1c })));

  if (document.fonts && document.fonts.load) {
    Promise.all(['600 40px Cinzel', '600 20px Manrope', 'italic 500 34px "Cormorant Garamond"'].map((f) => document.fonts.load(f)))
      .then(() => redraws.forEach((f) => f())).catch(() => {});
  }

  /* side zones move closer on portrait screens so they stay in frame */
  const layout = () => {
    if (portrait) {
      books.position.set(2.75, 0, 1.5); books.rotation.y = -0.3; books.scale.setScalar(0.8);
      stallR.position.set(3.1, 0, -2.6); stallR.rotation.y = -0.25; stallR.scale.setScalar(0.95);
      stallL.position.set(-3.0, 0, -1.9); stallL.rotation.y = 0.3; stallL.scale.setScalar(0.95);
    } else {
      books.position.set(4.0, 0, 1.3); books.rotation.y = -0.42; books.scale.setScalar(1);
      stallR.position.set(3.6, 0, -3.1); stallR.rotation.y = -0.3; stallR.scale.setScalar(1.12);
      stallL.position.set(-4.6, 0, -2.4); stallL.rotation.y = 0.4; stallL.scale.setScalar(1.12);
    }
  };

  /* ---------- backdrop slats ---------- */
  const N_SLATS = 34, slatMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 11, 0.24), slat, N_SLATS);
  const seamMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 11, 0.03), glow(0.42, 0.26, 0.08), N_SLATS);
  for (let i = 0; i < N_SLATS; i++) {
    const a = THREE.MathUtils.degToRad(196 + (i / (N_SLATS - 1)) * 148), R = 10.5;
    q.setFromEuler(new THREE.Euler(0, -a + Math.PI / 2 + 0.5, 0));
    m4.compose(v3.set(Math.cos(a) * R, 5.5, Math.sin(a) * R), q, s3.set(1, 1, 1));
    slatMesh.setMatrixAt(i, m4);
    const a2 = a + THREE.MathUtils.degToRad(2.2);
    m4.compose(v3.set(Math.cos(a2) * (R - 0.25), 5.5, Math.sin(a2) * (R - 0.25)), q.identity(), s3.set(1, 1, 1));
    seamMesh.setMatrixAt(i, m4);
  }
  world.add(slatMesh, seamMesh);

  /* ---------- gold dust ---------- */
  const N_DUST = lowPower ? 320 : 760, dustGeo = new THREE.BufferGeometry();
  const dp = new Float32Array(N_DUST * 3), ds = new Float32Array(N_DUST);
  for (let i = 0; i < N_DUST; i++) {
    dp[i * 3] = (rnd() - 0.5) * 22; dp[i * 3 + 1] = rnd() * 9; dp[i * 3 + 2] = (rnd() - 0.5) * 16 + 1;
    ds[i] = rnd();
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.07 + aSeed * 0.16), 9.0);
        p.x += sin(uTime * 0.32 + aSeed * 40.0) * 0.38;
        p.z += cos(uTime * 0.27 + aSeed * 23.0) * 0.38;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.4) + aSeed * 90.0);
        vA = tw * smoothstep(0.0, 0.9, p.y) * smoothstep(9.0, 7.2, p.y);
        gl_PointSize = uScale * (5.0 + aSeed * 15.0) * tw / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.38) * a * a * vA * 0.9, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  world.add(dust);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xfff0d0, 0x120c05, 0.22));
  const key = new THREE.SpotLight(0xffe3b0, 120, 30, 0.5, 0.7, 1.6);
  key.position.set(-3.5, 9.5, 8); key.target.position.set(0, 2, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffc56e, 0.9);
  rim.position.set(6, 5, -7);
  scene.add(rim);
  const lamp = new THREE.PointLight(0xffd28a, 9, 9, 1.8);
  lamp.position.set(0, RING_Y + RING_R - 0.9, 0.5);
  scene.add(lamp);

  /* ---------- post-processing ---------- */
  let composer = null, bloom = null;
  if (!lowPower) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.55, 1.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* ---------- sizing ---------- */
  let W = 1, H = 1, portrait = false;
  const resize = () => {
    W = innerWidth; H = innerHeight; portrait = W / H < 0.95;
    camera.aspect = W / H;
    camera.fov = portrait ? 44 : 38;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    if (composer) { composer.setPixelRatio(DPR); composer.setSize(W, H); }
    dustMat.uniforms.uScale.value = H * DPR * 0.0075;
    layout();
    measure();
  };

  /* ---------- scroll-driven camera ---------- */
  const anchors = [...document.querySelectorAll('[data-shot]')].map((el) => ({ el, shot: SHOTS[el.dataset.shot], c: 0 })).filter((a) => a.shot);
  function measure() {
    anchors.forEach((a, i) => {
      const r = a.el.getBoundingClientRect(), top = r.top + scrollY;
      a.c = i === 0 ? innerHeight / 2 : (a.el.dataset.shot === 'gallery' ? top + innerHeight * 0.1 : top + r.height / 2);
    });
  }
  const goalP = new THREE.Vector3(), goalT = new THREE.Vector3(), curP = new THREE.Vector3(), curT = new THREE.Vector3();
  const a3 = new THREE.Vector3(), b3 = new THREE.Vector3();
  let goalO = 1, curO = -1, snapped = false;
  const ease = (x) => x * x * (3 - 2 * x);
  const pick = (shot) => (portrait ? shot.m : shot.d);
  const opac = (shot) => (portrait && shot.om != null ? shot.om : shot.o);
  const aim = () => {
    const y = scrollY + innerHeight / 2;
    let i = 0;
    while (i < anchors.length - 2 && y > anchors[i + 1].c) i++;
    const A = anchors[i], B = anchors[i + 1] || A;
    const f = B === A ? 0 : ease(THREE.MathUtils.clamp((y - A.c) / (B.c - A.c), 0, 1));
    const sa = pick(A.shot), sb = pick(B.shot);
    goalP.lerpVectors(a3.fromArray(sa.p), b3.fromArray(sb.p), f);
    goalT.lerpVectors(a3.fromArray(sa.t), b3.fromArray(sb.t), f);
    goalO = THREE.MathUtils.lerp(opac(A.shot), opac(B.shot), f);
  };

  let mx = 0, my = 0, smx = 0, smy = 0;
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  addEventListener('resize', resize);
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  new ResizeObserver(measure).observe(document.body);

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let time = 0, first = true;
  const frame = () => {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (document.hidden) return;
    aim();
    const k = snapped ? 1 - Math.exp(-dt * 3.2) : 1;
    snapped = true;
    curP.lerp(goalP, k); curT.lerp(goalT, k);
    const o = curO < 0 ? goalO : curO + (goalO - curO) * (1 - Math.exp(-dt * 6));
    if (Math.abs(o - curO) > 0.003) { curO = o; canvas.style.opacity = o.toFixed(3); }
    if (curO < 0.012 && !first) return;

    if (!reduce) time += dt;
    smx += (mx - smx) * (1 - Math.exp(-dt * 2.5)); smy += (my - smy) * (1 - Math.exp(-dt * 2.5));
    camera.position.set(curP.x + smx * 0.75, curP.y - smy * 0.4, curP.z);
    camera.lookAt(curT.x + smx * 0.15, curT.y, curT.z);

    ringB.rotation.y = 0.7 + time * 0.16; ringB.rotation.x = 0.22 + Math.sin(time * 0.21) * 0.12;
    ringC.rotation.y = -0.85 - time * 0.23; ringC.rotation.z = 0.1 + Math.sin(time * 0.17) * 0.2;
    ringD.rotation.x = 1.2 + time * 0.07; ringD.rotation.y = 0.2 + time * 0.11;
    world.rotation.y = smx * 0.06 + Math.sin(time * 0.1) * 0.025;
    beams.forEach((b) => { b.rotation.z = b.userData.base + Math.sin(time * 0.45 + b.userData.ph) * 0.11; b.rotation.x = 0.1 + Math.cos(time * 0.37 + b.userData.ph) * 0.07; });
    const ph = time / 3.6, idx = Math.floor(ph) % SCREEN.length, fr = ph % 1;
    if (idx !== shown) { shown = idx; screen.paint(idx); }
    screenMat.color.setScalar(0.15 + 1.25 * Math.min(1, fr / 0.07, (1 - fr) / 0.07));
    lamp.intensity = 9 + Math.sin(time * 3.1) * 0.6;
    dustMat.uniforms.uTime.value = time;

    if (composer) composer.render(dt); else renderer.render(scene, camera);
    if (first) { first = false; document.documentElement.classList.remove('no-webgl'); ready(); }
  };

  resize();
  frame();
}

try { init(); } catch (err) {
  console.error(err);
  fail();
}
