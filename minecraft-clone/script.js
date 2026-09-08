import * as THREE from "three";

/* =========================================================================
   BLOCKWELT — a small self-contained Minecraft-like voxel game.
   No external assets: terrain is procedurally generated (Perlin/fBm noise),
   blocks are rendered as merged, face-culled chunk meshes with vertex
   colors (no textures needed).
   ========================================================================= */

/* ---------------------------------------------------------------------- *
 *  World constants
 * ---------------------------------------------------------------------- */
const CHUNK_SIZE = 16;
const CHUNKS_X = 4;
const CHUNKS_Z = 4;
const WORLD_W = CHUNK_SIZE * CHUNKS_X; // 64
const WORLD_D = CHUNK_SIZE * CHUNKS_Z; // 64
const WORLD_H = 40;
const SEA_LEVEL = 15;

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  LEAVES: 6,
  WATER: 7,
  BEDROCK: 8,
};

const HOTBAR = [
  BLOCK.GRASS,
  BLOCK.DIRT,
  BLOCK.STONE,
  BLOCK.SAND,
  BLOCK.WOOD,
  BLOCK.LEAVES,
  BLOCK.WATER,
];

const BLOCK_COLOR = {
  [BLOCK.GRASS]: { top: [0.36, 0.62, 0.24], side: [0.42, 0.36, 0.2], bottom: [0.4, 0.28, 0.15] },
  [BLOCK.DIRT]: { all: [0.4, 0.28, 0.15] },
  [BLOCK.STONE]: { all: [0.5, 0.5, 0.52] },
  [BLOCK.SAND]: { all: [0.86, 0.8, 0.56] },
  [BLOCK.WOOD]: { top: [0.55, 0.42, 0.25], side: [0.36, 0.25, 0.14], bottom: [0.55, 0.42, 0.25] },
  [BLOCK.LEAVES]: { all: [0.2, 0.45, 0.15] },
  [BLOCK.WATER]: { all: [0.2, 0.45, 0.78] },
  [BLOCK.BEDROCK]: { all: [0.15, 0.15, 0.17] },
};

function isOpaque(type) {
  return type !== BLOCK.AIR && type !== BLOCK.WATER;
}
function isSolidForPlayer(type) {
  return type !== BLOCK.AIR && type !== BLOCK.WATER;
}

/* ---------------------------------------------------------------------- *
 *  Seeded RNG + Perlin noise (self-contained, no external libs)
 * ---------------------------------------------------------------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPermutation(rand) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

const GRADIENTS = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lerp(a, b, t) {
  return a + t * (b - a);
}
function grad(hash, x, y) {
  const g = GRADIENTS[hash & 7];
  return g[0] * x + g[1] * y;
}
function perlin2(perm, x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = perm[perm[X] + Y];
  const ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y];
  const bb = perm[perm[X + 1] + Y + 1];
  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
}
function fbm(perm, x, y, octaves) {
  let total = 0, amp = 1, freq = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    total += perlin2(perm, x * freq, y * freq) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / maxAmp;
}

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

/* ---------------------------------------------------------------------- *
 *  World data
 * ---------------------------------------------------------------------- */
const SEED = Math.floor(Math.random() * 1e9);
const rand = mulberry32(SEED);
const perm = buildPermutation(rand);

const world = new Uint8Array(WORLD_W * WORLD_H * WORLD_D);
function idx(x, y, z) {
  return x + z * WORLD_W + y * WORLD_W * WORLD_D;
}
function inBounds(x, y, z) {
  return x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H && z >= 0 && z < WORLD_D;
}
function getBlockRaw(x, y, z) {
  if (!inBounds(x, y, z)) return BLOCK.AIR;
  return world[idx(x, y, z)];
}
function setBlockRaw(x, y, z, type) {
  if (!inBounds(x, y, z)) return;
  world[idx(x, y, z)] = type;
}
/** Get block, treating out-of-world X/Z as solid bedrock walls and below-world as bedrock. */
function getBlock(x, y, z) {
  x = Math.floor(x);
  y = Math.floor(y);
  z = Math.floor(z);
  if (y < 0) return BLOCK.BEDROCK;
  if (y >= WORLD_H) return BLOCK.AIR;
  if (x < 0 || x >= WORLD_W || z < 0 || z >= WORLD_D) return BLOCK.BEDROCK;
  return world[idx(x, y, z)];
}

const heightMap = new Int16Array(WORLD_W * WORLD_D);

function generateWorld() {
  // Heightmap + terrain columns
  for (let x = 0; x < WORLD_W; x++) {
    for (let z = 0; z < WORLD_D; z++) {
      const n = fbm(perm, x * 0.045, z * 0.045, 4);
      const h = Math.round(SEA_LEVEL + n * 9);
      const height = Math.max(3, Math.min(WORLD_H - 8, h));
      heightMap[x + z * WORLD_W] = height;

      for (let y = 0; y <= height; y++) {
        let type;
        if (y === 0) type = BLOCK.BEDROCK;
        else if (y < height - 3) type = BLOCK.STONE;
        else if (y < height) type = BLOCK.DIRT;
        else {
          // surface layer
          if (height <= SEA_LEVEL + 1) type = BLOCK.SAND;
          else type = BLOCK.GRASS;
        }
        setBlockRaw(x, y, z, type);
      }
      if (height < SEA_LEVEL) {
        for (let y = height + 1; y <= SEA_LEVEL; y++) {
          setBlockRaw(x, y, z, BLOCK.WATER);
        }
      }
    }
  }

  // Trees
  const margin = 3;
  for (let x = margin; x < WORLD_W - margin; x++) {
    for (let z = margin; z < WORLD_D - margin; z++) {
      const h = heightMap[x + z * WORLD_W];
      if (h <= SEA_LEVEL + 1) continue; // no trees on beach/underwater
      if (getBlockRaw(x, h, z) !== BLOCK.GRASS) continue;
      if (rand() > 0.02) continue;
      plantTree(x, h, z);
    }
  }
}

function plantTree(x, h, z) {
  const trunkHeight = 4 + Math.floor(rand() * 2);
  for (let i = 1; i <= trunkHeight; i++) {
    setBlockRaw(x, h + i, z, BLOCK.WOOD);
  }
  const topY = h + trunkHeight;
  for (let ly = -2; ly <= 1; ly++) {
    const ry = topY + ly;
    const radius = ly <= -1 ? 2 : 1;
    for (let lx = -radius; lx <= radius; lx++) {
      for (let lz = -radius; lz <= radius; lz++) {
        if (Math.abs(lx) === radius && Math.abs(lz) === radius && rand() < 0.6) continue;
        const wx = x + lx, wz = z + lz;
        if (!inBounds(wx, ry, wz)) continue;
        if (getBlockRaw(wx, ry, wz) === BLOCK.AIR) setBlockRaw(wx, ry, wz, BLOCK.LEAVES);
      }
    }
  }
}

/* ---------------------------------------------------------------------- *
 *  Renderer / Scene setup
 * ---------------------------------------------------------------------- */
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const SKY_COLOR = 0x8fc7ec;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 40, 85);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.05,
  200
);

const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff6da, 0.8);
sun.position.set(60, 90, 30);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x3a2f22, 0.35));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------------------------------------------------------------- *
 *  Chunk meshing
 * ---------------------------------------------------------------------- */
const FACES = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] }, // +X
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] }, // -X
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, // +Y
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] }, // -Y
  { dir: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] }, // +Z
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }, // -Z
];

function faceColor(type, faceIndex) {
  const c = BLOCK_COLOR[type];
  if (c.all) return c.all;
  if (faceIndex === 2) return c.top;
  if (faceIndex === 3) return c.bottom;
  return c.side;
}

const opaqueMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const waterMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.68,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const chunkMeshes = {}; // key "cx,cz" -> { opaque: Mesh|null, water: Mesh|null }

function chunkKey(cx, cz) {
  return cx + "," + cz;
}

function buildChunkGeometry(cx, cz) {
  const opaquePos = [], opaqueNorm = [], opaqueCol = [], opaqueIdx = [];
  const waterPos = [], waterNorm = [], waterCol = [], waterIdx = [];
  let oCount = 0, wCount = 0;

  const x0 = cx * CHUNK_SIZE, z0 = cz * CHUNK_SIZE;

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = x0 + lx, wz = z0 + lz;
      for (let y = 0; y < WORLD_H; y++) {
        const type = getBlockRaw(wx, y, wz);
        if (type === BLOCK.AIR) continue;

        const water = type === BLOCK.WATER;
        const shade = 0.9 + hash3(wx, y, wz) * 0.2;

        for (let f = 0; f < FACES.length; f++) {
          const face = FACES[f];
          const nx = wx + face.dir[0], ny = y + face.dir[1], nz = wz + face.dir[2];
          const neighbor = getBlock(nx, ny, nz);

          let draw;
          if (water) draw = neighbor === BLOCK.AIR;
          else draw = !isOpaque(neighbor);
          if (!draw) continue;

          const col = faceColor(type, f);
          const r = col[0] * shade, g = col[1] * shade, b = col[2] * shade;

          const posArr = water ? waterPos : opaquePos;
          const normArr = water ? waterNorm : opaqueNorm;
          const colArr = water ? waterCol : opaqueCol;
          const idxArr = water ? waterIdx : opaqueIdx;
          let count = water ? wCount : oCount;

          for (let c = 0; c < 4; c++) {
            const corner = face.corners[c];
            posArr.push(wx + corner[0], y + corner[1], wz + corner[2]);
            normArr.push(face.dir[0], face.dir[1], face.dir[2]);
            colArr.push(r, g, b);
          }
          idxArr.push(count, count + 1, count + 2, count, count + 2, count + 3);
          count += 4;
          if (water) wCount = count;
          else oCount = count;
        }
      }
    }
  }

  return {
    opaque: opaquePos.length ? { positions: opaquePos, normals: opaqueNorm, colors: opaqueCol, indices: opaqueIdx } : null,
    water: waterPos.length ? { positions: waterPos, normals: waterNorm, colors: waterCol, indices: waterIdx } : null,
  };
}

function makeMesh(data, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(data.colors, 3));
  geo.setIndex(data.indices);
  return new THREE.Mesh(geo, material);
}

function rebuildChunk(cx, cz) {
  if (cx < 0 || cx >= CHUNKS_X || cz < 0 || cz >= CHUNKS_Z) return;
  const key = chunkKey(cx, cz);
  const existing = chunkMeshes[key];
  if (existing) {
    if (existing.opaque) {
      scene.remove(existing.opaque);
      existing.opaque.geometry.dispose();
    }
    if (existing.water) {
      scene.remove(existing.water);
      existing.water.geometry.dispose();
    }
  }

  const data = buildChunkGeometry(cx, cz);
  const entry = { opaque: null, water: null };
  if (data.opaque) {
    entry.opaque = makeMesh(data.opaque, opaqueMaterial);
    scene.add(entry.opaque);
  }
  if (data.water) {
    entry.water = makeMesh(data.water, waterMaterial);
    scene.add(entry.water);
  }
  chunkMeshes[key] = entry;
}

function rebuildAllChunks() {
  for (let cx = 0; cx < CHUNKS_X; cx++) {
    for (let cz = 0; cz < CHUNKS_Z; cz++) {
      rebuildChunk(cx, cz);
    }
  }
}

function setBlock(x, y, z, type) {
  if (!inBounds(x, y, z)) return;
  setBlockRaw(x, y, z, type);
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const lx = x - cx * CHUNK_SIZE;
  const lz = z - cz * CHUNK_SIZE;
  rebuildChunk(cx, cz);
  if (lx === 0) rebuildChunk(cx - 1, cz);
  if (lx === CHUNK_SIZE - 1) rebuildChunk(cx + 1, cz);
  if (lz === 0) rebuildChunk(cx, cz - 1);
  if (lz === CHUNK_SIZE - 1) rebuildChunk(cx, cz + 1);
}

/* ---------------------------------------------------------------------- *
 *  Player: movement, physics, collision
 * ---------------------------------------------------------------------- */
const EYE_HEIGHT = 1.62;
const PLAYER_HEIGHT = 1.8;
const PLAYER_HALF_WIDTH = 0.3;
const GRAVITY = -24;
const JUMP_SPEED = 8.2;
const WALK_SPEED = 4.6;
const SPRINT_SPEED = 7.2;
const FLY_SPEED = 9;

const player = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  onGround: false,
  flying: false,
};

function findSpawn() {
  const cx = Math.floor(WORLD_W / 2);
  const cz = Math.floor(WORLD_D / 2);
  let sx = cx, sz = cz;
  // search outward a bit for dry land
  for (let r = 0; r < 20; r++) {
    const tx = cx + Math.floor((rand() - 0.5) * r * 2);
    const tz = cz + Math.floor((rand() - 0.5) * r * 2);
    if (tx < 2 || tz < 2 || tx >= WORLD_W - 2 || tz >= WORLD_D - 2) continue;
    const h = heightMap[tx + tz * WORLD_W];
    if (h > SEA_LEVEL + 1) {
      sx = tx;
      sz = tz;
      break;
    }
  }
  const h = heightMap[sx + sz * WORLD_W];
  player.position.set(sx + 0.5, h + 1 + EYE_HEIGHT, sz + 0.5);
}

function isColliding(pos) {
  const feetY = pos.y - EYE_HEIGHT;
  const topY = feetY + PLAYER_HEIGHT;
  const minX = pos.x - PLAYER_HALF_WIDTH, maxX = pos.x + PLAYER_HALF_WIDTH;
  const minZ = pos.z - PLAYER_HALF_WIDTH, maxZ = pos.z + PLAYER_HALF_WIDTH;

  const bx0 = Math.floor(minX), bx1 = Math.floor(maxX);
  const bz0 = Math.floor(minZ), bz1 = Math.floor(maxZ);
  const by0 = Math.floor(feetY), by1 = Math.floor(topY);

  for (let bx = bx0; bx <= bx1; bx++) {
    for (let by = by0; by <= by1; by++) {
      for (let bz = bz0; bz <= bz1; bz++) {
        if (isSolidForPlayer(getBlock(bx, by, bz))) return true;
      }
    }
  }
  return false;
}

function movePlayer(dx, dy, dz) {
  const p = player.position;

  if (dx !== 0) {
    const test = p.clone();
    test.x += dx;
    if (!isColliding(test)) p.x = test.x;
  }
  if (dz !== 0) {
    const test = p.clone();
    test.z += dz;
    if (!isColliding(test)) p.z = test.z;
  }
  if (dy !== 0) {
    const test = p.clone();
    test.y += dy;
    if (!isColliding(test)) {
      p.y = test.y;
      player.onGround = false;
    } else {
      if (dy < 0) player.onGround = true;
      player.velocity.y = 0;
    }
  }
}

/* Keep the player from wandering into the invisible world-edge walls forever */
function clampToWorld() {
  const margin = 0.5;
  player.position.x = Math.max(margin, Math.min(WORLD_W - margin, player.position.x));
  player.position.z = Math.max(margin, Math.min(WORLD_D - margin, player.position.z));
  if (player.position.y < -20) {
    findSpawn();
    player.velocity.set(0, 0, 0);
  }
}

/* ---------------------------------------------------------------------- *
 *  Input
 * ---------------------------------------------------------------------- */
const keys = new Set();
let selectedSlot = 0;
let flyKeyLatch = false;

document.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code >= "Digit1" && e.code <= "Digit7") {
    selectedSlot = Number(e.code.slice(5)) - 1;
    updateHotbarUI();
  }
  if (e.code === "KeyF" && !flyKeyLatch) {
    flyKeyLatch = true;
    player.flying = !player.flying;
    player.velocity.set(0, 0, 0);
  }
  if (e.code === "Escape") {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
});
document.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "KeyF") flyKeyLatch = false;
});

canvas.addEventListener("click", () => {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== canvas) return;
  const sensitivity = 0.0022;
  player.yaw -= e.movementX * sensitivity;
  player.pitch -= e.movementY * sensitivity;
  const limit = Math.PI / 2 - 0.01;
  player.pitch = Math.max(-limit, Math.min(limit, player.pitch));
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

canvas.addEventListener("mousedown", (e) => {
  if (document.pointerLockElement !== canvas) return;
  const target = raycastBlock();
  if (!target) return;

  if (e.button === 0) {
    // break
    const t = getBlock(target.block.x, target.block.y, target.block.z);
    if (t !== BLOCK.BEDROCK) {
      setBlock(target.block.x, target.block.y, target.block.z, BLOCK.AIR);
    }
  } else if (e.button === 2) {
    // place
    if (target.place) {
      const { x, y, z } = target.place;
      if (inBounds(x, y, z) && getBlockRaw(x, y, z) === BLOCK.AIR) {
        const testPos = player.position.clone();
        const wouldCollide = (() => {
          const feetY = testPos.y - EYE_HEIGHT;
          const topY = feetY + PLAYER_HEIGHT;
          const inX = x + 1 > testPos.x - PLAYER_HALF_WIDTH && x < testPos.x + PLAYER_HALF_WIDTH;
          const inZ = z + 1 > testPos.z - PLAYER_HALF_WIDTH && z < testPos.z + PLAYER_HALF_WIDTH;
          const inY = y + 1 > feetY && y < topY;
          return inX && inZ && inY;
        })();
        if (!wouldCollide) {
          setBlock(x, y, z, HOTBAR[selectedSlot]);
        }
      }
    }
  }
});

/* Mouse wheel to cycle hotbar */
window.addEventListener(
  "wheel",
  (e) => {
    if (document.pointerLockElement !== canvas) return;
    e.preventDefault();
    selectedSlot = (selectedSlot + (e.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length;
    updateHotbarUI();
  },
  { passive: false }
);

/* ---------------------------------------------------------------------- *
 *  Raycasting (simple ray marching through the voxel grid)
 * ---------------------------------------------------------------------- */
const rayDir = new THREE.Vector3();
function raycastBlock() {
  camera.getWorldDirection(rayDir);
  const pos = camera.position;
  const step = 0.04;
  const maxDist = 6.5;
  let lastEmpty = null;

  for (let t = 0; t < maxDist; t += step) {
    const px = pos.x + rayDir.x * t;
    const py = pos.y + rayDir.y * t;
    const pz = pos.z + rayDir.z * t;
    const bx = Math.floor(px), by = Math.floor(py), bz = Math.floor(pz);
    const b = getBlock(bx, by, bz);
    if (b !== BLOCK.AIR && b !== BLOCK.WATER) {
      return { block: { x: bx, y: by, z: bz }, place: lastEmpty };
    }
    lastEmpty = { x: bx, y: by, z: bz };
  }
  return null;
}

/* Highlight box around targeted block */
const highlightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
const highlightBox = new THREE.LineSegments(highlightGeo, highlightMat);
highlightBox.visible = false;
scene.add(highlightBox);

/* ---------------------------------------------------------------------- *
 *  Hotbar UI
 * ---------------------------------------------------------------------- */
const hotbarEl = document.getElementById("hotbar");
function rgbToCss(c) {
  return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
}
function buildHotbarUI() {
  hotbarEl.innerHTML = "";
  HOTBAR.forEach((type, i) => {
    const slot = document.createElement("div");
    slot.className = "hotbar-slot";
    const col = BLOCK_COLOR[type];
    const mainColor = col.all || col.top;
    slot.style.background = rgbToCss(mainColor);
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(i + 1);
    slot.appendChild(num);
    hotbarEl.appendChild(slot);
  });
  updateHotbarUI();
}
function updateHotbarUI() {
  [...hotbarEl.children].forEach((el, i) => {
    el.classList.toggle("selected", i === selectedSlot);
  });
}

/* ---------------------------------------------------------------------- *
 *  UI wiring (start / pause / loading overlays)
 * ---------------------------------------------------------------------- */
const startOverlay = document.getElementById("start-overlay");
const pauseOverlay = document.getElementById("pause-overlay");
const loadingOverlay = document.getElementById("loading-overlay");
const debugInfo = document.getElementById("debug-info");

document.getElementById("start-btn").addEventListener("click", () => {
  canvas.requestPointerLock();
});
document.getElementById("resume-btn").addEventListener("click", () => {
  canvas.requestPointerLock();
});
document.getElementById("newworld-btn").addEventListener("click", () => {
  window.location.reload();
});

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    startOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    document.body.classList.add("playing");
  } else {
    document.body.classList.remove("playing");
    if (!startOverlay.classList.contains("hidden")) return;
    pauseOverlay.classList.remove("hidden");
  }
});

/* ---------------------------------------------------------------------- *
 *  Main loop
 * ---------------------------------------------------------------------- */
const clock = new THREE.Clock();

function updatePlayer(dt) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.sin(player.yaw + Math.PI / 2), 0, Math.cos(player.yaw + Math.PI / 2));

  let moveX = 0, moveZ = 0;
  const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const speed = player.flying ? FLY_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;

  if (keys.has("KeyW")) { moveX += forward.x; moveZ += forward.z; }
  if (keys.has("KeyS")) { moveX -= forward.x; moveZ -= forward.z; }
  if (keys.has("KeyD")) { moveX += right.x; moveZ += right.z; }
  if (keys.has("KeyA")) { moveX -= right.x; moveZ -= right.z; }

  const len = Math.hypot(moveX, moveZ);
  if (len > 0) {
    moveX = (moveX / len) * speed;
    moveZ = (moveZ / len) * speed;
  }

  if (player.flying) {
    let vy = 0;
    if (keys.has("Space")) vy += speed;
    if (sprinting) vy -= speed;
    movePlayer(moveX * dt, vy * dt, moveZ * dt);
    player.velocity.y = 0;
  } else {
    if (keys.has("Space") && player.onGround) {
      player.velocity.y = JUMP_SPEED;
      player.onGround = false;
    }
    player.velocity.y += GRAVITY * dt;
    player.velocity.y = Math.max(player.velocity.y, -50);
    movePlayer(moveX * dt, player.velocity.y * dt, moveZ * dt);
  }

  clampToWorld();

  camera.position.copy(player.position);
  const euler = new THREE.Euler(player.pitch, player.yaw, 0, "YXZ");
  camera.quaternion.setFromEuler(euler);
  camera.updateMatrixWorld();
}

function updateHighlight() {
  const target = raycastBlock();
  if (target) {
    highlightBox.visible = true;
    highlightBox.position.set(target.block.x + 0.5, target.block.y + 0.5, target.block.z + 0.5);
  } else {
    highlightBox.visible = false;
  }
}

function updateDebug() {
  debugInfo.textContent =
    `Position: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}\n` +
    `Modus: ${player.flying ? "Fliegen" : "Laufen"}\n` +
    `Seed: ${SEED}`;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.06);

  if (document.pointerLockElement === canvas) {
    updatePlayer(dt);
    updateHighlight();
    updateDebug();
  }

  renderer.render(scene, camera);
}

/* ---------------------------------------------------------------------- *
 *  Boot
 * ---------------------------------------------------------------------- */
function boot() {
  generateWorld();
  rebuildAllChunks();
  findSpawn();
  camera.position.copy(player.position);
  buildHotbarUI();
  loadingOverlay.classList.add("hidden");
  animate();
}

// Give the browser a frame to paint the loading screen before the
// (synchronous, potentially heavy) world generation blocks the main thread.
requestAnimationFrame(() => setTimeout(boot, 30));
