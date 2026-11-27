import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const candleDisplayNum = (idx) => (idx === 4 ? 'Shamash' : (idx > 4 ? (9 - idx) : (8 - idx)));

const I18N = {
  fr: {
    dir: 'ltr',
    title: 'Hanoukkia 3D Première Personne — Simulation VR',
    sub: 'Déplacez-vous en 3D (WASD / souris) · Regardez sous tous les angles',
    countLabel: 'Lumières :',
    modeScene: '🧑 Scène Personnage',
    modeSelf: '🕯️ Allumer moi-même',
    camFront: '👁️ Face',
    camLeft: '◀️ Côté gauche',
    camWindow: '🪟 Fenêtre',
    replay: '🎬 Rejouer',
    igniteNext: '🔥 Allumer',
    maskOn: '🥽 Casque VR : ON',
    maskOff: '🖥️ Casque VR : OFF',
    audioOn: '🔊 Audio : ON',
    audioOff: '🔇 Audio : OFF',
    complete: '✨ 8/8 Lumières allumées !',
    hintWick: (n) => (n === 4 ? 'Cliquer pour allumer le Shamash' : `Cliquer pour allumer la bougie ${candleDisplayNum(n)}`),
    hintDreidel: 'Cliquer pour faire tourner la toupie',
    help: "Glisser pour regarder 360° · WASD / Flèches pour marcher · Toupie : clic pour tourner · H : masquer/afficher l'interface"
  },
  he: {
    dir: 'rtl',
    title: 'הדלקת חנוכייה בתלת-ממד בגוף ראשון — הדמיית VR',
    sub: 'תנועה חופשית בחדר (WASD / עכבר) · צפייה מכל זווית',
    countLabel: 'נרות:',
    modeScene: '🧑 הדגמה עם דמות',
    modeSelf: '🕯️ הדלקה עצמאית',
    camFront: '👁️ מבט קדמי',
    camLeft: '◀️ מבט מצד שמאל',
    camWindow: '🪟 ליד החלון',
    replay: '🎬 הפעלה מחדש',
    igniteNext: '🔥 הדלקת הנר הבא',
    maskOn: '🥽 מצב משקפי VR: פעיל',
    maskOff: '🖥️ מצב משקפי VR: כבוי',
    audioOn: '🔊 שמע: פעיל',
    audioOff: '🔇 שמע: כבוי',
    complete: '✨ 8/8 נרות דולקים!',
    hintWick: (n) => (n === 4 ? 'לחצו להדלקת השמש' : `לחצו להדלקת נר ${candleDisplayNum(n)}`),
    hintDreidel: 'לחצו כדי לסובב את הסביבון',
    help: 'גרירת עכבר למבט 360° · חיצים / WASD להליכה · לחיצה על הסביבון לסיבוב · מקש H להסתרת התפריט'
  }
};

let lang = 'fr';
let playMode = 'character'; // 'character' | 'self'
let manifest = null;
let tableTopY = 0.5429;
const TABLE_POS = new THREE.Vector3(0, 0, -1.78);
const MENORAH_REST_POS = new THREE.Vector3(0, 0.5429, -1.90);
const MENORAH_WINDOW_POS = new THREE.Vector3(0, 0.94, -3.72);

// Renderer + PostProcessing Bloom
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;

document.getElementById('vr-btn-slot').appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060913);
scene.fog = new THREE.FogExp2(0x070a15, 0.022);

// Rig & Camera (Desktop FPS + WebXR 6DoF)
const playerRig = new THREE.Group();
playerRig.position.set(0, 0, -0.78);
scene.add(playerRig);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.04, 65);
camera.position.set(0, 1.40, 0);
playerRig.add(camera);

let yaw = 0.0;
let pitch = -0.26;
function applyCameraRotation() {
  if (!renderer.xr.isPresenting) {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
}
applyCameraRotation();

// Bloom Composer for desktop cinematic glow
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.34, 0.48, 0.82);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// HDRI Environment IBL for metal/crystal/silver reflections
const pmremGen = new THREE.PMREMGenerator(renderer);
pmremGen.compileEquirectangularShader();
new RGBELoader().load(
  'assets/textures/night_env.hdr',
  (hdrTex) => {
    const envRT = pmremGen.fromEquirectangular(hdrTex);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.90;
    hdrTex.dispose();
    pmremGen.dispose();
  },
  undefined,
  () => {
    pmremGen.dispose();
  }
);

// Lights with Soft Shadows
const hemi = new THREE.HemisphereLight(0x8bb0f2, 0x3b2816, 0.55);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0x8bb2ff, 1.55);
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

const chandelierLight = new THREE.PointLight(0xffbe73, 4.2, 12, 1.4);
chandelierLight.position.set(0, 3.15, -0.25);
chandelierLight.castShadow = true;
chandelierLight.shadow.mapSize.set(512, 512);
chandelierLight.shadow.bias = -0.001;
scene.add(chandelierLight);

const personKeyLight = new THREE.SpotLight(0xffcb88, 3.4, 8, Math.PI / 4, 0.55, 1.3);
personKeyLight.position.set(0.85, 2.35, -1.15);
personKeyLight.target.position.set(0.38, 1.35, -2.35);
personKeyLight.castShadow = true;
personKeyLight.shadow.mapSize.set(512, 512);
scene.add(personKeyLight, personKeyLight.target);

const balconyMoon = new THREE.PointLight(0x7ca8ff, 3.5, 9, 1.5);
balconyMoon.position.set(0, 2.8, -5.0);
scene.add(balconyMoon);

// Textures & PBR Materials
const texLoader = new THREE.TextureLoader();
function loadTex(file, repX = 1, repY = 1, srgb = true) {
  const t = texLoader.load(`assets/textures/${file}`);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createRadialGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0.0, 'rgba(255,244,195,0.95)');
  g.addColorStop(0.35, 'rgba(255,165,55,0.42)');
  g.addColorStop(1.0, 'rgba(255,110,15,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const GLOW_TEX = createRadialGlowTexture();

function buildSalonAnd3DJerusalemExterior() {
  const stoneMat = new THREE.MeshStandardMaterial({
    map: loadTex('sandstone_diff.jpg', 3.5, 2.0, true),
    normalMap: loadTex('sandstone_nor.jpg', 3.5, 2.0, false),
    roughnessMap: loadTex('sandstone_rough.jpg', 3.5, 2.0, false),
    roughness: 0.90, metalness: 0.02, color: 0xe6d4b8
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: loadTex('floor_diff.jpg', 4, 4, true),
    normalMap: loadTex('floor_nor.jpg', 4, 4, false),
    roughnessMap: loadTex('floor_rough.jpg', 4, 4, false),
    roughness: 0.78, color: 0xe4d4bf
  });
  const walnutMat = new THREE.MeshStandardMaterial({
    map: loadTex('walnut_diff.jpg', 2, 1, true),
    normalMap: loadTex('walnut_nor.jpg', 2, 1, false),
    roughness: 0.48
  });
  const rugMat = new THREE.MeshStandardMaterial({ map: loadTex('persian_rug_pbr.jpg', 1, 1, true), roughness: 0.92 });
  const velvetMat = new THREE.MeshStandardMaterial({
    color: 0x1c2d57,
    roughness: 0.72,
    metalness: 0.04,
    sheen: 0.9,
    sheenColor: new THREE.Color(0x6d8fd1)
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a23a, metalness: 0.94, roughness: 0.20 });
  const casementWoodMat = new THREE.MeshStandardMaterial({
    map: loadTex('walnut_diff.jpg', 1, 1, true),
    normalMap: loadTex('walnut_nor.jpg', 1, 1, false),
    color: 0x8f623d,
    roughness: 0.46
  });
  const glassPaneMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbe9ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.05, side: THREE.DoubleSide
  });

  // Floor & Rug (receive shadows!)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.35, 3.35), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.006, -1.45);
  rug.receiveShadow = true;
  scene.add(rug);

  const addBox = (w, h, d, x, y, z, mat, cast = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = cast;
    scene.add(m);
    return m;
  };

  // Salon Walls & Barrel Vault Ceiling
  addBox(8.2, 4.4, 0.35, 0, 2.2, 3.85, stoneMat);
  addBox(0.35, 3.2, 8.2, -3.85, 1.6, 0, stoneMat);
  addBox(0.35, 3.2, 8.2, 3.85, 1.6, 0, stoneMat);
  for (const yr of [-3.55, -1.2, 1.2, 3.55]) {
    addBox(0.38, 2.85, 0.34, -3.66, 1.42, yr, stoneMat, true);
    addBox(0.38, 2.85, 0.34, 3.66, 1.42, yr, stoneMat, true);
  }

  // Front Wall framing true deep Arched Window opening (z = -3.88, depth = 0.56 m!)
  addBox(2.84, 4.4, 0.58, -2.60, 2.2, -3.92, stoneMat);
  addBox(2.84, 4.4, 0.58, 2.60, 2.2, -3.92, stoneMat);
  addBox(2.44, 0.90, 0.58, 0, 0.45, -3.92, stoneMat);
  // Wide Walnut Windowsill where Menorah can be placed!
  addBox(2.58, 0.08, 0.68, 0, 0.90, -3.84, walnutMat, true);
  addBox(2.60, 1.15, 0.58, 0, 3.92, -3.92, stoneMat);

  // Carved Stone Arch Voussoirs
  for (let k = 0; k < 15; k++) {
    const th = Math.PI * (k + 0.5) / 15.0;
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.62), stoneMat);
    v.position.set(1.22 * Math.cos(th), 2.22 + 1.22 * Math.sin(th), -3.92);
    v.rotation.z = th - Math.PI / 2;
    v.castShadow = true;
    v.receiveShadow = true;
    scene.add(v);
  }

  // Hinged Casement Window Leaves swung open outward with transparent glass & perimeter walnut frames
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.15, 2.04, -4.18);
    hinge.rotation.y = side * -1.18; // swung open outward over 3D balcony
    const cx = -side * 0.45;
    const stileIn = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.02, 0.05), casementWoodMat);
    stileIn.position.x = -side * 0.025;
    const stileOut = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.02, 0.05), casementWoodMat);
    stileOut.position.x = -side * 0.875;
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.06, 0.05), casementWoodMat);
    railTop.position.set(cx, 0.98, 0);
    const railMid = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.04, 0.045), casementWoodMat);
    railMid.position.set(cx, 0.05, 0);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.06, 0.05), casementWoodMat);
    railBot.position.set(cx, -0.98, 0);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.90), glassPaneMat);
    glass.position.x = cx;
    hinge.add(stileIn, stileOut, railTop, railMid, railBot, glass);
    scene.add(hinge);
  }

  // Barrel Vault Ceiling
  const vault = new THREE.Mesh(
    new THREE.CylinderGeometry(3.88, 3.88, 8.0, 28, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({
      map: loadTex('sandstone_diff.jpg', 3.5, 2.0, true),
      normalMap: loadTex('sandstone_nor.jpg', 3.5, 2.0, false),
      roughness: 0.9, side: THREE.BackSide, color: 0xe6d3b6
    })
  );
  vault.rotation.x = Math.PI / 2;
  vault.rotation.z = Math.PI / 2;
  vault.scale.set(1.0, 1.0, 0.44);
  vault.position.set(0, 2.75, 0);
  scene.add(vault);

  // Velvet Curtains + Brass Rod (drawn wide beside the stone arch so window view stays open)
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 3.4, 14), brassMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 3.50, -3.56);
  scene.add(rod);
  for (const bx of [-1.42, 1.42]) {
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.066, 2.62, 12), velvetMat);
      c.position.set(bx - 0.11 + i * 0.075, 2.18, -3.56 - (i % 2) * 0.025);
      c.castShadow = true;
      c.receiveShadow = true;
      scene.add(c);
    }
  }

  // Oil Painting on Right Wall (matching right console)
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

  // TRUE 3D EXTERIOR BALCONY + LAYERED 3D OLD CITY OF JERUSALEM (Real Parallax, ZERO flat glued window!)
  addBox(5.2, 0.16, 1.6, 0, 0.76, -4.95, stoneMat); // Balcony terrace floor
  addBox(5.2, 0.14, 0.24, 0, 1.38, -5.65, stoneMat); // Top stone balustrade rail
  addBox(5.2, 0.12, 0.26, 0, 0.88, -5.65, stoneMat); // Bottom plinth
  for (let bx = -2.3; bx <= 2.31; bx += 0.38) {
    addBox(0.11, 0.44, 0.11, bx, 1.13, -5.65, stoneMat, true);
  }

  // Multi-depth 3D Jerusalem Stone Houses, Arches, Cypresses, Warm Lit Windows & Dome
  const warmWinMat = new THREE.MeshBasicMaterial({ color: 0xffc670 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x162619, roughness: 0.92 });
  const buildings = [
    { x: -3.2, y: 0.6, z: -8.6, w: 2.2, h: 2.8, d: 2.0, dome: false },
    { x: -1.1, y: 0.4, z: -9.8, w: 1.9, h: 3.1, d: 2.2, dome: true },
    { x: 1.4, y: 0.5, z: -8.9, w: 2.1, h: 2.7, d: 1.9, dome: false },
    { x: 3.4, y: 0.7, z: -9.5, w: 2.3, h: 3.3, d: 2.1, dome: false },
    { x: -2.2, y: 1.0, z: -13.5, w: 2.8, h: 3.9, d: 2.4, dome: true },
    { x: 0.4, y: 0.9, z: -14.2, w: 3.2, h: 3.6, d: 2.5, dome: false },
    { x: 2.9, y: 1.1, z: -13.2, w: 2.6, h: 4.1, d: 2.4, dome: true },
  ];
  for (const b of buildings) {
    const bm = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), stoneMat);
    bm.position.set(b.x, b.y, b.z);
    scene.add(bm);
    // Warm lit Old City windows facing camera
    for (let wx = -0.5; wx <= 0.51; wx += 0.5) {
      const wm = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.28), warmWinMat);
      wm.position.set(b.x + wx * b.w * 0.45, b.y + b.h * 0.22, b.z + b.d * 0.5 + 0.02);
      scene.add(wm);
    }
    if (b.dome) {
      const dm = new THREE.Mesh(new THREE.SphereGeometry(b.w * 0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), stoneMat);
      dm.position.set(b.x, b.y + b.h * 0.5, b.z);
      scene.add(dm);
    }
  }
  for (const [cx, cy, cz, ch] of [[-2.0, 1.3, -7.2, 2.2], [2.2, 1.2, -7.4, 2.5], [0.2, 1.1, -11.4, 2.9]]) {
    const cyMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32, ch, 10), foliageMat);
    cyMesh.position.set(cx, cy, cz);
    scene.add(cyMesh);
  }

  // Far Night Sky Panoramic Cyclorama with soft feathered alpha edge into night sky
  const skyAlphaCanvas = document.createElement('canvas');
  skyAlphaCanvas.width = 256; skyAlphaCanvas.height = 128;
  const sCtx = skyAlphaCanvas.getContext('2d');
  const hg = sCtx.createLinearGradient(0, 0, 256, 0);
  hg.addColorStop(0.0, 'black'); hg.addColorStop(0.14, 'white'); hg.addColorStop(0.86, 'white'); hg.addColorStop(1.0, 'black');
  sCtx.fillStyle = hg; sCtx.fillRect(0, 0, 256, 128);
  const skyAlphaTex = new THREE.CanvasTexture(skyAlphaCanvas);
  const skyGeo = new THREE.CylinderGeometry(28, 28, 22, 40, 1, true, Math.PI * 0.52, Math.PI * 0.96);
  const skyMat = new THREE.MeshBasicMaterial({
    map: loadTex('jerusalem_night_backdrop.jpg', 1, 1, true),
    alphaMap: skyAlphaTex,
    transparent: true,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(0, 4.2, -2.0);
  scene.add(sky);

  // Subtle Floating Warm Embers
  const emberGeo = new THREE.BufferGeometry();
  const epos = [];
  for (let i = 0; i < 55; i++) {
    epos.push((Math.random() - 0.5) * 5.2, 0.7 + Math.random() * 2.2, -3.5 + Math.random() * 4.0);
  }
  emberGeo.setAttribute('position', new THREE.Float32BufferAttribute(epos, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ map: GLOW_TEX, color: 0xffcf70, size: 0.04, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(embers);
  return embers;
}

const embers = buildSalonAnd3DJerusalemExterior();

function createFlameGroup(withLight = false, scale = 1.0) {
  const g = new THREE.Group();
  const outerGeo = new THREE.ConeGeometry(0.011 * scale, 0.038 * scale, 12);
  outerGeo.translate(0, 0.017 * scale, 0);
  const outer = new THREE.Mesh(outerGeo, new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.90 }));

  const coreGeo = new THREE.ConeGeometry(0.006 * scale, 0.024 * scale, 10);
  coreGeo.translate(0, 0.012 * scale, 0);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xfff7cc }));

  const blueGeo = new THREE.SphereGeometry(0.0055 * scale, 8, 8);
  blueGeo.translate(0, 0.003 * scale, 0);
  const blue = new THREE.Mesh(blueGeo, new THREE.MeshBasicMaterial({ color: 0x3b7bff, transparent: true, opacity: 0.65 }));

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xffbe55, transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  glow.scale.set(0.085 * scale, 0.105 * scale, 1);
  glow.position.y = 0.018 * scale;

  g.add(outer, core, blue, glow);
  if (withLight) {
    const pt = new THREE.PointLight(0xff9c33, 0.95, 3.2, 1.7);
    pt.position.y = 0.026 * scale;
    g.add(pt);
    g.userData.light = pt;
  }
  g.userData.phase = Math.random() * Math.PI * 2;
  return g;
}

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
  const mat = new THREE.PointsMaterial({ map: GLOW_TEX, color: 0xffd87a, size: 0.032, transparent: true, opacity: 1.0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geom, mat);
  scene.add(pts);
  sparkBursts.push({ pts, vels, life: 0, maxLife: 0.9 });
}

// Audio
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

// Scene State
let menorahGroup = null;
const wicks = []; // parented INSIDE menorahGroup so they move with the Menorah to the window!
const dreidels = [];
let handRoot = null;
let handFlame = null;
let handShamashLocalTip = new THREE.Vector3(-0.008, 0.197, -0.1281);
let personScene = null;
let personBones = {};
let personBoneRest = {};
let personBoneCharRestWorld = {};
let personIgniteCandle = null;
let personIgniteFlame = null;
let sceneTime = 0; // seconds into character narrative (0..26)

function clearSparkBursts() {
  for (let i = sparkBursts.length - 1; i >= 0; i--) {
    scene.remove(sparkBursts[i].pts);
  }
  sparkBursts.length = 0;
}

let shamashReachAnim = null;
let pointerNDC = new THREE.Vector2(0, 0);
let raycaster = new THREE.Raycaster();
let hoveredWickIdx = null;
let hoveredDreidel = null;

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
  const banner = document.getElementById('banner-complete');
  if (count === 8) {
    banner.textContent = I18N[lang].complete;
    banner.classList.add('visible');
  } else {
    banner.classList.remove('visible');
  }
}

function igniteWickImmediate(idx, withSound = true) {
  const w = wicks.find((x) => x.idx === idx);
  if (!w || w.lit) return false;
  w.lit = true;
  w.flame.visible = true;
  w.halo.visible = false;
  const wp = new THREE.Vector3();
  w.flame.getWorldPosition(wp);
  spawnSparks(wp);
  if (withSound) playIgniteSound();
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
  if (handRoot) handRoot.visible = (mode === 'self');
  resetAllWicks();
  if (mode === 'character') sceneTime = 0;
}

function setCameraView(preset) {
  if (renderer.xr.isPresenting) return;
  if (preset === 'front') {
    playerRig.position.set(0, 0, -0.78);
    yaw = 0.0; pitch = -0.26;
  } else if (preset === 'left') {
    playerRig.position.set(-1.55, 0, -1.75);
    yaw = -1.18; pitch = -0.22;
  } else if (preset === 'window') {
    playerRig.position.set(-0.92, 0, -2.65);
    yaw = -0.62; pitch = -0.14;
  }
  applyCameraRotation();
}

// Rotate imported bone cleanly in character space (+X=Left, +Y=Up, +Z=Front)
function poseBoneChar(name, rx, ry, rz) {
  const b = personBones[name];
  const rest = personBoneRest[name];
  const restW = personBoneCharRestWorld[name];
  if (!b || !rest || !restW) return;
  const qChar = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  const qOff = restW.clone().invert().multiply(qChar).multiply(restW);
  b.quaternion.copy(rest).multiply(qOff);
}

// Rotate imported bone in its own bind-pose local axes (ideal for ForeArm elbow hinge & Hand)
function poseBoneLocal(name, rx, ry, rz) {
  const b = personBones[name];
  const rest = personBoneRest[name];
  if (!b || !rest) return;
  const qOff = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  b.quaternion.copy(rest).multiply(qOff);
}

// Load Manifest & All AAA GLBs
async function initAssets() {
  const loaderEl = document.getElementById('loader');
  const loaderTxt = document.getElementById('loader-txt');
  const res = await fetch('assets/scene_manifest.json');
  manifest = await res.json();
  tableTopY = manifest.table_top_y || 0.5429;
  MENORAH_REST_POS.y = tableTopY;
  if (manifest.fpv_shamash_flame_local) handShamashLocalTip.set(...manifest.fpv_shamash_flame_local);

  const gltfLoader = new GLTFLoader();
  const loadGLB = (name) => new Promise((resolve, reject) => gltfLoader.load(`assets/models/${name}`, resolve, undefined, reject));

  loaderTxt.textContent = 'Chargement mobilier PBR, personnage réaliste et hanoukkia…';
  const [tblG, hanG, gobG, sufgG, drG, armG, conG, chanG, lantG, handG, persG] = await Promise.all([
    loadGLB('table_v2.glb'),
    loadGLB('hanoukia_v2.glb'),
    loadGLB('goblets_v2.glb'),
    loadGLB('sufganiot_plate_v2.glb'),
    loadGLB('dreidel_v2.glb'),
    loadGLB('armchair_v2.glb'),
    loadGLB('console_v2.glb'),
    loadGLB('chandelier_v2.glb'),
    loadGLB('lantern_v2.glb'),
    loadGLB('fpv_hand_shamash.glb'),
    loadGLB('person_v3.glb')
  ]);

  const enableShadows = (root) => {
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  };

  tblG.scene.position.copy(TABLE_POS);
  enableShadows(tblG.scene);
  scene.add(tblG.scene);

  // Menorah wrapped inside movable menorahGroup so character can lift & carry it to the window!
  menorahGroup = new THREE.Group();
  menorahGroup.position.copy(MENORAH_REST_POS);
  enableShadows(hanG.scene);
  menorahGroup.add(hanG.scene);
  scene.add(menorahGroup);

  gobG.scene.position.set(-0.50, tableTopY, -1.72);
  enableShadows(gobG.scene);
  scene.add(gobG.scene);

  sufgG.scene.position.set(0.50, tableTopY, -1.65);
  enableShadows(sufgG.scene);
  scene.add(sufgG.scene);

  // 3 Grounded UV-engraved Dreidels flush on table_top_y (dreidel_base_y == 0.0 -> zero floating!)
  for (const [dx, dz, rot] of [[-0.28, -1.44, 0.25], [0.02, -1.40, 0.85], [0.29, -1.45, 1.55]]) {
    const clone = drG.scene.clone();
    clone.position.set(dx, tableTopY, dz);
    clone.rotation.y = rot;
    enableShadows(clone);
    scene.add(clone);
    dreidels.push({ mesh: clone, vel: 0.45 + Math.random() * 0.35 });
  }

  // Photogrammetric Armchairs, Console + Vases/Books, Chandelier & Flanking Lanterns
  for (const [ax, az, ay] of [[-2.05, -1.25, -2.55], [2.05, -1.25, 2.55]]) {
    const ac = armG.scene.clone();
    ac.position.set(ax, 0, az);
    ac.rotation.y = ay;
    enableShadows(ac);
    scene.add(ac);
  }
  conG.scene.position.set(3.28, 0, 0);
  conG.scene.rotation.y = -Math.PI / 2;
  enableShadows(conG.scene);
  scene.add(conG.scene);

  chanG.scene.position.set(0, 4.25, -0.25);
  enableShadows(chanG.scene);
  scene.add(chanG.scene);

  for (const lx of [-2.35, 2.35]) {
    const lt = lantG.scene.clone();
    lt.position.set(lx, 3.72, -2.55);
    enableShadows(lt);
    scene.add(lt);
  }

  // Wicks parented INSIDE menorahGroup
  for (const [k, localArr] of Object.entries(manifest.wick_positions_local)) {
    const idx = parseInt(k, 10);
    const localPos = new THREE.Vector3(localArr[0], localArr[1], localArr[2]);
    const flame = createFlameGroup(idx === 4 || idx % 2 === 0, idx === 4 ? 1.15 : 1.0);
    flame.position.copy(localPos);
    flame.visible = false;
    menorahGroup.add(flame);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.015, 0.023, 18),
      new THREE.MeshBasicMaterial({ color: 0xffd269, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    halo.position.copy(localPos);
    halo.rotation.x = -Math.PI / 2;
    halo.visible = false;
    menorahGroup.add(halo);

    const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hitMesh.position.copy(localPos);
    hitMesh.userData.wickIdx = idx;
    menorahGroup.add(hitMesh);

    wicks.push({ idx, localPos, flame, halo, hitMesh, lit: false });
  }

  // Realistic Rigged Person + Velvet Kippa + Held Shamash Candle
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

  // Attach glowing 16cm Shamash taper candle oriented cleanly out of character's RightHand fingers
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

  // FPV First-Person Right Hand (Self Mode & WebXR)
  handRoot = new THREE.Group();
  handRoot.add(handG.scene);
  handFlame = createFlameGroup(true, 1.2);
  handFlame.position.copy(handShamashLocalTip);
  handRoot.add(handFlame);
  handRoot.position.set(0.24, -0.17, -0.44);
  handRoot.rotation.set(0.08, -0.22, 0.04);
  handRoot.visible = false;
  camera.add(handRoot);

  // WebXR Pico 2 controller binding
  const ctrl0 = renderer.xr.getController(0);
  scene.add(ctrl0);
  renderer.xr.addEventListener('sessionstart', () => {
    document.getElementById('vr-mask').classList.add('hidden');
    if (playMode === 'self' && handRoot) {
      camera.remove(handRoot);
      ctrl0.add(handRoot);
      handRoot.position.set(0, -0.02, -0.04);
      handRoot.rotation.set(-0.35, 0, 0);
    }
  });
  renderer.xr.addEventListener('sessionend', () => {
    if (handRoot) {
      ctrl0.remove(handRoot);
      camera.add(handRoot);
      handRoot.position.set(0.24, -0.17, -0.44);
      handRoot.rotation.set(0.08, -0.22, 0.04);
    }
  });

  setPlayMode('character');
  loaderEl.classList.add('done');
  setTimeout(() => { loaderEl.style.display = 'none'; }, 400);
}

// Character Animation Timeline (0..25s: Light 9 wicks -> Lift Menorah -> Walk to Arched Window -> Place facing Jerusalem!)
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

  // Reset leg stride unless walking
  poseBoneChar('LeftUpLeg', 0, 0, 0);
  poseBoneChar('RightUpLeg', 0, 0, 0);

  if (t < 15.0) {
    // Phase 1: Stand behind table facing +Z, light each cup cleanly in Halachic order
    if (personIgniteCandle) personIgniteCandle.visible = true;
    for (const [ti, widx] of CHAR_IGNITE_TIMES) {
      if (t >= ti) igniteWickImmediate(widx, true);
    }
    const active = CHAR_IGNITE_TIMES.reduce((acc, pair) => (t >= pair[0] - 0.8 ? pair : acc), CHAR_IGNITE_TIMES[0]);
    const cupX = (active[1] - 4) * 0.07;
    const bob = Math.sin(t * 2.5) * 0.05;

    personScene.position.set(0.24 + cupX * 0.32, 0, -2.30);
    personScene.rotation.set(0, 0, 0);

    poseBoneChar('Spine1', 0.10, -cupX * 0.25, 0);
    poseBoneChar('Head', 0.24, -cupX * 0.42, 0);
    // Left arm rests naturally beside waist
    poseBoneChar('LeftArm', 0.10, 0.0, -1.25);
    poseBoneLocal('LeftForeArm', 0, 0, 0.35);
    // Right arm extends smoothly forward & down to cup height (y~1.03, z~-1.90)
    poseBoneChar('RightArm', -0.32 + bob, 0.16 - cupX * 0.72, 1.16);
    poseBoneLocal('RightForeArm', 0, 0, -0.58 - bob);

    menorahGroup.position.copy(MENORAH_REST_POS);
    menorahGroup.rotation.set(0, 0, 0);
  } else if (t < 16.6) {
    // Phase 2: Reach both hands around the Hanoukia stem and lift smoothly off the table
    if (personIgniteCandle) personIgniteCandle.visible = false;
    const p = (t - 15.0) / 1.6;
    const sp = p * p * (3 - 2 * p);
    const px = THREE.MathUtils.lerp(0.24, 0.0, sp);
    const pz = -2.30;
    personScene.position.set(px, 0, pz);
    personScene.rotation.set(0, 0, 0);

    poseBoneChar('Spine1', 0.08, 0, 0);
    poseBoneChar('Head', 0.20, 0, 0);
    poseBoneChar('LeftArm', -0.28, -0.35, -1.22);
    poseBoneLocal('LeftForeArm', 0, 0, 0.92);
    poseBoneChar('RightArm', -0.28, 0.35, 1.22);
    poseBoneLocal('RightForeArm', 0, 0, -0.92);

    const my = THREE.MathUtils.lerp(tableTopY, 0.96, sp);
    menorahGroup.position.set(0, my, -1.90);
    menorahGroup.rotation.set(0, 0, 0);
  } else if (t < 18.6) {
    // Phase 3a: Pivot smoothly to face the arched Jerusalem window (-Z) keeping Menorah centered in front of chest
    if (personIgniteCandle) personIgniteCandle.visible = false;
    const p = (t - 16.6) / 2.0;
    const sp = p * p * (3 - 2 * p);
    const rotY = THREE.MathUtils.lerp(0.0, Math.PI, sp);
    const px = 0.0;
    const pz = THREE.MathUtils.lerp(-2.30, -2.42, sp);

    personScene.position.set(px, 0, pz);
    personScene.rotation.set(0, rotY, 0);

    poseBoneChar('Spine1', 0.05, 0, 0);
    poseBoneChar('Head', 0.16, 0, 0);
    poseBoneChar('LeftArm', -0.30, -0.35, -1.22);
    poseBoneLocal('LeftForeArm', 0, 0, 0.92);
    poseBoneChar('RightArm', -0.30, 0.35, 1.22);
    poseBoneLocal('RightForeArm', 0, 0, -0.92);

    menorahGroup.position.set(px + Math.sin(rotY) * 0.40, 0.98, pz + Math.cos(rotY) * 0.40);
    menorahGroup.rotation.set(0, rotY, 0);
  } else if (t < 22.4) {
    // Phase 3b: Walk straight toward the open window with both hands cradling the lit Menorah in front
    if (personIgniteCandle) personIgniteCandle.visible = false;
    const p = (t - 18.6) / 3.8;
    const sp = p * p * (3 - 2 * p);
    const walkBob = Math.sin(p * Math.PI * 6) * 0.012;
    const pz = THREE.MathUtils.lerp(-2.42, -3.38, sp);
    const rotY = Math.PI;

    personScene.position.set(0, walkBob, pz);
    personScene.rotation.set(0, rotY, 0);

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
    // Phase 3c: Place Menorah gently onto walnut windowsill & step back-right respectfully
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
    // Phase 4: Lit Hanoukia stands proudly on walnut windowsill facing Jerusalem 3D skyline
    if (personIgniteCandle) personIgniteCandle.visible = false;
    personScene.position.set(0.46, 0, -3.20);
    personScene.rotation.set(0, 2.58, 0);
    menorahGroup.position.copy(MENORAH_WINDOW_POS);
    menorahGroup.rotation.set(0, Math.PI, 0);

    poseBoneChar('Spine1', 0.02, 0, 0);
    poseBoneChar('Head', 0.08 + Math.sin(now * 1.1) * 0.02, -0.15, 0);
    poseBoneChar('LeftArm', 0.12, 0, -1.25);
    poseBoneLocal('LeftForeArm', 0, 0, 0.35);
    poseBoneChar('RightArm', 0.12, 0, 1.25);
    poseBoneLocal('RightForeArm', 0, 0, -0.35);
  }
}

// Input Handling (Mouse Drag Look + Hover + Click Ignite / Dreidel Spin + WASD + Hide HUD 'H')
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
    if (hoveredWickIdx !== null && playMode === 'self') {
      shamashReachAnim = { wickIdx: hoveredWickIdx, start: performance.now() / 1000, duration: 0.42, litTriggered: false };
    } else if (hoveredDreidel) {
      hoveredDreidel.vel = 26.0;
    }
  }
});

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyH') document.body.classList.toggle('hud-hidden');
  if (e.code === 'Space' && playMode === 'self') {
    e.preventDefault();
    const targetIdx = hoveredWickIdx !== null ? hoveredWickIdx : getNextSuggestedIdx();
    if (targetIdx !== null) shamashReachAnim = { wickIdx: targetIdx, start: performance.now() / 1000, duration: 0.42, litTriggered: false };
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// UI Controls Wiring
function refreshLabels() {
  const t = I18N[lang];
  document.documentElement.dir = t.dir;
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
  const maskOn = !document.getElementById('vr-mask').classList.contains('hidden');
  document.getElementById('btn-vr-mask').textContent = maskOn ? t.maskOn : t.maskOff;
  document.getElementById('btn-audio').textContent = audioEnabled ? t.audioOn : t.audioOff;
  document.getElementById('help-strip').textContent = t.help;
}

document.getElementById('btn-mode-scene').addEventListener('click', () => setPlayMode('character'));
document.getElementById('btn-mode-self').addEventListener('click', () => setPlayMode('self'));
document.getElementById('btn-cam-front').addEventListener('click', () => setCameraView('front'));
document.getElementById('btn-cam-left').addEventListener('click', () => setCameraView('left'));
document.getElementById('btn-cam-window').addEventListener('click', () => setCameraView('window'));
document.getElementById('btn-replay').addEventListener('click', () => setPlayMode('character'));
document.getElementById('btn-ignite-next').addEventListener('click', () => {
  const nxt = getNextSuggestedIdx();
  if (nxt !== null) shamashReachAnim = { wickIdx: nxt, start: performance.now() / 1000, duration: 0.42, litTriggered: false };
});
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

// Deterministic Test API
window.__FPV_DEBUG__ = {
  getState: () => ({
    loaded: wicks.length === 9 && !!handRoot && !!personScene,
    playMode,
    sceneTime: Number(sceneTime.toFixed(2)),
    litRegular: getLitRegularCount(),
    menorahZ: menorahGroup ? Number(menorahGroup.position.z.toFixed(2)) : null,
    lang
  }),
  setMode: (m) => setPlayMode(m),
  setView: (v) => setCameraView(v),
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
  reset: () => resetAllWicks()
};

// Render Loop
let prevT = performance.now() / 1000;
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - prevT);
  prevT = now;

  // WASD / Arrows walking
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const speed = 1.25 * dt;
  if (keys.has('KeyW') || keys.has('ArrowUp')) playerRig.position.addScaledVector(fwd, speed);
  if (keys.has('KeyS') || keys.has('ArrowDown')) playerRig.position.addScaledVector(fwd, -speed);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) playerRig.position.addScaledVector(right, -speed);
  if (keys.has('KeyD') || keys.has('ArrowRight')) playerRig.position.addScaledVector(right, speed);
  playerRig.position.x = Math.max(-2.6, Math.min(2.6, playerRig.position.x));
  playerRig.position.z = Math.max(-3.1, Math.min(1.8, playerRig.position.z));

  updateCharacterTimeline(dt, now);

  // Hover Raycast (Wicks in self mode, Dreidels anytime)
  const rcVec = renderer.xr.isPresenting ? new THREE.Vector2(0, 0) : pointerNDC;
  raycaster.setFromCamera(rcVec, camera);
  const reticle = document.getElementById('reticle');
  const hint = document.getElementById('hover-hint');

  hoveredWickIdx = null;
  hoveredDreidel = null;
  if (playMode === 'self') {
    const hits = raycaster.intersectObjects(wicks.filter((w) => !w.lit).map((w) => w.hitMesh), false);
    if (hits.length > 0) hoveredWickIdx = hits[0].object.userData.wickIdx;
  }
  if (hoveredWickIdx !== null) {
    reticle.classList.add('hot');
    hint.textContent = I18N[lang].hintWick(hoveredWickIdx);
    hint.classList.add('visible');
  } else {
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

  // FPV Right Hand Animation (Self Mode)
  if (handRoot && playMode === 'self' && !renderer.xr.isPresenting) {
    const restLocal = new THREE.Vector3(0.24 + pointerNDC.x * 0.05, -0.17 + pointerNDC.y * 0.04 + Math.sin(now * 2.1) * 0.005, -0.44);
    if (shamashReachAnim) {
      const elapsed = now - shamashReachAnim.start;
      const p = Math.min(1.0, elapsed / shamashReachAnim.duration);
      const w = wicks.find((x) => x.idx === shamashReachAnim.wickIdx);
      if (w) {
        const targetWorld = new THREE.Vector3();
        w.flame.getWorldPosition(targetWorld);
        const targetCamFlame = camera.worldToLocal(targetWorld.add(new THREE.Vector3(0, 0.01, 0.01)));
        const targetHandLocal = targetCamFlame.sub(handShamashLocalTip);
        handRoot.position.lerpVectors(restLocal, targetHandLocal, Math.sin(p * Math.PI));
        if (p >= 0.48 && !shamashReachAnim.litTriggered) {
          shamashReachAnim.litTriggered = true;
          igniteWickImmediate(shamashReachAnim.wickIdx, true);
        }
      }
      if (p >= 1.0) shamashReachAnim = null;
    } else {
      handRoot.position.lerp(restLocal, 0.14);
    }
  }

  // Flames flicker + Halos + Dreidels + Sparks + Embers
  const nextIdx = getNextSuggestedIdx();
  for (const w of wicks) {
    if (w.lit) {
      const ph = w.flame.userData.phase;
      w.flame.scale.set(1 + 0.09 * Math.cos(now * 6.3 + ph), 1 + 0.15 * Math.sin(now * 8.5 + ph), 1);
      w.flame.rotation.z = 0.06 * Math.sin(now * 5.2 + ph);
      if (w.flame.userData.light) w.flame.userData.light.intensity = 0.95 + 0.16 * Math.sin(now * 10.0 + ph);
    } else if (playMode === 'self') {
      const isNext = w.idx === nextIdx;
      w.halo.material.opacity = isNext ? (0.55 + 0.40 * Math.sin(now * 4.5)) : 0.22;
      const hs = isNext ? (1.12 + 0.18 * Math.sin(now * 4.5)) : 0.85;
      w.halo.scale.set(hs, hs, 1);
    }
  }

  if (personIgniteFlame && personIgniteCandle?.visible) {
    personIgniteFlame.scale.set(1, 1 + 0.14 * Math.sin(now * 9.0), 1);
  }
  if (handFlame && handRoot?.visible) {
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
