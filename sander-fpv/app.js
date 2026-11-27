import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const candleDisplayNum = (idx) => (idx === 4 ? 'Shamash' : (idx > 4 ? (9 - idx) : (8 - idx)));

const I18N = {
  fr: {
    dir: 'ltr',
    title: 'Simulation Casque VR — Première Personne',
    sub: 'Tenez le Shamash et allumez la hanoukkia · Cliquez sur chaque mèche',
    countLabel: 'Lumières :',
    igniteNext: '🔥 Allumer la mèche suivante',
    parkShamash: '🕯️ Reposer le Shamash',
    takeShamash: '🕯️ Reprendre le Shamash',
    reset: '↺ Rallumer (Reset)',
    maskOn: '🥽 Casque VR : ON',
    maskOff: '🖥️ Casque VR : OFF',
    audioOn: '🔊 Audio : ON',
    audioOff: '🔇 Audio : OFF',
    complete: '✨ 8/8 Lumières allumées !',
    hintWick: (n) => (n === 4 ? 'Cliquer pour allumer le Shamash' : `Cliquer pour allumer la bougie ${candleDisplayNum(n)}`),
    hintDreidel: 'Cliquer pour faire tourner la toupie',
    help: "Glisser ou bouger la souris pour regarder · WASD / Flèches pour s'approcher · Clic ou Espace pour allumer · Clic sur toupie pour tourner"
  },
  he: {
    dir: 'rtl',
    title: 'הדמיית משקפי VR — בגוף ראשון',
    sub: 'החזיקו את השמש והדליקו בעצמכם את החנוכייה · לחצו על כל פתילה',
    countLabel: 'נרות:',
    igniteNext: '🔥 הדלקת הפתילה הבאה',
    parkShamash: '🕯️ הנחת השמש',
    takeShamash: '🕯️ הרמת השמש',
    reset: '↺ איפוס',
    maskOn: '🥽 מצב משקפי VR: פעיל',
    maskOff: '🖥️ מצב משקפי VR: כבוי',
    audioOn: '🔊 שמע: פעיל',
    audioOff: '🔇 שמע: כבוי',
    complete: '✨ 8/8 נרות דולקים!',
    hintWick: (n) => (n === 4 ? 'לחצו להדלקת השמש' : `לחצו להדלקת נר ${candleDisplayNum(n)}`),
    hintDreidel: 'לחצו כדי לסובב את הסביבון',
    help: 'גרירת עכבר למבט 360° · חיצים / WASD לתנועה · לחיצה או מקש רווח להדלקה · לחיצה על הסביבון לסיבוב'
  }
};

let lang = 'fr';
const MENORAH_POS = new THREE.Vector3(0, 0, -1.90);
const TABLE_POS = new THREE.Vector3(0, 0, -1.78);

const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;

const vrBtnSlot = document.getElementById('vr-btn-slot');
const vrBtn = VRButton.createButton(renderer);
vrBtnSlot.appendChild(vrBtn);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060913);
scene.fog = new THREE.FogExp2(0x060913, 0.032);

const playerRig = new THREE.Group();
playerRig.position.set(0, 0, -0.78);
scene.add(playerRig);

const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.04, 50);
camera.position.set(0, 1.38, 0);
playerRig.add(camera);

let yaw = 0.0;
let pitch = -0.34;
function applyCameraRotation() {
  if (!renderer.xr.isPresenting) {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
}
applyCameraRotation();

// Lighting
const hemi = new THREE.HemisphereLight(0x88a8e6, 0x3b2a1a, 0.55);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0x7ca2ff, 1.35);
moonLight.position.set(0, 3.2, -5.6);
moonLight.target.position.set(0, 0.7, -1.7);
scene.add(moonLight, moonLight.target);

const chandelierLight = new THREE.PointLight(0xffb86b, 3.2, 11, 1.4);
chandelierLight.position.set(0, 3.15, -0.25);
scene.add(chandelierLight);

const backFill = new THREE.PointLight(0xffae5c, 2.2, 10, 1.5);
backFill.position.set(0, 2.5, 1.4);
scene.add(backFill);

const menorahGroupLight = new THREE.PointLight(0xff9b32, 0.0, 6.5, 1.5);
menorahGroupLight.position.set(0, 1.05, -1.85);
scene.add(menorahGroupLight);

// Textures & Room Construction
const texLoader = new THREE.TextureLoader();
function loadTex(file, repX = 1, repY = 1, srgb = true) {
  const t = texLoader.load(`assets/textures/${file}`);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildSalonRoom() {
  const stoneDiff = loadTex('sandstone_diff.jpg', 3.5, 2.0, true);
  const stoneNor = loadTex('sandstone_nor.jpg', 3.5, 2.0, false);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneDiff, normalMap: stoneNor, roughness: 0.88, metalness: 0.02, color: 0xead8be });
  const floorMat = new THREE.MeshStandardMaterial({ map: loadTex('floor_diff.jpg', 4, 4, true), roughness: 0.72, color: 0xe8d9c5 });
  const rugMat = new THREE.MeshStandardMaterial({ map: loadTex('persian_rug_pbr.jpg', 1, 1, true), roughness: 0.92 });
  const velvetMat = new THREE.MeshStandardMaterial({ color: 0x0b1633, roughness: 0.85, sheen: 0.65 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a23a, metalness: 0.92, roughness: 0.22 });
  const walnutMat = new THREE.MeshStandardMaterial({ map: loadTex('walnut_diff.jpg', 2, 1, true), roughness: 0.55 });

  // Floor & Rug
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.35, 3.35), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.006, -1.45);
  scene.add(rug);

  // Side & Back walls
  const addBox = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  addBox(8.2, 4.4, 0.35, 0, 2.2, 3.85, stoneMat);
  addBox(0.35, 3.2, 8.2, -3.85, 1.6, 0, stoneMat);
  addBox(0.35, 3.2, 8.2, 3.85, 1.6, 0, stoneMat);

  // Front wall framing arched window (z = -3.88)
  addBox(2.84, 4.4, 0.44, -2.60, 2.2, -3.88, stoneMat);
  addBox(2.84, 4.4, 0.44, 2.60, 2.2, -3.88, stoneMat);
  addBox(2.44, 0.88, 0.44, 0, 0.44, -3.88, stoneMat);
  addBox(2.60, 0.08, 0.54, 0, 0.90, -3.84, walnutMat);
  addBox(2.60, 1.15, 0.44, 0, 3.92, -3.88, stoneMat);

  // Radial arch voussoirs
  for (let k = 0; k < 15; k++) {
    const th = Math.PI * (k + 0.5) / 15.0;
    const vx = 1.22 * Math.cos(th);
    const vy = 2.22 + 1.22 * Math.sin(th);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.50), stoneMat);
    v.position.set(vx, vy, -3.86);
    v.rotation.z = th - Math.PI / 2;
    scene.add(v);
  }

  // Barrel vault ceiling
  const vault = new THREE.Mesh(
    new THREE.CylinderGeometry(3.88, 3.88, 8.0, 28, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ map: stoneDiff, normalMap: stoneNor, roughness: 0.9, side: THREE.BackSide, color: 0xe6d3b6 })
  );
  vault.rotation.x = Math.PI / 2;
  vault.rotation.z = Math.PI / 2;
  vault.scale.set(1.0, 1.0, 0.44);
  vault.position.set(0, 2.75, 0);
  scene.add(vault);

  // Velvet curtains + brass rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 3.1, 14), brassMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 3.50, -3.60);
  scene.add(rod);
  for (const bx of [-1.28, 1.28]) {
    for (let i = 0; i < 4; i++) {
      const dx = -0.14 + i * 0.09;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.075, 2.62, 12), velvetMat);
      c.position.set(bx + dx, 2.18, -3.60 - (i % 2) * 0.03);
      scene.add(c);
    }
  }

  // Night Jerusalem backdrop outside window
  const bdMat = new THREE.MeshBasicMaterial({ map: loadTex('jerusalem_night_backdrop.jpg', 1, 1, true) });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 9.0), bdMat);
  bd.position.set(0, 2.6, -10.2);
  scene.add(bd);

  // Oil painting on right wall
  const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.88, 1.18), brassMat);
  pFrame.position.set(3.64, 1.80, 0);
  scene.add(pFrame);
  const pCanvas = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 0.74),
    new THREE.MeshStandardMaterial({ map: loadTex('jerusalem_painting_oil.jpg', 1, 1, true), roughness: 0.45 })
  );
  pCanvas.rotation.y = -Math.PI / 2;
  pCanvas.position.set(3.61, 1.80, 0);
  scene.add(pCanvas);

  // Subtle floating warm embers
  const emberGeo = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 48; i++) {
    pos.push((Math.random() - 0.5) * 5.2, 0.7 + Math.random() * 2.2, -3.2 + Math.random() * 3.8);
  }
  emberGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffc663, size: 0.025, transparent: true, opacity: 0.65 }));
  scene.add(embers);
  return embers;
}

const embers = buildSalonRoom();

// Helper to create 3D realistic animated teardrop flame mesh
function createFlameGroup(withLight = false, scale = 1.0) {
  const g = new THREE.Group();
  const outerGeo = new THREE.ConeGeometry(0.011 * scale, 0.038 * scale, 12);
  outerGeo.translate(0, 0.017 * scale, 0);
  const outerMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.86 });
  const outer = new THREE.Mesh(outerGeo, outerMat);

  const coreGeo = new THREE.ConeGeometry(0.006 * scale, 0.024 * scale, 10);
  coreGeo.translate(0, 0.012 * scale, 0);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff5c0 });
  const core = new THREE.Mesh(coreGeo, coreMat);

  const blueGeo = new THREE.SphereGeometry(0.0055 * scale, 8, 8);
  blueGeo.translate(0, 0.003 * scale, 0);
  const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b7bff, transparent: true, opacity: 0.65 });
  const blue = new THREE.Mesh(blueGeo, blueMat);

  const glowSpriteMat = new THREE.SpriteMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Sprite(glowSpriteMat);
  glow.scale.set(0.09 * scale, 0.11 * scale, 1);
  glow.position.y = 0.018 * scale;

  g.add(outer, core, blue, glow);
  if (withLight) {
    const pt = new THREE.PointLight(0xff9c33, 0.85, 2.6, 1.8);
    pt.position.y = 0.025 * scale;
    g.add(pt);
    g.userData.light = pt;
  }
  g.userData.phase = Math.random() * Math.PI * 2;
  return g;
}

// Spark particle bursts upon lighting
const sparkBursts = [];
function spawnSparks(worldPos) {
  const count = 20;
  const geom = new THREE.BufferGeometry();
  const arr = new Float32Array(count * 3);
  const vels = [];
  for (let i = 0; i < count; i++) {
    arr[i * 3] = worldPos.x;
    arr[i * 3 + 1] = worldPos.y;
    arr[i * 3 + 2] = worldPos.z;
    vels.push(new THREE.Vector3((Math.random() - 0.5) * 0.35, 0.25 + Math.random() * 0.45, (Math.random() - 0.5) * 0.35));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffd275, size: 0.018, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geom, mat);
  scene.add(pts);
  sparkBursts.push({ pts, vels, life: 0, maxLife: 0.9 });
}

// Procedural soft candle-ignition audio + ambient toggle
let audioCtx = null;
const ambientAudio = new Audio('assets/audio/hanukkah_ambient.mp3');
ambientAudio.loop = true;
ambientAudio.volume = 0.45;
let audioEnabled = false;

function playIgniteSound() {
  if (!audioEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.14);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  } catch {}
}

// State for interactive Menorah, Dreidels & FPV Hand
const wicks = []; // { idx, worldPos, flame, halo, hitMesh, lit }
const dreidels = []; // { mesh, vel }
let manifest = null;
let handRoot = null;
let handFlame = null;
let handFlameWorld = new THREE.Vector3();
let handShamashLocalTip = new THREE.Vector3(-0.008, 0.197, -0.1281);
let shamashParked = false;
let shamashReachAnim = null; // { wickIdx, startTime, duration }
let pointerNDC = new THREE.Vector2(0, 0);
let raycaster = new THREE.Raycaster();
let hoveredWickIdx = null;
let hoveredDreidel = null;

// Progress Dots HUD
const dotsEl = document.getElementById('progress-dots');
const dotMap = new Map();
const DISPLAY_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function rebuildDots() {
  dotsEl.innerHTML = '';
  for (const idx of DISPLAY_ORDER) {
    const d = document.createElement('div');
    d.className = 'dot' + (idx === 4 ? ' shamash' : '');
    d.title = idx === 4 ? 'Shamash' : `Bougie #${idx}`;
    dotsEl.appendChild(d);
    dotMap.set(idx, d);
  }
}
rebuildDots();

function getLitRegularCount() {
  return wicks.filter((w) => w.idx !== 4 && w.lit).length;
}

function getNextSuggestedIdx() {
  const order = manifest ? manifest.ignite_order : [4, 8, 7, 6, 5, 3, 2, 1, 0];
  for (const idx of order) {
    const w = wicks.find((x) => x.idx === idx);
    if (w && !w.lit) return idx;
  }
  return null;
}

function updateProgressUI() {
  const count = getLitRegularCount();
  document.getElementById('ui-count').textContent = `${count} / 8`;
  for (const w of wicks) {
    const dot = dotMap.get(w.idx);
    if (dot) dot.classList.toggle('lit', w.lit);
  }
  menorahGroupLight.intensity = 0.35 + count * 0.55;
  const banner = document.getElementById('banner-complete');
  if (count === 8) {
    banner.textContent = I18N[lang].complete;
    banner.classList.add('visible');
  } else {
    banner.classList.remove('visible');
  }
}

function igniteWickImmediate(idx) {
  const w = wicks.find((x) => x.idx === idx);
  if (!w || w.lit) return false;
  w.lit = true;
  w.flame.visible = true;
  w.halo.visible = false;
  spawnSparks(w.worldPos);
  playIgniteSound();
  updateProgressUI();
  return true;
}

function triggerIgniteWick(idx) {
  const w = wicks.find((x) => x.idx === idx);
  if (!w || w.lit) return false;
  if (shamashParked) toggleShamashPark(false);
  shamashReachAnim = { wickIdx: idx, start: performance.now() / 1000, duration: 0.42, litTriggered: false };
  return true;
}

function resetAllWicks() {
  shamashReachAnim = null;
  for (const w of wicks) {
    w.lit = false;
    w.flame.visible = false;
    w.halo.visible = true;
  }
  updateProgressUI();
}

function toggleShamashPark(forceState = null) {
  shamashParked = forceState !== null ? forceState : !shamashParked;
  if (handRoot) {
    if (shamashParked) {
      camera.remove(handRoot);
      scene.add(handRoot);
      const ty = manifest ? manifest.table_top_y : 0.5429;
      handRoot.position.set(0.42, ty + 0.04, -1.42);
      handRoot.rotation.set(0, -0.4, 0);
    } else {
      scene.remove(handRoot);
      camera.add(handRoot);
      handRoot.position.set(0.22, -0.24, -0.44);
      handRoot.rotation.set(0.08, -0.18, 0.04);
    }
  }
  refreshLabels();
}

// Load Manifest & All V2 GLBs
async function initAssets() {
  const loaderEl = document.getElementById('loader');
  const loaderTxt = document.getElementById('loader-txt');
  const res = await fetch('assets/scene_manifest.json');
  manifest = await res.json();
  const ty = manifest.table_top_y || 0.5429;
  if (manifest.fpv_shamash_flame_local) {
    handShamashLocalTip.set(...manifest.fpv_shamash_flame_local);
  }

  const gltfLoader = new GLTFLoader();
  const loadGLB = (name) => new Promise((resolve, reject) => {
    gltfLoader.load(`assets/models/${name}`, resolve, undefined, reject);
  });

  loaderTxt.textContent = 'Chargement du mobilier et de la hanoukkia V2 PBR…';
  const [tblG, hanG, gobG, sufgG, drG, handG] = await Promise.all([
    loadGLB('table_v2.glb'),
    loadGLB('hanoukia_v2.glb'),
    loadGLB('goblets_v2.glb'),
    loadGLB('sufganiot_plate_v2.glb'),
    loadGLB('dreidel_v2.glb'),
    loadGLB('fpv_hand_shamash.glb'),
  ]);

  tblG.scene.position.copy(TABLE_POS);
  scene.add(tblG.scene);

  hanG.scene.position.set(MENORAH_POS.x, ty, MENORAH_POS.z);
  scene.add(hanG.scene);

  gobG.scene.position.set(-0.50, ty, -1.72);
  scene.add(gobG.scene);

  sufgG.scene.position.set(0.50, ty, -1.65);
  scene.add(sufgG.scene);

  for (const [dx, dz, rot] of [[-0.28, -1.44, 0.25], [0.02, -1.40, 0.85], [0.29, -1.45, 1.55]]) {
    const clone = drG.scene.clone();
    clone.position.set(dx, ty + 0.056, dz);
    clone.rotation.y = rot;
    scene.add(clone);
    dreidels.push({ mesh: clone, vel: 0.6 + Math.random() * 0.4 });
  }

  // Build interactive wicks & hit targets from exact manifest coordinates
  for (const [k, localArr] of Object.entries(manifest.wick_positions_local)) {
    const idx = parseInt(k, 10);
    const worldPos = new THREE.Vector3(
      MENORAH_POS.x + localArr[0],
      ty + localArr[1],
      MENORAH_POS.z + localArr[2]
    );
    const flame = createFlameGroup(idx === 4 || idx % 2 === 0, idx === 4 ? 1.15 : 1.0);
    flame.position.copy(worldPos);
    flame.visible = false;
    scene.add(flame);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.016, 0.024, 18),
      new THREE.MeshBasicMaterial({ color: 0xffd269, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    halo.position.copy(worldPos);
    halo.rotation.x = -Math.PI / 2;
    scene.add(halo);

    const hitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.046, 10, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.copy(worldPos);
    hitMesh.userData.wickIdx = idx;
    scene.add(hitMesh);

    wicks.push({ idx, worldPos, flame, halo, hitMesh, lit: false });
  }

  // FPV Right Hand holding lit Shamash
  handRoot = new THREE.Group();
  handRoot.add(handG.scene);
  handFlame = createFlameGroup(true, 1.25);
  handFlame.position.copy(handShamashLocalTip);
  handRoot.add(handFlame);

  handRoot.position.set(0.22, -0.24, -0.44);
  handRoot.rotation.set(0.08, -0.18, 0.04);
  camera.add(handRoot);

  // Start VR controller pairing for Pico 2 WebXR
  const ctrl0 = renderer.xr.getController(0);
  scene.add(ctrl0);
  renderer.xr.addEventListener('sessionstart', () => {
    document.getElementById('vr-mask').classList.add('hidden');
    if (handRoot && !shamashParked) {
      camera.remove(handRoot);
      ctrl0.add(handRoot);
      handRoot.position.set(0, -0.02, -0.04);
      handRoot.rotation.set(-0.35, 0, 0);
    }
  });
  renderer.xr.addEventListener('sessionend', () => {
    if (handRoot && !shamashParked) {
      ctrl0.remove(handRoot);
      camera.add(handRoot);
      handRoot.position.set(0.22, -0.24, -0.44);
      handRoot.rotation.set(0.08, -0.18, 0.04);
    }
  });

  updateProgressUI();
  loaderEl.classList.add('done');
  setTimeout(() => { loaderEl.style.display = 'none'; }, 450);
}

// Input Handling (Mouse Drag Look + Hover + Click Ignite / Dreidel Spin + WASD)
let isDragging = false;
let dragMoved = false;
let lastMouse = { x: 0, y: 0 };
const keys = new Set();

canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  dragMoved = false;
  lastMouse = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointermove', (e) => {
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  if (isDragging) {
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
    yaw -= dx * 0.0032;
    pitch = Math.max(-1.05, Math.min(0.85, pitch - dy * 0.0032));
    applyCameraRotation();
    lastMouse = { x: e.clientX, y: e.clientY };
  }
});

window.addEventListener('pointerup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  if (!dragMoved && e.target === canvas) {
    if (hoveredWickIdx !== null) {
      triggerIgniteWick(hoveredWickIdx);
    } else if (hoveredDreidel) {
      hoveredDreidel.vel = 24.0;
    }
  }
});

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') {
    e.preventDefault();
    if (hoveredWickIdx !== null) triggerIgniteWick(hoveredWickIdx);
    else {
      const next = getNextSuggestedIdx();
      if (next !== null) triggerIgniteWick(next);
    }
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Buttons
function refreshLabels() {
  const t = I18N[lang];
  document.documentElement.dir = t.dir;
  document.getElementById('ui-title').textContent = t.title;
  document.getElementById('ui-sub').textContent = t.sub;
  document.getElementById('ui-count-label').textContent = t.countLabel;
  document.getElementById('btn-ignite-next').textContent = t.igniteNext;
  document.getElementById('btn-shamash').textContent = shamashParked ? t.takeShamash : t.parkShamash;
  document.getElementById('btn-reset').textContent = t.reset;
  const maskOn = !document.getElementById('vr-mask').classList.contains('hidden');
  document.getElementById('btn-vr-mask').textContent = maskOn ? t.maskOn : t.maskOff;
  document.getElementById('btn-audio').textContent = audioEnabled ? t.audioOn : t.audioOff;
  document.getElementById('help-strip').textContent = t.help;
}

document.getElementById('btn-ignite-next').addEventListener('click', () => {
  const next = getNextSuggestedIdx();
  if (next !== null) triggerIgniteWick(next);
});
document.getElementById('btn-shamash').addEventListener('click', () => toggleShamashPark());
document.getElementById('btn-reset').addEventListener('click', () => resetAllWicks());
document.getElementById('btn-vr-mask').addEventListener('click', (e) => {
  document.getElementById('vr-mask').classList.toggle('hidden');
  e.currentTarget.classList.toggle('active');
  refreshLabels();
});
document.getElementById('btn-audio').addEventListener('click', (e) => {
  audioEnabled = !audioEnabled;
  e.currentTarget.classList.toggle('active', audioEnabled);
  if (audioEnabled) ambientAudio.play().catch(() => {});
  else ambientAudio.pause();
  refreshLabels();
});
document.getElementById('btn-lang').addEventListener('click', () => {
  lang = lang === 'fr' ? 'he' : 'fr';
  refreshLabels();
  updateProgressUI();
});

// Expose clean deterministic test/inspection API
window.__FPV_DEBUG__ = {
  getState: () => ({
    loaded: wicks.length === 9 && !!handRoot,
    litRegular: getLitRegularCount(),
    litMap: Object.fromEntries(wicks.map((w) => [w.idx, w.lit])),
    shamashParked,
    lang
  }),
  igniteIndex: (idx) => igniteWickImmediate(idx),
  triggerIgnite: (idx) => triggerIgniteWick(idx),
  igniteNext: () => {
    const nxt = getNextSuggestedIdx();
    return nxt !== null ? igniteWickImmediate(nxt) : false;
  },
  parkShamash: (b) => toggleShamashPark(b),
  reset: () => resetAllWicks()
};

// Render Loop
let prevT = performance.now() / 1000;
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - prevT);
  prevT = now;

  // WASD / Arrow gentle movement in front of table
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const speed = 1.15 * dt;
  if (keys.has('KeyW') || keys.has('ArrowUp')) playerRig.position.addScaledVector(fwd, speed);
  if (keys.has('KeyS') || keys.has('ArrowDown')) playerRig.position.addScaledVector(fwd, -speed);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) playerRig.position.addScaledVector(right, -speed);
  if (keys.has('KeyD') || keys.has('ArrowRight')) playerRig.position.addScaledVector(right, speed);
  playerRig.position.x = Math.max(-1.45, Math.min(1.45, playerRig.position.x));
  playerRig.position.z = Math.max(-1.25, Math.min(0.85, playerRig.position.z));

  // Hover raycast from cursor (or screen center in VR)
  const rcVec = renderer.xr.isPresenting ? new THREE.Vector2(0, 0) : pointerNDC;
  raycaster.setFromCamera(rcVec, camera);
  const hitMeshes = wicks.filter((w) => !w.lit).map((w) => w.hitMesh);
  const hits = raycaster.intersectObjects(hitMeshes, false);
  const reticle = document.getElementById('reticle');
  const hint = document.getElementById('hover-hint');

  hoveredDreidel = null;
  if (hits.length > 0) {
    hoveredWickIdx = hits[0].object.userData.wickIdx;
    reticle.classList.add('hot');
    hint.textContent = I18N[lang].hintWick(hoveredWickIdx);
    hint.classList.add('visible');
  } else {
    hoveredWickIdx = null;
    reticle.classList.remove('hot');
    const drHits = raycaster.intersectObjects(dreidels.map((d) => d.mesh), true);
    if (drHits.length > 0) {
      let obj = drHits[0].object;
      while (obj.parent && !dreidels.some((d) => d.mesh === obj)) obj = obj.parent;
      hoveredDreidel = dreidels.find((d) => d.mesh === obj) || null;
      hint.textContent = I18N[lang].hintDreidel;
      hint.classList.add('visible');
    } else {
      hint.classList.remove('visible');
    }
  }

  // Animate FPV hand: subtle breathing + reach toward hovered/ignited wick
  if (handRoot && !shamashParked && !renderer.xr.isPresenting) {
    const restLocal = new THREE.Vector3(0.22 + pointerNDC.x * 0.05, -0.24 + pointerNDC.y * 0.04 + Math.sin(now * 2.1) * 0.005, -0.44);
    if (shamashReachAnim) {
      const elapsed = now - shamashReachAnim.start;
      const p = Math.min(1.0, elapsed / shamashReachAnim.duration);
      const w = wicks.find((x) => x.idx === shamashReachAnim.wickIdx);
      if (w) {
        const targetWorldFlame = w.worldPos.clone().add(new THREE.Vector3(0, 0.01, 0.01));
        const targetCamFlame = camera.worldToLocal(targetWorldFlame.clone());
        const targetHandLocal = targetCamFlame.sub(handShamashLocalTip);
        const arc = Math.sin(p * Math.PI);
        handRoot.position.lerpVectors(restLocal, targetHandLocal, arc);
        if (p >= 0.48 && !shamashReachAnim.litTriggered) {
          shamashReachAnim.litTriggered = true;
          igniteWickImmediate(shamashReachAnim.wickIdx);
        }
      }
      if (p >= 1.0) shamashReachAnim = null;
    } else {
      handRoot.position.lerp(restLocal, 0.14);
    }
  }

  // Proximity auto-ignite in 6DoF WebXR
  if (handFlame && !shamashParked && renderer.xr.isPresenting) {
    handFlame.getWorldPosition(handFlameWorld);
    for (const w of wicks) {
      if (!w.lit && handFlameWorld.distanceTo(w.worldPos) < 0.085) {
        igniteWickImmediate(w.idx);
      }
    }
  }

  // Animate Flames + Next-Suggested Halo Pulse + Dreidels + Sparks + Embers
  const nextIdx = getNextSuggestedIdx();
  for (const w of wicks) {
    if (w.lit) {
      const ph = w.flame.userData.phase;
      const sy = 1.0 + 0.15 * Math.sin(now * 8.5 + ph);
      const sx = 1.0 + 0.09 * Math.cos(now * 6.3 + ph);
      w.flame.scale.set(sx, sy, sx);
      w.flame.rotation.z = 0.06 * Math.sin(now * 5.2 + ph);
      if (w.flame.userData.light) {
        w.flame.userData.light.intensity = 0.85 + 0.16 * Math.sin(now * 10.0 + ph);
      }
    } else {
      const isNext = w.idx === nextIdx;
      const pulse = isNext ? (0.55 + 0.40 * Math.sin(now * 4.5)) : 0.22;
      w.halo.material.opacity = pulse;
      const hs = isNext ? (1.1 + 0.18 * Math.sin(now * 4.5)) : 0.85;
      w.halo.scale.set(hs, hs, 1);
    }
  }

  if (handFlame && !shamashParked) {
    const sy = 1.0 + 0.14 * Math.sin(now * 9.0);
    handFlame.scale.set(1.0, sy, 1.0);
    if (handFlame.userData.light) {
      handFlame.userData.light.intensity = 1.15 + 0.22 * Math.sin(now * 11.0);
    }
  }

  for (const d of dreidels) {
    d.mesh.rotation.y += d.vel * dt;
    d.vel = Math.max(0.35, d.vel * (1 - 0.85 * dt));
  }

  for (let i = sparkBursts.length - 1; i >= 0; i--) {
    const b = sparkBursts[i];
    b.life += dt;
    const posAttr = b.pts.geometry.getAttribute('position');
    for (let k = 0; k < b.vels.length; k++) {
      const v = b.vels[k];
      v.y -= 0.45 * dt;
      posAttr.setXYZ(k, posAttr.getX(k) + v.x * dt, posAttr.getY(k) + v.y * dt, posAttr.getZ(k) + v.z * dt);
    }
    posAttr.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, 1.0 - b.life / b.maxLife);
    if (b.life >= b.maxLife) {
      scene.remove(b.pts);
      sparkBursts.splice(i, 1);
    }
  }

  embers.rotation.y += 0.015 * dt;
  renderer.render(scene, camera);
});

initAssets();
