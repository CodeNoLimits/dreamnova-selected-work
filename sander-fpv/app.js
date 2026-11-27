import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  NoiseEffect,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode,
  BlendFunction
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

const candleDisplayNum = (widx) => (widx === 4 ? 0 : widx < 4 ? 8 - widx : 9 - widx);

const I18N = {
  fr: {
    dir: 'ltr',
    title: 'Hanoukkia Cinéma 3D — Simulation VR Jérusalem',
    sub: 'Déplacez-vous en 3D (WASD / souris) · Regardez sous tous les angles',
    countLabel: 'Lumières :',
    modeScene: '🧑 Scène Personnage',
    modeSelf: '🕯️ Allumer moi-même',
    camFront: '👁️ Face',
    camLeft: '◀️ Côté gauche',
    camWindow: '🪟 Fenêtre',
    replay: '🎬 Rejouer',
    igniteNext: '🔥 Allumer',
    eatBtnIdle: '🍩 Soufganiya',
    eatBtnBite: (b) => `😋 Croquer (${b}/3)`,
    siddurClosed: '📖 Siddour',
    siddurOpen: '📖 Fermer / Tourner',
    maskOn: '🥽 Casque VR : ON',
    maskOff: '🖥️ Casque VR : OFF',
    audioOn: '🔊 Audio : ON',
    audioOff: '🔇 Audio : OFF',
    complete: '✨ 8/8 Lumières allumées !',
    hintWick: (n) => (n === 4 ? 'Cliquer pour allumer le Chamach' : `Cliquer pour allumer la lumière n°${candleDisplayNum(n)}`),
    hintDreidel: 'Cliquer pour faire tourner la toupie',
    hintPlate: 'Cliquer pour prendre et croquer une soufganiya',
    hintSiddur: (open) => (open ? 'Cliquer pour tourner la page du Siddour' : 'Cliquer pour ouvrir le Siddour'),
    help: "Glisser pour regarder 360° · WASD pour marcher · Toupie : clic · E : Soufganiya · B : Siddour · H : masquer/afficher l'interface"
  },
  he: {
    dir: 'rtl',
    title: 'חוויית הדלקת חנוכייה בתלת-ממד — הדמיית VR בירושלים',
    sub: 'תנועה חופשית בחדר (WASD / עכבר) · צפייה מכל זווית',
    countLabel: 'נרות:',
    modeScene: '🧑 הדגמה עם דמות',
    modeSelf: '🕯️ הדלקה עצמאית',
    camFront: '👁️ מבט קדמי',
    camLeft: '◀️ מבט מצד שמאל',
    camWindow: '🪟 ליד החלון',
    replay: '🎬 הפעלה מחדש',
    igniteNext: '🔥 הדלקת הנר הבא',
    eatBtnIdle: '🍩 סופגנייה',
    eatBtnBite: (b) => `😋 ביס (${b}/3)`,
    siddurClosed: '📖 סידור',
    siddurOpen: '📖 דפדוף / סגירה',
    maskOn: '🥽 מצב משקפי VR: פעיל',
    maskOff: '🖥️ מצב משקפי VR: כבוי',
    audioOn: '🔊 שמע: פעיל',
    audioOff: '🔇 שמע: כבוי',
    complete: '✨ 8/8 נרות דולקים!',
    hintWick: (n) => (n === 4 ? 'לחצו להדלקת השמש' : `לחצו להדלקת נר ${candleDisplayNum(n)}`),
    hintDreidel: 'לחצו כדי לסובב את הסביבון',
    hintPlate: 'לחצו כדי לקחת ולאכול סופגנייה',
    hintSiddur: (open) => (open ? 'לחצו כדי להפוך דף בסידור' : 'לחצו כדי לפתוח את הסידור'),
    help: 'גרירת עכבר למבט 360° · חיצים / WASD להליכה · לחיצה על הסביבון לסיבוב · מקש E לסופגנייה · מקש B לסידור · מקש H להסתרת התפריט'
  }
};

let lang = 'fr';
let playMode = 'character';
let manifest = null;
let tableTopY = 0.5429;

// Renderer (AgX handled inside pmndrs EffectPass for desktop; native AgX in WebXR)
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;

document.getElementById('vr-btn-slot').appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050812);
scene.fog = new THREE.FogExp2(0x060a16, 0.017);

// Rig & Smooth Cinema Camera (Desktop FPS + WebXR 6DoF)
const playerRig = new THREE.Group();
playerRig.position.set(0, 0, -0.78);
scene.add(playerRig);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.04, 65);
camera.position.set(0, 1.40, 0);
playerRig.add(camera);

let yaw = 0.0;
let pitch = -0.24;
let camTween = null;

function applyCameraRotation() {
  if (!renderer.xr.isPresenting) {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
}
applyCameraRotation();

// Cinema Postprocessing Pipeline: RenderPass -> Denoised N8AO -> Soft Bloom + Vignette + AgX
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

let n8aoPass = null;
try {
  n8aoPass = new N8AOPostPass(scene, camera, window.innerWidth, window.innerHeight);
  n8aoPass.configuration.aoRadius = 0.44;
  n8aoPass.configuration.distanceFalloff = 0.85;
  n8aoPass.configuration.intensity = 1.40;
  n8aoPass.configuration.aoSamples = 16;
  n8aoPass.configuration.denoiseSamples = 8;
  n8aoPass.configuration.denoiseRadius = 12;
  n8aoPass.configuration.halfRes = false;
  composer.addPass(n8aoPass);
} catch (err) {
  console.warn('N8AO disabled gracefully:', err);
}

const bloomEffect = new BloomEffect({
  blendFunction: BlendFunction.ADD,
  mipmapBlur: true,
  luminanceThreshold: 0.92,
  luminanceSmoothing: 0.25,
  intensity: 0.26
});
const vignetteEffect = new VignetteEffect({
  eskil: false,
  offset: 0.34,
  darkness: 0.48
});
const toneMappingEffect = new ToneMappingEffect({
  mode: ToneMappingMode.AGX
});

const cinematicPass = new EffectPass(camera, bloomEffect, vignetteEffect, toneMappingEffect);
composer.addPass(cinematicPass);

// HDRI Environment IBL
const pmremGen = new THREE.PMREMGenerator(renderer);
pmremGen.compileEquirectangularShader();
new RGBELoader().load(
  'assets/textures/night_env.hdr',
  (hdrTex) => {
    const envRT = pmremGen.fromEquirectangular(hdrTex);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.36;
    hdrTex.dispose();
    pmremGen.dispose();
  },
  undefined,
  () => { pmremGen.dispose(); }
);

// Cinema Lighting Complementing Cycles Lightmap GI (rich contrast, warm Menorah vs sapphire night)
const hemi = new THREE.HemisphereLight(0x7ca6eb, 0x2c1c0f, 0.22);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0x84afff, 0.92);
moonLight.position.set(0.6, 3.8, -6.5);
moonLight.target.position.set(0, 0.8, -1.7);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 14;
moonLight.shadow.camera.left = -3.8;
moonLight.shadow.camera.right = 3.8;
moonLight.shadow.camera.top = 3.8;
moonLight.shadow.camera.bottom = -1.5;
moonLight.shadow.bias = -0.0005;
scene.add(moonLight, moonLight.target);

const chandelierLight = new THREE.PointLight(0xffb868, 1.75, 11, 1.5);
chandelierLight.position.set(0, 3.15, -0.25);
chandelierLight.castShadow = true;
chandelierLight.shadow.mapSize.set(512, 512);
chandelierLight.shadow.bias = -0.001;
scene.add(chandelierLight);

const personKeyLight = new THREE.SpotLight(0xffca84, 2.1, 8, Math.PI / 4, 0.55, 1.4);
personKeyLight.position.set(0.85, 2.35, -1.15);
personKeyLight.target.position.set(0.24, 1.35, -2.30);
personKeyLight.castShadow = true;
personKeyLight.shadow.mapSize.set(512, 512);
scene.add(personKeyLight, personKeyLight.target);

const balconyLanternLight = new THREE.PointLight(0xffb55c, 2.2, 7.5, 1.6);
balconyLanternLight.position.set(1.35, 2.55, -4.85);
scene.add(balconyLanternLight);

const siddurSpotLight = new THREE.SpotLight(0xffe0a8, 0.45, 3.0, Math.PI / 5, 0.70, 1.3);
siddurSpotLight.position.set(-0.46, 1.45, -1.35);
siddurSpotLight.target.position.set(-0.46, 0.56, -1.68);
scene.add(siddurSpotLight, siddurSpotLight.target);

// Procedural Glow & Beam Textures (zero square corners)
function createRadialGlowTexture(rgbInner = '255,244,195', rgbMid = '255,165,55') {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0.0, `rgba(${rgbInner},0.96)`);
  g.addColorStop(0.35, `rgba(${rgbMid},0.42)`);
  g.addColorStop(1.0, `rgba(${rgbMid},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const GLOW_TEX = createRadialGlowTexture();
const SUGAR_TEX = createRadialGlowTexture('255,255,255', '250,245,238');

function createVolumetricMoonShafts() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  const gx = ctx.createLinearGradient(0, 0, 128, 0);
  gx.addColorStop(0, 'rgba(130,175,255,0)');
  gx.addColorStop(0.5, 'rgba(135,180,255,0.45)');
  gx.addColorStop(1, 'rgba(130,175,255,0)');
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, 128, 256);
  const gy = ctx.createLinearGradient(0, 0, 0, 256);
  gy.addColorStop(0, 'rgba(255,255,255,0.95)');
  gy.addColorStop(0.75, 'rgba(255,255,255,0.22)');
  gy.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, 128, 256);
  const beamTex = new THREE.CanvasTexture(c);
  beamTex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({
    map: beamTex,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const shafts = new THREE.Group();
  for (const [bx, rotZ] of [[-0.25, -0.05], [0.22, 0.04]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 4.4), mat);
    p.position.set(bx, 1.55, -2.55);
    p.rotation.set(-0.62, 0, rotZ);
    shafts.add(p);
  }
  scene.add(shafts);
}
createVolumetricMoonShafts();

// Floating Dust Motes in Moonbeams
const emberGeo = new THREE.BufferGeometry();
const epos = [];
for (let i = 0; i < 75; i++) {
  epos.push((Math.random() - 0.5) * 4.8, 0.65 + Math.random() * 2.3, -3.6 + Math.random() * 4.2);
}
emberGeo.setAttribute('position', new THREE.Float32BufferAttribute(epos, 3));
const embers = new THREE.Points(
  emberGeo,
  new THREE.PointsMaterial({
    map: GLOW_TEX,
    color: 0xffd58a,
    size: 0.036,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
scene.add(embers);

// Flame Builder & Particle Bursts (Sparks + Powdered Sugar Crumbs)
function createFlameGroup(withLight = false, scale = 1.0) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.013 * scale, 0.046 * scale, 12),
    new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.90 })
  );
  outer.position.y = 0.023 * scale;
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.0065 * scale, 0.026 * scale, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff8dc })
  );
  core.position.y = 0.017 * scale;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: GLOW_TEX,
      color: 0xffb84d,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  sprite.scale.set(0.11 * scale, 0.14 * scale, 1);
  sprite.position.y = 0.024 * scale;
  g.add(outer, core, sprite);
  if (withLight) {
    const pt = new THREE.PointLight(0xffa438, 1.05 * scale, 3.0, 2.0);
    pt.position.set(0, 0.032 * scale, 0);
    g.add(pt);
    g.userData.light = pt;
  }
  g.userData.phase = Math.random() * 6.28;
  return g;
}

const sparkBursts = [];
function spawnBurst(worldPos, tex, count, spread, upVel, size, color) {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const vels = [];
  for (let i = 0; i < count; i++) {
    pos.push(worldPos.x, worldPos.y, worldPos.z);
    vels.push(new THREE.Vector3((Math.random() - 0.5) * spread, upVel * (0.4 + Math.random()), (Math.random() - 0.5) * spread));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: tex,
      color,
      size,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: tex === GLOW_TEX ? THREE.AdditiveBlending : THREE.NormalBlending
    })
  );
  scene.add(pts);
  sparkBursts.push({ pts, vels, life: 0, maxLife: 0.85 });
}

function clearSparkBursts() {
  for (let i = sparkBursts.length - 1; i >= 0; i--) {
    scene.remove(sparkBursts[i].pts);
  }
  sparkBursts.length = 0;
}

// Sound Engine (Ambience + Foley SFX)
let audioEnabled = false;
let userExplicitlyMuted = false;

const ambientAudio = new Audio('assets/audio/ambient_cinema_jerusalem.mp3');
ambientAudio.loop = true;
ambientAudio.volume = 0.28;

const SFX_POOL = {};
function loadSfx(name, file, vol = 0.55) {
  const a = new Audio(`assets/audio/${file}`);
  a.preload = 'auto';
  a.volume = vol;
  SFX_POOL[name] = a;
}
loadSfx('ignite', 'sfx_ignite.mp3', 0.52);
loadSfx('bite1', 'sfx_bite_1.mp3', 0.65);
loadSfx('bite2', 'sfx_bite_2.mp3', 0.65);
loadSfx('bite3', 'sfx_bite_3.mp3', 0.68);
loadSfx('bookOpen', 'sfx_book_open.mp3', 0.58);
loadSfx('pageTurn', 'sfx_page_turn.mp3', 0.56);
loadSfx('dreidel', 'sfx_dreidel_spin.mp3', 0.48);

function ensureAudioOnUserAction() {
  if (userExplicitlyMuted) return;
  if (!audioEnabled) {
    audioEnabled = true;
    document.getElementById('btn-audio').classList.add('active');
    refreshLabels();
    ambientAudio.play().catch(() => {});
  }
}

function playSfx(name) {
  if (!audioEnabled) return;
  const base = SFX_POOL[name];
  if (!base) return;
  try {
    const inst = base.cloneNode();
    inst.volume = base.volume;
    inst.play().catch(() => {});
  } catch {}
}

// Scene Anchors & Interactive State
const TABLE_POS = new THREE.Vector3(0, 0, -1.90);
const MENORAH_REST_POS = new THREE.Vector3(0, 0.5429, -1.90);
const MENORAH_WINDOW_POS = new THREE.Vector3(0, 0.94, -3.78);
let menorahGroup = null;
const wicks = [];
const dreidels = [];

// Anatomical Real Human FPV Hand + Swappable Held Props (Chamach OR 3-bite Sufganiya)
let handRoot = null;
let handChamashGroup = null;
let handFlame = null;
let handShamashLocalTip = new THREE.Vector3(0, 0.1893, -0.0912);
let handSufganiyaGroup = null;
const sufganiyaBiteMeshes = [];

let eatingState = { active: false, bitesTaken: 0, shakeT: 0 };

// Openable Leather 3D Siddour
let siddurRoot = null;
let siddurCoverPivot = null;
let siddurFlipPivot = null;
let siddurTargetOpen = false;
let siddurOpenAnim = 0.0; // 0 = closed, 1 = open (-3.00 rad)
let siddurFlipping = false;
let siddurFlipAnim = 0.0;

// Rigged Human Host (person_v4)
let personScene = null;
let personBones = {};
let personBoneRest = {};
let personBoneCharRestWorld = {};
let personIgniteCandle = null;
let personIgniteFlame = null;
let sceneTime = 0;

let plateRoot = null;
let shamashReachAnim = null;
let pointerNDC = new THREE.Vector2(0, 0);
let raycaster = new THREE.Raycaster();
let hoverTarget = null; // { kind: 'wick'|'dreidel'|'plate'|'siddur', idx?: number, obj?: any }

// Progress Dots
const dotsEl = document.getElementById('progress-dots');
const dotMap = new Map();
for (const idx of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
  const d = document.createElement('div');
  d.className = 'dot' + (idx === 4 ? ' shamash' : '');
  dotsEl.appendChild(d);
  dotMap.set(idx, d);
}

function getLitRegularCount() {
  return wicks.filter((w) => w.idx !== 4 && w.lit).length;
}

function getNextSuggestedIdx() {
  const order = manifest?.ignite_order || [4, 8, 7, 6, 5, 3, 2, 1, 0];
  for (const idx of order) {
    const w = wicks.find((x) => x.idx === idx);
    if (w && !w.lit) return idx;
  }
  return null;
}

function updateProgressUI() {
  const lit = getLitRegularCount();
  document.getElementById('ui-count').textContent = `${lit} / 8`;
  for (const w of wicks) {
    const dot = dotMap.get(w.idx);
    if (dot) dot.classList.toggle('lit', w.lit);
  }
  const done = lit === 8;
  document.getElementById('banner-complete').classList.toggle('show', done);
}

function igniteWickImmediate(idx, withSound = true) {
  const w = wicks.find((x) => x.idx === idx);
  if (!w || w.lit) return false;
  w.lit = true;
  w.flame.visible = true;
  w.halo.visible = false;
  const wp = new THREE.Vector3();
  w.flame.getWorldPosition(wp);
  spawnBurst(wp, GLOW_TEX, 26, 0.36, 0.35, 0.028, 0xffcc66);
  if (withSound) playSfx('ignite');
  updateProgressUI();
  return true;
}

function resetAllWicks() {
  shamashReachAnim = null;
  clearSparkBursts();
  for (const w of wicks) {
    w.lit = false;
    w.flame.visible = false;
    w.halo.visible = (playMode === 'self');
  }
  if (menorahGroup) {
    menorahGroup.position.copy(MENORAH_REST_POS);
    menorahGroup.rotation.set(0, 0, 0);
  }
  updateProgressUI();
}

function syncHandVisibility() {
  if (!handRoot) return;
  const showHand = (playMode === 'self') || eatingState.active;
  handRoot.visible = showHand;
  if (handChamashGroup) handChamashGroup.visible = (playMode === 'self' && !eatingState.active);
  if (handSufganiyaGroup) handSufganiyaGroup.visible = eatingState.active;
  for (let i = 0; i < 3; i++) {
    if (sufganiyaBiteMeshes[i]) sufganiyaBiteMeshes[i].visible = (i === eatingState.bitesTaken);
  }
}

function setPlayMode(mode) {
  playMode = mode;
  document.getElementById('btn-mode-scene').classList.toggle('active', mode === 'character');
  document.getElementById('btn-mode-self').classList.toggle('active', mode === 'self');
  document.getElementById('btn-replay').style.display = mode === 'character' ? '' : 'none';
  document.getElementById('btn-ignite-next').style.display = mode === 'self' ? '' : 'none';

  if (personScene) {
    personScene.visible = (mode === 'character');
    personScene.position.set(0.24, 0, -2.30);
    personScene.rotation.set(0, 0, 0);
  }
  syncHandVisibility();
  resetAllWicks();
  if (mode === 'character') sceneTime = 0;
}

function setCameraView(preset, smooth = true) {
  if (renderer.xr.isPresenting) return;
  let tx = 0, tz = -0.78, tyaw = 0, tpitch = -0.24;
  if (preset === 'front') {
    tx = 0; tz = -0.78; tyaw = 0.0; tpitch = -0.24;
  } else if (preset === 'left') {
    tx = -1.55; tz = -1.75; tyaw = -1.18; tpitch = -0.20;
  } else if (preset === 'window') {
    tx = -0.92; tz = -2.65; tyaw = -0.62; tpitch = -0.14;
  } else if (preset === 'siddur') {
    tx = -0.45; tz = -1.28; tyaw = 0.02; tpitch = -0.96;
  }
  if (!smooth) {
    camTween = null;
    playerRig.position.set(tx, 0, tz);
    yaw = tyaw; pitch = tpitch;
    applyCameraRotation();
  } else {
    camTween = { x: tx, z: tz, yaw: tyaw, pitch: tpitch };
  }
}

function poseBoneChar(name, rx, ry, rz) {
  const b = personBones[name];
  const rest = personBoneRest[name];
  const restW = personBoneCharRestWorld[name];
  if (!b || !rest || !restW) return;
  const qChar = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  const qOff = restW.clone().invert().multiply(qChar).multiply(restW);
  b.quaternion.copy(rest).multiply(qOff);
}

function poseBoneLocal(name, rx, ry, rz) {
  const b = personBones[name];
  const rest = personBoneRest[name];
  if (!b || !rest) return;
  const qOff = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  b.quaternion.copy(rest).multiply(qOff);
}

// Interactive Eating Action (Sufganiya 3-bite cycle with Foley SFX & sugar crumbs)
function triggerSufganiyaAction() {
  ensureAudioOnUserAction();
  if (!eatingState.active) {
    eatingState.active = true;
    eatingState.bitesTaken = 0;
    eatingState.shakeT = 0.15;
    syncHandVisibility();
    refreshLabels();
    return;
  }
  eatingState.bitesTaken += 1;
  eatingState.shakeT = 0.28;
  playSfx(`bite${Math.min(3, eatingState.bitesTaken)}`);

  if (handSufganiyaGroup) {
    const wp = new THREE.Vector3();
    handSufganiyaGroup.getWorldPosition(wp);
    spawnBurst(wp, SUGAR_TEX, 22, 0.28, 0.08, 0.016, 0xfff8f0);
  }

  if (eatingState.bitesTaken >= 3) {
    eatingState.active = false;
    eatingState.bitesTaken = 0;
  }
  syncHandVisibility();
  refreshLabels();
}

// Interactive Leather 3D Siddour (Open / Flip Page / Close with Foley SFX)
function openSiddur(moveCamera = true) {
  ensureAudioOnUserAction();
  if (!siddurTargetOpen) {
    siddurTargetOpen = true;
    playSfx('bookOpen');
    if (moveCamera) setCameraView('siddur', true);
    refreshLabels();
  }
}

function flipSiddurPage() {
  ensureAudioOnUserAction();
  if (!siddurTargetOpen) {
    openSiddur(true);
    return;
  }
  if (!siddurFlipping) {
    siddurFlipping = true;
    siddurFlipAnim = 0.0;
    playSfx('pageTurn');
  }
}

function closeSiddur() {
  if (siddurTargetOpen) {
    siddurTargetOpen = false;
    siddurFlipping = false;
    siddurFlipAnim = 0.0;
    playSfx('bookOpen');
    setCameraView('front', true);
    refreshLabels();
  }
}

function toggleOrFlipSiddur() {
  ensureAudioOnUserAction();
  if (!siddurTargetOpen) openSiddur(true);
  else flipSiddurPage();
}

// Load Cinema Manifest, Cycles Lightmap & All GLBs
async function initAssets() {
  const loaderEl = document.getElementById('loader');
  const loaderTxt = document.getElementById('loader-txt');
  const ASSET_VER = '20261127f';
  const res = await fetch(`assets/scene_manifest.json?v=${ASSET_VER}`);
  manifest = await res.json();
  tableTopY = manifest.table_top_y || 0.5429;
  MENORAH_REST_POS.y = tableTopY;
  if (manifest.fpv_shamash_flame_local) handShamashLocalTip.set(...manifest.fpv_shamash_flame_local);

  const texLoader = new THREE.TextureLoader();
  const loadLightmap = new Promise((resolve) => {
    texLoader.load(`assets/textures/lightmap_salon.jpg?v=${ASSET_VER}`, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false;
      t.channel = 1;
      resolve(t);
    }, undefined, () => resolve(null));
  });

  const gltfLoader = new GLTFLoader();
  const loadGLB = (name) => new Promise((resolve, reject) => gltfLoader.load(`assets/models/${name}?v=${ASSET_VER}`, resolve, undefined, reject));

  loaderTxt.textContent = 'Chargement salon Cycles GI, Jérusalem 3D, Siddour & main réaliste…';
  const [
    lightMapTex,
    salonG, jerExtG, tblG, hanG, gobG, plateG, drG,
    armG, conG, chanG, siddurG, handG, chamG,
    sb0, sb1, sb2, persG
  ] = await Promise.all([
    loadLightmap,
    loadGLB('salon_arch_baked.glb'),
    loadGLB('jerusalem_3d_exterior.glb'),
    loadGLB('table_v2.glb'),
    loadGLB('hanoukia_v2.glb'),
    loadGLB('goblets_v2.glb'),
    loadGLB('sufganiot_plate_v4.glb'),
    loadGLB('dreidel_v2.glb'),
    loadGLB('armchair_v2.glb'),
    loadGLB('console_v2.glb'),
    loadGLB('chandelier_v2.glb'),
    loadGLB('siddur_3d.glb'),
    loadGLB('fpv_hand_real.glb'),
    loadGLB('fpv_chamash_prop.glb'),
    loadGLB('sufganiya_bite0.glb'),
    loadGLB('sufganiya_bite1.glb'),
    loadGLB('sufganiya_bite2.glb'),
    loadGLB('person_v4.glb')
  ]);

  const enableShadows = (root, cast = true) => {
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = cast;
        o.receiveShadow = true;
      }
    });
  };

  // Apply Cycles Metal Baked Global Illumination Lightmap (TEXCOORD_1) onto salon architecture!
  salonG.scene.traverse((o) => {
    if (o.isMesh) {
      const isGlass = o.name.includes('Glass');
      o.receiveShadow = !isGlass;
      o.castShadow = !isGlass && !o.name.includes('Floor') && !o.name.includes('Rug');
      if (isGlass && o.material) {
        o.material.transparent = true;
        o.material.opacity = 0.14;
        o.material.depthWrite = false;
      } else if (lightMapTex && o.geometry?.attributes?.uv1 && o.material && !o.name.includes('fancy_picture_frame')) {
        o.material.lightMap = lightMapTex;
        o.material.lightMapIntensity = 0.42;
        o.material.needsUpdate = true;
      }
    }
  });
  scene.add(salonG.scene);

  // Authentic 3D Old City of Jerusalem Exterior with feathered night sky horizon edge
  const hc = document.createElement('canvas');
  hc.width = 256; hc.height = 256;
  const hctx = hc.getContext('2d');
  hctx.fillStyle = 'white';
  hctx.fillRect(0, 0, 256, 256);
  const tg = hctx.createLinearGradient(0, 0, 0, 256);
  tg.addColorStop(0.0, 'black');
  tg.addColorStop(0.22, 'white');
  tg.addColorStop(1.0, 'white');
  hctx.globalCompositeOperation = 'multiply';
  hctx.fillStyle = tg;
  hctx.fillRect(0, 0, 256, 256);
  const horizonAlphaTex = new THREE.CanvasTexture(hc);

  jerExtG.scene.traverse((o) => {
    if (o.isMesh) {
      o.receiveShadow = true;
      o.castShadow = o.name.startsWith('Balcony_');
      if (o.name.includes('glass') && o.material) {
        o.material.emissive = new THREE.Color(0xffb55c);
        o.material.emissiveIntensity = 1.6;
      }
      if (o.name.includes('Horizon') && o.material) {
        o.material.transparent = true;
        o.material.alphaMap = horizonAlphaTex;
        o.material.depthWrite = false;
        o.material.needsUpdate = true;
      }
    }
  });
  scene.add(jerExtG.scene);

  // Table & Hanoukia (wrapped inside menorahGroup)
  tblG.scene.position.copy(TABLE_POS);
  enableShadows(tblG.scene);
  scene.add(tblG.scene);

  menorahGroup = new THREE.Group();
  menorahGroup.position.copy(MENORAH_REST_POS);
  enableShadows(hanG.scene);
  hanG.scene.traverse((o) => {
    if (o.isMesh && o.material) {
      if (o.material.name.includes('Silver')) { o.material.metalness = 0.96; o.material.roughness = 0.14; }
      if (o.material.name.includes('Crystal')) { o.material.transparent = true; o.material.opacity = 0.38; o.material.roughness = 0.05; }
    }
  });
  menorahGroup.add(hanG.scene);
  scene.add(menorahGroup);

  // Kiddush Goblets
  gobG.scene.position.set(-0.56, tableTopY, -1.96);
  gobG.scene.rotation.y = 0.45;
  enableShadows(gobG.scene);
  scene.add(gobG.scene);

  // CC0 Carved Plate + 3 Powdered-Sugar Sufganiyot (clickable!)
  plateRoot = plateG.scene;
  const pp = manifest.plate_table_pos || [0.54, tableTopY, -1.78];
  plateRoot.position.set(pp[0], pp[1], pp[2]);
  enableShadows(plateRoot);
  plateRoot.traverse((o) => { if (o.isMesh) o.userData.interactiveKind = 'plate'; });
  scene.add(plateRoot);

  // Grounded Spinning Dreidels (clear of the open Siddur pages)
  for (const [dx, dz, rot] of [[-0.78, -1.60, 0.3], [-0.72, -1.78, 1.1], [0.36, -1.56, 2.2]]) {
    const clone = drG.scene.clone(true);
    clone.position.set(dx, tableTopY, dz);
    clone.rotation.y = rot;
    enableShadows(clone);
    clone.traverse((o) => { if (o.isMesh) o.userData.dreidelIdx = dreidels.length; });
    scene.add(clone);
    dreidels.push({ mesh: clone, vel: 0.45 + Math.random() * 0.4 });
  }

  // Openable Burgundy Leather 3D Siddour on Table
  siddurRoot = siddurG.scene;
  const sp = manifest.siddur_table_pos || [-0.46, tableTopY, -1.68];
  siddurRoot.position.set(sp[0], sp[1], sp[2]);
  siddurRoot.rotation.y = 0.18;
  enableShadows(siddurRoot);
  siddurRoot.traverse((o) => {
    if (o.name === 'Siddur_FrontCoverPivot') siddurCoverPivot = o;
    if (o.name === 'Siddur_FlipPagePivot') siddurFlipPivot = o;
    if (o.isMesh) {
      o.userData.interactiveKind = 'siddur';
      if (o.material) o.material.side = THREE.DoubleSide;
    }
  });
  scene.add(siddurRoot);

  // Photogrammetric Salon Furniture
  armG.scene.position.set(-2.35, 0, -2.55);
  armG.scene.rotation.y = 0.65;
  enableShadows(armG.scene);
  scene.add(armG.scene);

  const armR = armG.scene.clone(true);
  armR.position.set(2.35, 0, -2.55);
  armR.rotation.y = -0.65;
  enableShadows(armR);
  scene.add(armR);

  conG.scene.position.set(3.40, 0, 0.0);
  conG.scene.rotation.y = -Math.PI / 2;
  enableShadows(conG.scene);
  scene.add(conG.scene);

  chanG.scene.position.set(0, 3.60, -0.25);
  enableShadows(chanG.scene);
  scene.add(chanG.scene);

  // Wicks parented INSIDE menorahGroup
  const wickMap = manifest.wick_positions_local || {};
  for (let idx = 0; idx < 9; idx++) {
    const pos = wickMap[String(idx)] || [(idx - 4) * 0.07, idx === 4 ? 0.471 : 0.391, idx === 4 ? 0.042 : 0];
    const flame = createFlameGroup(idx === 4 || idx % 2 === 0, idx === 4 ? 1.2 : 1.0);
    flame.position.set(pos[0], pos[1], pos[2]);
    flame.visible = false;
    menorahGroup.add(flame);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: GLOW_TEX,
        color: idx === 4 ? 0xffdf78 : 0xffaa38,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    halo.position.set(pos[0], pos[1] + 0.015, pos[2]);
    halo.scale.set(0.08, 0.08, 1);
    halo.visible = false;
    menorahGroup.add(halo);

    const hitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 10, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(pos[0], pos[1] + 0.012, pos[2]);
    hitMesh.userData.wickIdx = idx;
    menorahGroup.add(hitMesh);

    wicks.push({ idx, localPos: new THREE.Vector3(...pos), flame, halo, hitMesh, lit: false });
  }

  // Rigged Realistic Human Host (person_v4)
  personScene = persG.scene;
  personScene.position.set(0, 0, 0);
  personScene.rotation.set(0, 0, 0);
  enableShadows(personScene);
  scene.add(personScene);
  personScene.updateMatrixWorld(true);
  personScene.traverse((o) => {
    if (o.isBone) {
      personBones[o.name] = o;
      personBoneRest[o.name] = o.quaternion.clone();
      personBoneCharRestWorld[o.name] = o.getWorldQuaternion(new THREE.Quaternion());
    }
  });
  personScene.position.set(0.24, 0, -2.30);

  if (personBones.RightHand) {
    personIgniteCandle = new THREE.Group();
    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.009, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf4cc6c, roughness: 0.35 })
    );
    wax.position.set(0, 0.08, 0);
    personIgniteCandle.add(wax);
    personIgniteFlame = createFlameGroup(true, 1.1);
    personIgniteFlame.position.set(0, 0.165, 0);
    personIgniteCandle.add(personIgniteFlame);
    personIgniteCandle.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0.36, 0.86, 0.08).normalize()
    );
    personIgniteCandle.position.set(0.015, 0.045, 0.015);
    personBones.RightHand.add(personIgniteCandle);
  }

  // Real Anatomical Human FPV Hand + Swappable Shamash / 3-Bite Sufganiyot
  handRoot = new THREE.Group();
  enableShadows(handG.scene, false);
  handRoot.add(handG.scene);

  handChamashGroup = new THREE.Group();
  handChamashGroup.add(chamG.scene);
  handFlame = createFlameGroup(true, 1.15);
  handFlame.position.copy(handShamashLocalTip);
  handChamashGroup.add(handFlame);
  handRoot.add(handChamashGroup);

  handSufganiyaGroup = new THREE.Group();
  handSufganiyaGroup.position.set(0.005, 0.018, -0.028);
  handSufganiyaGroup.rotation.set(0.32, -0.35, 0.1);
  for (const sg of [sb0, sb1, sb2]) {
    enableShadows(sg.scene, false);
    sg.scene.visible = false;
    handSufganiyaGroup.add(sg.scene);
    sufganiyaBiteMeshes.push(sg.scene);
  }
  handSufganiyaGroup.visible = false;
  handRoot.add(handSufganiyaGroup);

  handRoot.position.set(0.24, -0.20, -0.48);
  handRoot.rotation.set(0.24, -0.44, 0.14);
  handRoot.visible = false;
  camera.add(handRoot);

  // WebXR Pico 2 controller binding & 90Hz optimization
  const ctrl0 = renderer.xr.getController(0);
  scene.add(ctrl0);
  renderer.xr.addEventListener('sessionstart', () => {
    try { renderer.xr.setFoveation(1.0); } catch {}
    renderer.toneMapping = THREE.AgXToneMapping;
    document.getElementById('vr-mask').classList.add('hidden');
    if (handRoot) {
      camera.remove(handRoot);
      ctrl0.add(handRoot);
      handRoot.position.set(0, -0.02, -0.04);
      handRoot.rotation.set(-0.35, 0, 0);
    }
  });
  renderer.xr.addEventListener('sessionend', () => {
    renderer.toneMapping = THREE.NoToneMapping;
    if (handRoot) {
      ctrl0.remove(handRoot);
      camera.add(handRoot);
      handRoot.position.set(0.22, -0.18, -0.42);
      handRoot.rotation.set(0.06, -0.18, 0.04);
    }
  });

  setPlayMode('character');
  refreshLabels();
  loaderEl.classList.add('done');
  setTimeout(() => { loaderEl.style.display = 'none'; }, 400);
}

// Character Animation Timeline + Subtle Organic Breathing Life
const CHAR_IGNITE_TIMES = [
  [1.2, 4], [2.8, 8], [4.3, 7], [5.8, 6], [7.3, 5], [8.8, 3], [10.3, 2], [11.8, 1], [13.3, 0]
];

function updateCharacterTimeline(dt, now) {
  if (!personScene) return;
  if (playMode !== 'character') {
    personScene.visible = false;
    if (personIgniteCandle) personIgniteCandle.visible = false;
    return;
  }
  personScene.visible = true;

  sceneTime = Math.min(27.0, sceneTime + dt);
  const t = sceneTime;
  const breath = Math.sin(now * 2.1) * 0.018;

  poseBoneChar('LeftUpLeg', 0, 0, 0);
  poseBoneChar('RightUpLeg', 0, 0, 0);

  if (t < 15.0) {
    if (personIgniteCandle) personIgniteCandle.visible = true;
    for (const [ti, widx] of CHAR_IGNITE_TIMES) {
      if (t >= ti) igniteWickImmediate(widx, true);
    }
    const active = CHAR_IGNITE_TIMES.reduce((acc, pair) => (t >= pair[0] - 0.8 ? pair : acc), CHAR_IGNITE_TIMES[0]);
    const cupX = (active[1] - 4) * 0.07;
    const bob = Math.sin(t * 2.5) * 0.05;

    personScene.position.set(0.24 + cupX * 0.32, 0, -2.30);
    personScene.rotation.set(0, 0, 0);

    poseBoneChar('Spine1', 0.10 + breath, -cupX * 0.25, 0);
    poseBoneChar('Head', 0.24 + breath * 0.5, -cupX * 0.42, 0);
    poseBoneChar('LeftArm', 0.10, 0.0, -1.25);
    poseBoneLocal('LeftForeArm', 0, 0, 0.35);
    poseBoneChar('RightArm', -0.32 + bob, 0.16 - cupX * 0.72, 1.16);
    poseBoneLocal('RightForeArm', 0, 0, -0.58 - bob);

    menorahGroup.position.copy(MENORAH_REST_POS);
    menorahGroup.rotation.set(0, 0, 0);
  } else if (t < 16.6) {
    if (personIgniteCandle) personIgniteCandle.visible = false;
    const p = (t - 15.0) / 1.6;
    const sp = p * p * (3 - 2 * p);
    personScene.position.set(THREE.MathUtils.lerp(0.24, 0.0, sp), 0, -2.30);
    personScene.rotation.set(0, 0, 0);

    poseBoneChar('Spine1', 0.08, 0, 0);
    poseBoneChar('Head', 0.20, 0, 0);
    poseBoneChar('LeftArm', -0.28, -0.35, -1.22);
    poseBoneLocal('LeftForeArm', 0, 0, 0.92);
    poseBoneChar('RightArm', -0.28, 0.35, 1.22);
    poseBoneLocal('RightForeArm', 0, 0, -0.92);

    menorahGroup.position.set(0, THREE.MathUtils.lerp(tableTopY, 0.96, sp), -1.90);
    menorahGroup.rotation.set(0, 0, 0);
  } else if (t < 18.6) {
    if (personIgniteCandle) personIgniteCandle.visible = false;
    const p = (t - 16.6) / 2.0;
    const sp = p * p * (3 - 2 * p);
    const rotY = THREE.MathUtils.lerp(0.0, Math.PI, sp);
    const pz = THREE.MathUtils.lerp(-2.30, -2.42, sp);

    personScene.position.set(0, 0, pz);
    personScene.rotation.set(0, rotY, 0);

    poseBoneChar('Spine1', 0.05, 0, 0);
    poseBoneChar('Head', 0.16, 0, 0);
    poseBoneChar('LeftArm', -0.30, -0.35, -1.22);
    poseBoneLocal('LeftForeArm', 0, 0, 0.92);
    poseBoneChar('RightArm', -0.30, 0.35, 1.22);
    poseBoneLocal('RightForeArm', 0, 0, -0.92);

    menorahGroup.position.set(Math.sin(rotY) * 0.40, 0.98, pz + Math.cos(rotY) * 0.40);
    menorahGroup.rotation.set(0, rotY, 0);
  } else if (t < 22.4) {
    if (personIgniteCandle) personIgniteCandle.visible = false;
    const p = (t - 18.6) / 3.8;
    const sp = p * p * (3 - 2 * p);
    const walkBob = Math.sin(p * Math.PI * 6) * 0.012;
    const pz = THREE.MathUtils.lerp(-2.42, -3.38, sp);

    personScene.position.set(0, walkBob, pz);
    personScene.rotation.set(0, Math.PI, 0);

    const stride = Math.sin(p * Math.PI * 6) * 0.26;
    poseBoneChar('LeftUpLeg', -stride, 0, 0);
    poseBoneChar('RightUpLeg', stride, 0, 0);
    poseBoneChar('Spine1', 0.05, 0, 0);
    poseBoneChar('Head', 0.14, 0, 0);
    poseBoneChar('LeftArm', -0.30, -0.35, -1.22);
    poseBoneLocal('LeftForeArm', 0, 0, 0.92);
    poseBoneChar('RightArm', -0.30, 0.35, 1.22);
    poseBoneLocal('RightForeArm', 0, 0, -0.92);

    menorahGroup.position.set(0, THREE.MathUtils.lerp(0.98, MENORAH_WINDOW_POS.y, sp) + walkBob * 0.5, pz - 0.40);
    menorahGroup.rotation.set(0, Math.PI, 0);
  } else if (t < 23.6) {
    if (personIgniteCandle) personIgniteCandle.visible = false;
    const p = (t - 22.4) / 1.2;
    const sp = p * p * (3 - 2 * p);
    personScene.position.set(THREE.MathUtils.lerp(0, 0.46, sp), 0, THREE.MathUtils.lerp(-3.38, -3.20, sp));
    personScene.rotation.set(0, THREE.MathUtils.lerp(Math.PI, 2.58, sp), 0);

    poseBoneChar('Spine1', 0.03, 0, 0);
    poseBoneChar('Head', 0.10, -0.15, 0);
    poseBoneChar('LeftArm', THREE.MathUtils.lerp(-0.30, 0.12, sp), THREE.MathUtils.lerp(-0.35, 0, sp), -1.24);
    poseBoneLocal('LeftForeArm', 0, 0, THREE.MathUtils.lerp(0.92, 0.35, sp));
    poseBoneChar('RightArm', THREE.MathUtils.lerp(-0.30, 0.12, sp), THREE.MathUtils.lerp(0.35, 0, sp), 1.24);
    poseBoneLocal('RightForeArm', 0, 0, THREE.MathUtils.lerp(-0.92, -0.35, sp));

    menorahGroup.position.copy(MENORAH_WINDOW_POS);
    menorahGroup.rotation.set(0, Math.PI, 0);
  } else {
    if (personIgniteCandle) personIgniteCandle.visible = false;
    personScene.position.set(0.46, 0, -3.20);
    personScene.rotation.set(0, 2.58, 0);
    menorahGroup.position.copy(MENORAH_WINDOW_POS);
    menorahGroup.rotation.set(0, Math.PI, 0);

    poseBoneChar('Spine1', 0.02 + breath, 0, 0);
    poseBoneChar('Head', 0.08 + Math.sin(now * 1.1) * 0.025, -0.15 + Math.sin(now * 0.7) * 0.04, 0);
    poseBoneChar('LeftArm', 0.12, 0, -1.25);
    poseBoneLocal('LeftForeArm', 0, 0, 0.35);
    poseBoneChar('RightArm', 0.12, 0, 1.25);
    poseBoneLocal('RightForeArm', 0, 0, -0.35);
  }
}

// Input Handling (Smooth Drag Look + Raycast Click + Keyboard E/B/WASD/H)
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
  if (isDragging && !renderer.xr.isPresenting) {
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      dragMoved = true;
      camTween = null;
    }
    yaw -= dx * 0.0042;
    pitch = Math.max(-1.12, Math.min(0.85, pitch - dy * 0.0042));
    lastMouse = { x: e.clientX, y: e.clientY };
    applyCameraRotation();
  }
});

window.addEventListener('pointerup', () => {
  if (isDragging && !dragMoved && hoverTarget) {
    ensureAudioOnUserAction();
    if (hoverTarget.kind === 'dreidel') {
      dreidels[hoverTarget.idx].vel = 15.0;
      playSfx('dreidel');
    } else if (hoverTarget.kind === 'plate') {
      triggerSufganiyaAction();
    } else if (hoverTarget.kind === 'siddur') {
      toggleOrFlipSiddur();
    } else if (hoverTarget.kind === 'wick' && playMode === 'self') {
      igniteWithReach(hoverTarget.idx);
    }
  }
  isDragging = false;
});

function igniteWithReach(widx) {
  const w = wicks.find((x) => x.idx === widx);
  if (!w || w.lit) return;
  shamashReachAnim = { widx, t: 0, dur: 0.45, ignited: false };
}

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyH') document.body.classList.toggle('hud-hidden');
  if (e.code === 'KeyE') triggerSufganiyaAction();
  if (e.code === 'KeyB') toggleOrFlipSiddur();
  if (e.code === 'Escape' && siddurTargetOpen) closeSiddur();
  if (e.code === 'Space' && playMode === 'self') {
    const nxt = getNextSuggestedIdx();
    if (nxt !== null) igniteWithReach(nxt);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

// UI Labels & Controls
function refreshLabels() {
  const t = I18N[lang];
  document.documentElement.dir = t.dir;
  document.documentElement.lang = lang;
  document.getElementById('ui-title').textContent = t.title;
  document.getElementById('ui-sub').textContent = t.sub;
  document.getElementById('ui-count-label').textContent = t.countLabel;
  document.getElementById('btn-mode-scene').textContent = t.modeScene;
  document.getElementById('btn-mode-self').textContent = t.modeSelf;
  document.getElementById('btn-cam-front').textContent = t.camFront;
  document.getElementById('btn-cam-left').textContent = t.camLeft;
  document.getElementById('btn-cam-window').textContent = t.camWindow;
  document.getElementById('btn-replay').textContent = t.replay;
  document.getElementById('btn-ignite-next').textContent = t.igniteNext;
  document.getElementById('btn-eat-sufganiya').textContent = eatingState.active ? t.eatBtnBite(eatingState.bitesTaken + 1) : t.eatBtnIdle;
  document.getElementById('btn-eat-sufganiya').classList.toggle('active', eatingState.active);
  document.getElementById('btn-open-siddur').textContent = siddurTargetOpen ? t.siddurOpen : t.siddurClosed;
  document.getElementById('btn-open-siddur').classList.toggle('active', siddurTargetOpen);

  const maskOn = !document.getElementById('vr-mask').classList.contains('hidden');
  document.getElementById('btn-vr-mask').textContent = maskOn ? t.maskOn : t.maskOff;
  document.getElementById('btn-audio').textContent = audioEnabled ? t.audioOn : t.audioOff;
  document.getElementById('banner-complete').textContent = t.complete;
  document.getElementById('help-strip').textContent = t.help;
}

document.getElementById('btn-mode-scene').addEventListener('click', () => setPlayMode('character'));
document.getElementById('btn-mode-self').addEventListener('click', () => setPlayMode('self'));
document.getElementById('btn-cam-front').addEventListener('click', () => setCameraView('front', true));
document.getElementById('btn-cam-left').addEventListener('click', () => setCameraView('left', true));
document.getElementById('btn-cam-window').addEventListener('click', () => setCameraView('window', true));
document.getElementById('btn-replay').addEventListener('click', () => {
  setPlayMode('character');
  sceneTime = 0;
});
document.getElementById('btn-ignite-next').addEventListener('click', () => {
  ensureAudioOnUserAction();
  const nxt = getNextSuggestedIdx();
  if (nxt !== null) igniteWithReach(nxt);
});
document.getElementById('btn-eat-sufganiya').addEventListener('click', triggerSufganiyaAction);
document.getElementById('btn-open-siddur').addEventListener('click', () => {
  if (!siddurTargetOpen) openSiddur(true);
  else closeSiddur();
});
document.getElementById('btn-vr-mask').addEventListener('click', (e) => {
  document.getElementById('vr-mask').classList.toggle('hidden');
  e.currentTarget.classList.toggle('active');
  refreshLabels();
});
document.getElementById('btn-audio').addEventListener('click', (e) => {
  audioEnabled = !audioEnabled;
  userExplicitlyMuted = !audioEnabled;
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  if (n8aoPass) n8aoPass.setSize(window.innerWidth, window.innerHeight);
});

// Deterministic Test API
window.__FPV_DEBUG__ = {
  getState: () => ({
    loaded: wicks.length === 9 && !!handRoot && !!personScene && !!siddurRoot,
    playMode,
    sceneTime: Number(sceneTime.toFixed(2)),
    litRegular: getLitRegularCount(),
    menorahZ: menorahGroup ? Number(menorahGroup.position.z.toFixed(2)) : null,
    eatingActive: eatingState.active,
    bitesTaken: eatingState.bitesTaken,
    siddurOpen: siddurTargetOpen,
    siddurCoverRotZ: siddurCoverPivot ? Number(siddurCoverPivot.rotation.z.toFixed(2)) : null,
    lang
  }),
  setMode: (m) => setPlayMode(m),
  setView: (v) => setCameraView(v, false),
  jumpToPhase: (ph) => {
    setPlayMode('character');
    if (ph === 'lighting') {
      sceneTime = 8.0;
    } else if (ph === 'carry') {
      for (const [, idx] of CHAR_IGNITE_TIMES) igniteWickImmediate(idx, false);
      clearSparkBursts();
      sceneTime = 20.4;
    } else if (ph === 'window') {
      for (const [, idx] of CHAR_IGNITE_TIMES) igniteWickImmediate(idx, false);
      clearSparkBursts();
      sceneTime = 24.5;
    }
    updateCharacterTimeline(0, performance.now() / 1000);
  },
  igniteNext: () => {
    const nxt = getNextSuggestedIdx();
    return nxt !== null ? igniteWickImmediate(nxt, false) : false;
  },
  eatSufganiya: () => {
    triggerSufganiyaAction();
    return { active: eatingState.active, bitesTaken: eatingState.bitesTaken };
  },
  openSiddur: (instant = false) => {
    openSiddur(true);
    if (instant) {
      siddurOpenAnim = 1.0;
      if (siddurCoverPivot) siddurCoverPivot.rotation.z = -3.00;
      setCameraView('siddur', false);
    }
  },
  flipSiddurPage: () => flipSiddurPage(),
  closeSiddur: () => closeSiddur(),
  reset: () => resetAllWicks()
};

// Render Loop
let prevT = performance.now() / 1000;
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - prevT);
  prevT = now;

  // Smooth Cinema Camera Interpolation
  if (camTween && !renderer.xr.isPresenting) {
    const k = 1.0 - Math.exp(-7.5 * dt);
    playerRig.position.x = THREE.MathUtils.lerp(playerRig.position.x, camTween.x, k);
    playerRig.position.z = THREE.MathUtils.lerp(playerRig.position.z, camTween.z, k);
    yaw = THREE.MathUtils.lerp(yaw, camTween.yaw, k);
    pitch = THREE.MathUtils.lerp(pitch, camTween.pitch, k);
    applyCameraRotation();
    if (Math.hypot(playerRig.position.x - camTween.x, playerRig.position.z - camTween.z) < 0.008) {
      camTween = null;
    }
  }

  // Smooth WASD Walking inside Salon Bounds
  if (!renderer.xr.isPresenting) {
    const moveFwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const moveStrafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    if (moveFwd || moveStrafe) {
      camTween = null;
      const spd = 1.75 * dt;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      playerRig.position.x = THREE.MathUtils.clamp(playerRig.position.x + (fx * moveFwd + rx * moveStrafe) * spd, -3.1, 3.1);
      playerRig.position.z = THREE.MathUtils.clamp(playerRig.position.z + (fz * moveFwd + rz * moveStrafe) * spd, -3.25, 3.1);
    }
  }

  // Character Lighting -> Portage Choreography
  updateCharacterTimeline(dt, now);

  // Siddour 3D Cover Open & Flipping Page Animation
  if (siddurCoverPivot) {
    const tgt = siddurTargetOpen ? 1.0 : 0.0;
    siddurOpenAnim = THREE.MathUtils.lerp(siddurOpenAnim, tgt, 1.0 - Math.exp(-8.0 * dt));
    siddurCoverPivot.rotation.z = -3.00 * siddurOpenAnim;
  }
  if (siddurFlipPivot && siddurFlipping) {
    siddurFlipAnim += dt * 1.9;
    if (siddurFlipAnim >= 1.0) {
      siddurFlipping = false;
      siddurFlipAnim = 0.0;
      siddurFlipPivot.rotation.z = 0.0;
    } else {
      const sp = siddurFlipAnim * siddurFlipAnim * (3 - 2 * siddurFlipAnim);
      siddurFlipPivot.rotation.z = -Math.PI * 0.96 * sp;
    }
  }

  // Raycast Interactive Targets (Dreidels, Sufganiya Plate, Leather Siddour, Wicks)
  const hitList = [];
  for (const d of dreidels) hitList.push(d.mesh);
  if (plateRoot) hitList.push(plateRoot);
  if (siddurRoot) hitList.push(siddurRoot);
  if (playMode === 'self') {
    for (const w of wicks) if (!w.lit) hitList.push(w.hitMesh);
  }
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(hitList, true);
  hoverTarget = null;
  for (const h of hits) {
    if (h.object.userData.wickIdx !== undefined && playMode === 'self') {
      hoverTarget = { kind: 'wick', idx: h.object.userData.wickIdx };
      break;
    }
    if (h.object.userData.dreidelIdx !== undefined) {
      hoverTarget = { kind: 'dreidel', idx: h.object.userData.dreidelIdx };
      break;
    }
    if (h.object.userData.interactiveKind === 'plate') {
      hoverTarget = { kind: 'plate' };
      break;
    }
    if (h.object.userData.interactiveKind === 'siddur') {
      hoverTarget = { kind: 'siddur' };
      break;
    }
  }

  const reticle = document.getElementById('reticle');
  const hint = document.getElementById('hover-hint');
  const t = I18N[lang];
  if (hoverTarget) {
    reticle.classList.add('hot');
    if (hoverTarget.kind === 'wick') hint.textContent = t.hintWick(hoverTarget.idx);
    else if (hoverTarget.kind === 'dreidel') hint.textContent = t.hintDreidel;
    else if (hoverTarget.kind === 'plate') hint.textContent = t.hintPlate;
    else if (hoverTarget.kind === 'siddur') hint.textContent = t.hintSiddur(siddurTargetOpen);
    hint.classList.add('visible');
  } else {
    reticle.classList.remove('hot');
    hint.classList.remove('visible');
  }

  // Real Human Hand Animation (Holding Chamach OR Eating Sufganiya!)
  if (handRoot && handRoot.visible && !renderer.xr.isPresenting) {
    if (eatingState.active) {
      if (eatingState.shakeT > 0) eatingState.shakeT = Math.max(0, eatingState.shakeT - dt);
      const biteLift = Math.sin((eatingState.shakeT / 0.28) * Math.PI);
      const tgtPos = new THREE.Vector3(
        0.13 - biteLift * 0.03,
        -0.13 + biteLift * 0.04 + Math.sin(now * 2.2) * 0.003,
        -0.34 + biteLift * 0.05
      );
      handRoot.position.lerp(tgtPos, 0.22);
      handRoot.rotation.set(0.26 + biteLift * 0.12, -0.46, 0.14);
    } else if (shamashReachAnim) {
      shamashReachAnim.t += dt;
      const p = Math.min(1, shamashReachAnim.t / shamashReachAnim.dur);
      const arc = Math.sin(p * Math.PI);
      const wObj = wicks.find((x) => x.idx === shamashReachAnim.widx);
      const tgtWorld = new THREE.Vector3();
      wObj.flame.getWorldPosition(tgtWorld);
      const tgtCam = camera.worldToLocal(tgtWorld.clone());
      handRoot.position.set(
        THREE.MathUtils.lerp(0.24, tgtCam.x + 0.03, arc),
        THREE.MathUtils.lerp(-0.20, tgtCam.y - 0.14, arc),
        THREE.MathUtils.lerp(-0.48, tgtCam.z + 0.11, arc)
      );
      handRoot.rotation.set(0.24 - 0.18 * arc, -0.44, 0.14);
      if (p >= 0.48 && !shamashReachAnim.ignited) {
        shamashReachAnim.ignited = true;
        igniteWickImmediate(shamashReachAnim.widx, true);
      }
      if (p >= 1) shamashReachAnim = null;
    } else {
      const restPos = new THREE.Vector3(0.24 + Math.sin(now * 1.1) * 0.004, -0.20 + Math.sin(now * 1.9) * 0.005, -0.48);
      handRoot.position.lerp(restPos, 0.16);
      handRoot.rotation.set(0.24, -0.44, 0.14);
    }
  }

  // Flicker Flames & Halos
  const nextIdx = getNextSuggestedIdx();
  for (const w of wicks) {
    if (w.lit) {
      const ph = w.flame.userData.phase;
      w.flame.scale.set(1 + 0.09 * Math.cos(now * 6.3 + ph), 1 + 0.15 * Math.sin(now * 8.5 + ph), 1);
      w.flame.rotation.z = 0.06 * Math.sin(now * 5.2 + ph);
      if (w.flame.userData.light) w.flame.userData.light.intensity = 1.0 + 0.16 * Math.sin(now * 10.0 + ph);
    } else if (playMode === 'self') {
      const isNext = w.idx === nextIdx;
      w.halo.material.opacity = isNext ? (0.55 + 0.40 * Math.sin(now * 4.5)) : 0.20;
      const hs = isNext ? (1.12 + 0.18 * Math.sin(now * 4.5)) : 0.85;
      w.halo.scale.set(hs, hs, 1);
    }
  }

  if (personIgniteFlame && personIgniteCandle?.visible) {
    personIgniteFlame.scale.set(1, 1 + 0.14 * Math.sin(now * 9.0), 1);
  }
  if (handFlame && handChamashGroup?.visible) {
    handFlame.scale.set(1, 1 + 0.14 * Math.sin(now * 9.0), 1);
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
  if (renderer.xr.isPresenting) renderer.render(scene, camera);
  else composer.render();
});

initAssets();
