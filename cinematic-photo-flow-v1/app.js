"use strict";

const byId = id => document.getElementById(id);
const viewport = byId("viewport");
const stage = byId("stage");
const track = byId("track");
const scene = byId("scene");
const strip = byId("strip");
const dropArea = byId("upload-area");
const fileInput = byId("files");
const focalDialog = byId("focal-dialog");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const demo = [
  ["Controluce", 1.34], ["Ora dorata", .75], ["Aria fredda", 1.34],
  ["Ombra verde", .75], ["Ritratto in monocromia", 1.34], ["Costa all’imbrunire", 1.7]
].map(([name, ratio], index) => ({
  id: "demo-" + index, name, ratio, x: 50, y: 50, src: "demo/" + (index + 1) + ".webp"
}));

let images = demo;
let playback = [];
let route = [];
const depthPlanes = [-1.47, -.735, 0, .72, 1.44];
let routeSeed = 0;
let custom = false;
let selected = 0;
let step = 380;
let displayed = 0;
let frame = 0;
let sceneDirty = false;
let sceneInView = true;
let sceneWidth = 0;
let sceneHeight = 0;
let sceneLens = 510;
let lastPrefetch = -1;
let previousTime = 0;
let previousCamera = null;
let motionBlur = 0;
let replacementId = null;
let replaceGallery = false;
let busy = false;
let ready = false;
let lastCounter = "";
let saving = Promise.resolve();
const cards = new Map();
const preparedPhotos = new Map();
const photoMetrics = new WeakMap();
const depthBand = Math.min(...depthPlanes.slice(1).map((z, index) => z - depthPlanes[index])) * .46;
const maximumOverlap = .05;
const filmSurface = byId("film-surface");
const opticalGlow = byId("optical-glow");
const origin = { x: 0, y: 0, z: 0 };
const grainPlane = { x: 0, y: 0, z: -.78 };
const dustPlanes = [
  { canvas: byId("dust-far"), z: -.73, count: 23 },
  { canvas: byId("dust-mid"), z: -.27, count: 24 },
  { canvas: byId("dust-near"), z: .26, count: 15 }
].map(plane => ({
  ...plane,
  context: plane.canvas.getContext("2d"),
  dirtyRects: [],
  particles: Array.from({ length: plane.count }, () => ({
    x: Math.random(), y: Math.random(), z: (Math.random() - .5) * .07,
    speedX: (Math.random() - .38) * .034,
    speedY: .010 + Math.random() * .026,
    radius: .38 + Math.random() * 1.05,
    phase: Math.random() * Math.PI * 2,
    frequency: .55 + Math.random() * 1.05
  }))
}));
const dustGlowSprites = new Map();
let dustTime = 0;
let lastDustTime = 0;
let filmWidth = 0;
let filmHeight = 0;
let filmCamera = origin;
const database = new Promise((resolve, reject) => {
  const request = indexedDB.open("cinematic-photo-flow", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("project");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
}).catch(() => null);

async function projectTransaction(mode, action) {
  const db = await database;
  if (!db) throw new Error("Memoria del browser indisponibile");
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("project", mode);
    const request = action(transaction.objectStore("project"));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function keepProject() {
  const snapshot = images.map(({ src, ...image }) => image);
  byId("save-state").textContent = "Salvataggio…";
  saving = saving.then(async () => {
    try {
      await projectTransaction("readwrite", store => store.put(snapshot, "sequence"));
      byId("save-state").textContent = "Salvata su questo browser";
    } catch {
      byId("save-state").textContent = "Salvataggio locale non disponibile";
    }
  });
}

function updateLayout(reset = false) {
  const currentPosition = reset ? Math.max(0, playback.indexOf(images[selected]))
    : viewport.scrollTop / step;
  step = Math.max(240, Math.round(viewport.clientHeight * .72));
  sceneWidth = stage.clientWidth;
  sceneHeight = stage.clientHeight;
  sceneLens = Math.max(510, sceneHeight * 1.4);
  scene.style.setProperty("--scene-lens", sceneLens + "px");
  track.style.setProperty("--travel", Math.max(0, playback.length - 1) * step + "px");
  viewport.scrollTop = currentPosition * step;
  settledIndex = clamp(Math.round(currentPosition), 0, Math.max(0, playback.length - 1));
  if (reset) {
    displayed = currentPosition;
    previousCamera = null;
    motionBlur = 0;
  }
  requestRender();
}

function queueFrame() {
  if (!frame && !document.hidden && sceneInView) frame = requestAnimationFrame(tick);
}

function requestRender() {
  sceneDirty = true;
  queueFrame();
}

function tick(time) {
  frame = 0;
  if (document.hidden || !sceneInView) return;
  const repaintScene = sceneDirty;
  if (repaintScene) {
    sceneDirty = false;
    render(time);
  }

  if (reducedMotion.matches) {
    if (repaintScene) drawDust();
    return;
  }
  // Camera and dust use the same pose on scroll. At rest only the dust needs painting.
  const elapsed = lastDustTime ? time - lastDustTime : 33;
  if (repaintScene || elapsed >= 32) {
    dustTime += Math.min(elapsed, 80) / 1000;
    lastDustTime = time;
    drawDust();
  }
  queueFrame();
}

function syncVisibility() {
  previousTime = 0;
  lastDustTime = 0;
  if ((document.hidden || !sceneInView) && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  requestRender();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ease(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function makeStagePhoto(image) {
  const photo = new Image();
  photo.alt = "";
  photo.decoding = "async";
  photo.src = image.src;
  return photo;
}

function prepareNearbyPhotos(center) {
  if (center === lastPrefetch) return;
  lastPrefetch = center;
  const nearby = new Set();
  for (let index = Math.max(0, center - 3); index <= center + 3 && playback[index]; index++) {
    const image = playback[index];
    nearby.add(image.id);
    if (cards.has(image.id) || preparedPhotos.has(image.id)) continue;
    const photo = makeStagePhoto(image);
    preparedPhotos.set(image.id, photo);
    photo.decode?.().catch(() => {});
  }
  for (const id of preparedPhotos.keys()) if (!nearby.has(id)) preparedPhotos.delete(id);
}

function mountCard(image) {
  const card = document.createElement("figure");
  card.className = "photo";
  const photo = preparedPhotos.get(image.id) || makeStagePhoto(image);
  preparedPhotos.delete(image.id);
  card.append(photo);
  scene.append(card);
  cards.set(image.id, card);
  return card;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function frameAttitude(imageId) {
  let seed = routeSeed;
  for (const character of imageId) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  const random = seededRandom(seed);
  const signedAngle = (min, max) => (random() < .5 ? -1 : 1) * (min + random() * (max - min));
  const pitch = signedAngle(27, 53);
  const yaw = signedAngle(30, 57);
  return {
    entry: axisAngle({ x: pitch, y: yaw, z: signedAngle(5, 22) }),
    exit: axisAngle({ x: -pitch * (.68 + random() * .34), y: -yaw * (.77 + random() * .25),
      z: signedAngle(7, 25) })
  };
}

function axisAngle(pose) {
  const halfAngle = Math.PI / 360;
  const cx = Math.cos(pose.x * halfAngle);
  const sx = Math.sin(pose.x * halfAngle);
  const cy = Math.cos(pose.y * halfAngle);
  const sy = Math.sin(pose.y * halfAngle);
  const cz = Math.cos(pose.z * halfAngle);
  const sz = Math.sin(pose.z * halfAngle);
  const x = sx * cy * cz + cx * sy * sz;
  const y = cx * sy * cz - sx * cy * sz;
  const z = cx * cy * sz + sx * sy * cz;
  const w = cx * cy * cz - sx * sy * sz;
  const length = Math.hypot(x, y, z);
  return {
    axis: [x / length, y / length, z / length],
    angle: 2 * Math.atan2(length, w) * 180 / Math.PI
  };
}

function frameRotation(attitude, offset) {
  const pose = offset >= 0 ? attitude.entry : attitude.exit;
  const angle = pose.angle * ease((Math.abs(offset) - .075) / .78);
  const [x, y, z] = pose.axis;
  const radians = angle * Math.PI / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const remainder = 1 - cos;
  return {
    css: "rotate3d(" + pose.axis.map(value => value.toFixed(5)).join(",") + "," + angle.toFixed(2) + "deg)",
    xx: cos + x * x * remainder,
    xy: x * y * remainder - z * sin,
    yx: y * x * remainder + z * sin,
    yy: cos + y * y * remainder,
    zx: z * x * remainder - y * sin,
    zy: z * y * remainder + x * sin
  };
}

function confinedTilt(depth, rotation, width, height, lens) {
  const excursion = (Math.abs(rotation.zx) * width + Math.abs(rotation.zy) * height) / 2;
  if (excursion < .01) return 1;
  const center = projectDepth(depth);
  const room = Math.min(center - projectDepth(depth - depthBand),
    projectDepth(depth + depthBand) - center) * lens;
  return clamp((room - .12) / excursion, .0001, 1);
}

function shuffled(items, random) {
  const result = items.slice();
  for (let last = result.length - 1; last > 0; last--) {
    const other = Math.floor(random() * (last + 1));
    [result[last], result[other]] = [result[other], result[last]];
  }
  return result;
}

function buildDepths(length, random) {
  const depths = [];
  while (depths.length < length) {
    const deck = shuffled(depthPlanes, random);
    if (depths.length && deck[0] === depths.at(-1)) deck.push(deck.shift());
    const ascending = deck.slice(1).every((z, i) => z > deck[i]);
    const descending = deck.slice(1).every((z, i) => z < deck[i]);
    if (ascending || descending) [deck[3], deck[4]] = [deck[4], deck[3]];
    depths.push(...deck);
  }
  return depths.slice(0, length);
}

function buildRoute(length, random) {
  const depths = buildDepths(length, random);
  if (!length) return [];
  const shots = [{ x: 0, y: 0, z: depths[0] }];
  let bearing = random() * Math.PI * 2;
  for (let index = 1; index < length; index++) {
    const start = shots[index - 1];
    const turn = .88 + random() * 1.46;
    bearing += (random() < .5 ? -1 : 1) * turn;
    const x = Math.cos(bearing) * (.27 + random() * .12);
    const y = Math.sin(bearing) * (.29 + random() * .16);
    const bend = (random() < .5 ? -1 : 1) * (.10 + random() * .17);
    shots.push({
      x: start.x + x, y: start.y + y, z: depths[index], bend,
      push: .055 + random() * .20,
      hold: .055 + random() * .095,
      roll: (random() - .5) * 12
    });
  }
  return shots;
}

function refreshRouteSeed() {
  const next = crypto.getRandomValues(new Uint32Array(1))[0];
  routeSeed = next === routeSeed ? (next + 1) >>> 0 : next;
}

function rebuildPlayback() {
  const random = seededRandom(routeSeed);
  playback = shuffled(images, random);
  if (playback.length > 1 && playback.every((image, index) => image === images[index])) {
    playback.push(playback.shift());
  }
  route = buildRoute(playback.length, random);
  for (let index = 0; index < route.length; index++) {
    route[index].attitude = frameAttitude(playback[index].id);
  }
}

function cameraAt(position, aspect = 1) {
  const index = Math.floor(position);
  const start = route[index] || origin;
  const next = route[index + 1] || start;
  const move = { x: next.x - start.x, y: next.y - start.y, z: next.z - start.z };
  const phase = position - index;

  const hold = next.hold ?? .065;
  const glide = ease((phase - hold) / (1 - 2 * hold));
  const arc = Math.sin(Math.PI * glide) ** 2;
  const bend = (next.bend || 0) * arc;
  return {
    x: start.x + move.x * glide - move.y * bend,
    y: start.y + move.y * glide + move.x * bend,
    z: start.z + move.z * glide - (next.push || 0) * arc,
    roll: (next.roll || 0) * arc,
    focusZ: start.z + move.z * ease((phase - .16) / .68),
    crossing: (next.push || 0) * 3.5 * arc, aspect
  };
}

function projectDepth(depth) {
  // Compress the near end of the lens without changing the order of the world planes.
  const nearLimit = .77;
  return depth > 0 ? nearLimit * (1 - Math.exp(-depth / nearLimit)) : depth;
}

function viewFromCamera(point, camera) {
  const depth = point.z - camera.z;
  const z = projectDepth(depth);
  const x = point.x - camera.x;
  const y = point.y - camera.y;
  const angle = (camera.roll || 0) * Math.PI / 180;
  const aspect = camera.aspect || 1;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return { x: x * cos - y * sin / aspect, y: x * sin * aspect + y * cos,
    depth, z, scale: 1 / (1 - z) };
}

function updateMotionBlur(camera, width, height, lens, dt) {
  const distance = previousCamera ? Math.hypot(
    (camera.x - previousCamera.x) * width,
    (camera.y - previousCamera.y) * height,
    (camera.z - previousCamera.z) * lens
  ) : 0;
  previousCamera = camera;
  const target = reducedMotion.matches || quality > 1 ? 0 : clamp((distance / dt - .13) * 1.8, 0, 4.2);
  motionBlur += (target - motionBlur) * (1 - Math.exp(-dt / 32));
  if (motionBlur < .045) motionBlur = 0;
}

function layerAtDepth(z) {
  return 2000 + Math.round(1000 * z);
}

function renderFilm(camera, width, height) {
  filmWidth = width;
  filmHeight = height;
  filmCamera = camera;

  const grainView = viewFromCamera(grainPlane, { ...camera, roll: 0 });
  const scale = 2 * (1 - grainPlane.z) * grainView.scale;
  const tile = 72 * scale;
  const textureX = (width * grainView.x * grainView.scale) % tile;
  const textureY = (height * grainView.y * grainView.scale) % tile;
  filmSurface.style.transform = "rotate(" + (camera.roll || 0).toFixed(2) + "deg) translate3d(" +
    textureX.toFixed(2) + "px," + textureY.toFixed(2) + "px,0) scale(" + scale.toFixed(4) + ")";
  opticalGlow.style.opacity = String(.035 + (camera.crossing || 0) * .16);
  opticalGlow.style.transform = "translateX(" + ((camera.crossing || 0) * -9) + "%)";

  for (const { canvas, z } of dustPlanes) canvas.style.zIndex = String(layerAtDepth(z));
}

function wrapNear(value, center, span) {
  const offset = value - center + span / 2;
  return center + ((offset % span + span) % span) - span / 2;
}

function sampleDust(particle, planeZ, elapsed, camera) {
  const wave = elapsed * particle.frequency + particle.phase;
  const span = 1.50 * (1.04 + depthPlanes.at(-1) - planeZ);
  const point = {
    x: wrapNear((particle.x - .5) * span + particle.speedX * elapsed + .023 * Math.sin(wave), camera.x, span),
    y: wrapNear((particle.y - .5) * span - particle.speedY * elapsed + .018 * Math.cos(wave * .82), camera.y, span),
    z: planeZ + particle.z
  };
  const relative = viewFromCamera(point, camera);
  const x = .5 + relative.x * relative.scale;
  const y = .5 + relative.y * relative.scale;
  const warmBeam = Math.exp(-Math.pow((x - (.79 - .27 * y)) / .118, 2));
  const coolBeam = .45 * Math.exp(-Math.pow((x - (.22 + .12 * y)) / .17, 2));
  const facingLight = .68 + .32 * Math.pow(.5 + .5 * Math.sin(wave * 1.45), 2);
  return { x, y, scale: relative.scale, light: Math.min(1, (warmBeam + coolBeam) * facingLight),
    warm: warmBeam >= coolBeam };
}

function dustGlow(tone) {
  if (dustGlowSprites.has(tone)) return dustGlowSprites.get(tone);
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 96;
  const context = sprite.getContext("2d");
  const light = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  light.addColorStop(0, "rgba(" + tone + ",.47)");
  light.addColorStop(1, "rgba(" + tone + ",0)");
  context.fillStyle = light;
  context.fillRect(0, 0, 96, 96);
  dustGlowSprites.set(tone, sprite);
  return sprite;
}

function drawDust() {
  if (!filmWidth || !filmHeight || quality > 1) return;
  const density = Math.min(window.devicePixelRatio || 1, quality ? 1 : 1.5);
  const stride = quality ? 2 : 1;
  const pixelWidth = Math.round(filmWidth * density);
  const pixelHeight = Math.round(filmHeight * density);
  for (const { canvas, context, particles, z, dirtyRects } of dustPlanes) {
    if (!context) continue;
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      context.setTransform(density, 0, 0, density, 0, 0);
      dirtyRects.length = 0;
    }
    for (const rect of dirtyRects) context.clearRect(rect.x, rect.y, rect.size, rect.size);
    dirtyRects.length = 0;
    for (let particleIndex = 0; particleIndex < particles.length; particleIndex += stride) {
      const particle = particles[particleIndex];
      const { x, y, scale, light, warm } = sampleDust(particle, z, dustTime, filmCamera);
      if (x < -.015 || x > 1.015 || y < -.015 || y > 1.015) continue;
      const px = x * filmWidth;
      const py = y * filmHeight;
      const radius = particle.radius * (.45 + .58 * scale);
      const tone = warm ? "255,228,189" : "213,234,255";
      let extent = radius * (1 + .18 * light);
      if (light > .34) {
        extent = radius * (2.4 + Math.min(1.4, scale));
        context.globalAlpha = light;
        context.drawImage(dustGlow(tone), px - extent, py - extent, extent * 2, extent * 2);
        context.globalAlpha = 1;
      }
      const clear = Math.ceil(extent) + 2;
      dirtyRects.push({ x: Math.floor(px) - clear, y: Math.floor(py) - clear, size: clear * 2 + 2 });
      const alpha = (.05 + .82 * light) * Math.min(1, .62 + .27 * scale);
      context.fillStyle = "rgba(" + tone + "," + alpha + ")";
      context.beginPath();
      context.arc(px, py, radius * (1 + .18 * light), 0, Math.PI * 2);
      context.fill();
    }
  }
}

// Sfuocatura da lente: cresce gradualmente con la distanza dal piano a fuoco, dietro e davanti, poi
// satura come il cerchio di confusione di un'ottica reale. Il primo piano sfoca appena di più.
function opticalBlur(shotZ, focusZ) {
  const offset = shotZ - focusZ;
  const strength = 1 - Math.exp(-Math.pow(Math.abs(offset) / .66, 1.18));
  return offset > 0 ? Math.min(1, strength * 1.08) : strength;
}

function projectedBounds(relative, rotation, tiltDepth, photoWidth, photoHeight, view) {
  const { width, height, lens, rollSin, rollCos } = view;
  const centerX = relative.x * width;
  const centerY = relative.y * height;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const x of [-photoWidth / 2, photoWidth / 2]) {
    for (const y of [-photoHeight / 2, photoHeight / 2]) {
      const dx = rotation.xx * x + rotation.xy * y;
      const dy = rotation.yx * x + rotation.yy * y;
      const projection = 1 / (1 - relative.z - (rotation.zx * x + rotation.zy * y) * tiltDepth / lens);
      const px = (centerX + rollCos * dx - rollSin * dy) * projection;
      const py = (centerY + rollSin * dx + rollCos * dy) * projection;
      left = Math.min(left, px);
      right = Math.max(right, px);
      top = Math.min(top, py);
      bottom = Math.max(bottom, py);
    }
  }
  return {
    left: clamp(left, -width / 2, width / 2), right: clamp(right, -width / 2, width / 2),
    top: clamp(top, -height / 2, height / 2), bottom: clamp(bottom, -height / 2, height / 2)
  };
}

function softenOcclusion(photos, position) {
  const base = Math.floor(position);
  const blend = ease((position - base - .29) / .42);
  for (const target of photos) {
    const weight = target.index === base ? 1 - blend : target.index === base + 1 ? blend : 0;
    if (!weight) continue;
    const bounds = target.bounds;
    const targetArea = (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
    if (targetArea < 1) continue;
    let coverage = 0;
    const blockers = [];
    for (const photo of photos) {
      if (photo.layer <= target.layer || !photo.opacity) continue;
      const width = Math.min(photo.bounds.right, bounds.right) - Math.max(photo.bounds.left, bounds.left);
      const height = Math.min(photo.bounds.bottom, bounds.bottom) - Math.max(photo.bounds.top, bounds.top);
      if (width <= 0 || height <= 0) continue;
      coverage += width * height / targetArea * photo.opacity;
      blockers.push(photo);
    }
    if (coverage <= maximumOverlap) continue;
    const visibility = 1 - weight * (1 - maximumOverlap / coverage);
    for (const photo of blockers) photo.visibility = Math.min(photo.visibility, visibility);
  }
}

function render(time) {
  const target = clamp(viewport.scrollTop / step, 0, Math.max(0, playback.length - 1));
  const delta = target - displayed;
  const dt = previousTime ? clamp(time - previousTime, 1, 110) : 1000 / 60;
  previousTime = time;
  displayed = reducedMotion.matches || Math.abs(delta) < .003
    ? target : displayed + delta * (1 - Math.exp(-dt / 68));
  sampleFrameTime(dt, Math.abs(target - displayed) >= .003);

  const center = clamp(Math.round(displayed), 0, Math.max(0, playback.length - 1));
  const position = reducedMotion.matches ? center : displayed;
  const visible = new Set();
  const width = sceneWidth;
  const height = sceneHeight;
  const lens = sceneLens;
  const camera = cameraAt(position, width / Math.max(1, height));
  updateMotionBlur(camera, width, height, lens, dt);
  prepareNearbyPhotos(center);
  renderFilm(reducedMotion.matches ? origin : camera, width, height);
  const compact = width < 650;
  const roll = camera.roll * Math.PI / 180;
  const view = { width, height, lens, rollSin: Math.sin(roll), rollCos: Math.cos(roll) };
  const photos = [];
  const first = reducedMotion.matches ? center : Math.max(0, Math.floor(position) - 2);
  const last = reducedMotion.matches ? center : Math.min(playback.length - 1, Math.ceil(position) + 2);

  for (let index = first; index <= last && playback[index]; index++) {
    const image = playback[index];
    const offset = index - position;
    const distance = Math.abs(offset);
    const shot = route[index];
    const relative = viewFromCamera(shot, camera);
    const tilt = ease((distance - .09) / .74);
    const rotation = frameRotation(shot.attitude, offset);
    const defocus = opticalBlur(shot.z, camera.focusZ);
    const blur = defocus * (compact ? 9 : 14) * qualityBlur[quality] + motionBlur * qualityMotion[quality];
    const viewRatio = clamp(image.ratio, .58, 2.1);
    const heightLimit = compact ? .84 : viewRatio < 1 ? .95 : .83;
    const photoHeight = Math.min(height * heightLimit, width * (compact ? .83 : .68) / viewRatio);
    const photoWidth = photoHeight * viewRatio;
    const tiltDepth = confinedTilt(relative.depth, rotation, photoWidth, photoHeight, lens);
    const layer = layerAtDepth(shot.z) + index % 8;
    const card = cards.get(image.id) || mountCard(image);
    const photo = card.firstElementChild;

    const metrics = photoMetrics.get(card);
    const focalPoint = image.x + "% " + image.y + "%";
    if (!metrics || metrics.width !== photoWidth || metrics.height !== photoHeight) {
      card.style.width = photoWidth + "px";
      card.style.height = photoHeight + "px";
    }
    if (!metrics || metrics.focalPoint !== focalPoint) photo.style.objectPosition = focalPoint;
    if (!metrics || metrics.width !== photoWidth || metrics.height !== photoHeight || metrics.focalPoint !== focalPoint) {
      photoMetrics.set(card, { width: photoWidth, height: photoHeight, focalPoint });
    }
    card.style.transform = "translate3d(calc(-50% + " + (relative.x * width).toFixed(2) +
      "px),calc(-50% + " + (relative.y * height).toFixed(2) + "px)," +
      (relative.z * lens).toFixed(2) + "px) rotateZ(" + camera.roll.toFixed(2) +
      "deg) scaleZ(" + tiltDepth.toFixed(5) + ") " + rotation.css;
    card.style.zIndex = String(layer);
    card.style.filter = blur > .05 ? "blur(" + blur.toFixed(2) +
      "px) brightness(" + (1 - defocus * (shot.z > camera.focusZ ? .04 : .14)).toFixed(3) + ")" : "none";
    card.style.setProperty("--edge-light", (.10 + .12 * camera.crossing + .06 * tilt).toFixed(2));
    photos.push({
      card, index, layer, visibility: 1, opacity: 1 - ease((distance - 1.22) / 1.77),
      bounds: projectedBounds(relative, rotation, tiltDepth, photoWidth, photoHeight, view)
    });
    visible.add(image.id);
  }

  softenOcclusion(photos, position);
  for (const { card, opacity, visibility } of photos) card.style.opacity = String(opacity * visibility);

  for (const [id, card] of cards) {
    if (!visible.has(id)) {
      card.remove();
      cards.delete(id);
    }
  }

  const counter = String(playback.length ? center + 1 : 0).padStart(2, "0") + " / " +
    String(playback.length).padStart(2, "0");
  if (counter !== lastCounter) byId("counter").textContent = lastCounter = counter;
  paintCta(playback.length > 1 ? position / (playback.length - 1) : 0);
  const moving = Math.abs(target - displayed) >= .003 || motionBlur > 0;
  updateLight(position, moving, camera);
  if (moving) requestRender();
}

// Scroll CTA: il fill giallo segue `position` (già smussata da render) con clip-path
const cta = byId("cta");
const ctaFill = cta.querySelector(".scroll-cta__fill");
function paintCta(p) {
  p = clamp(p, 0, 1);
  ctaFill.style.clipPath = "inset(0 " + ((1 - p) * 100).toFixed(2) + "% 0 0 round 999px)";
  cta.setAttribute("aria-valuenow", Math.round(p * 100));
  cta.classList.toggle("is-scrolling", p > .004);
  cta.classList.toggle("is-done", p > .995);
}
cta.addEventListener("click", () => {
  if (cta.classList.contains("is-done")) goTo(0);
  else goTo(Math.round(viewport.scrollTop / step) + 1);
});

// ───────────── V1 ─────────────
const spill = byId("spill");
const flare = byId("flare");
const qualityBlur = [1, .6, .3];
const qualityMotion = [.4, .2, 0];
const qualityOverride = new URLSearchParams(location.search).get("quality");
const lockedQuality = ["0", "1", "2"].includes(qualityOverride);
let quality = lockedQuality ? Number(qualityOverride)
  : ((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? 1 : 0);
let frameSum = 0;
let frameCount = 0;
let settledIndex = 0;
let lastTone = "";
let wasMoving = false;
let toneRun = 0;
let touching = false;
let snapTimer = 0;
const neutralTone = { rgb: [255, 232, 206], glow: .16 };
stage.dataset.quality = String(quality);

// Qualità adattiva: se i frame in movimento superano ~27ms di media scala gli effetti costosi.
function sampleFrameTime(dt, moving) {
  if (lockedQuality || !moving || quality >= 2) return;
  frameSum += dt;
  if (++frameCount < 48) return;
  const average = frameSum / frameCount;
  frameSum = frameCount = 0;
  if (average > 27) {
    quality++;
    stage.dataset.quality = String(quality);
    requestRender();
  }
}

// Tono luminoso e saturo della foto (hue pesato su saturazione e luce) più intensità del bagliore.
function toneFromPixels(data) {
  let r = 0, g = 0, b = 0, weight = 0, saturation = 0, luma = 0;
  const count = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const top = Math.max(R, G, B);
    const s = top ? (top - Math.min(R, G, B)) / top : 0;
    const l = (.2126 * R + .7152 * G + .0722 * B) / 255;
    const w = .08 + s * s * 2.2 + l * l * 1.6;
    r += R * w; g += G * w; b += B * w; weight += w;
    saturation += s; luma += l;
  }
  r /= weight; g /= weight; b /= weight;
  const top = Math.max(r, g, b), low = Math.min(r, g, b), chroma = top - low;
  let hue = 0;
  if (chroma > 1) {
    if (top === r) hue = ((g - b) / chroma + 6) % 6;
    else if (top === g) hue = (b - r) / chroma + 2;
    else hue = (r - g) / chroma + 4;
  }
  const s = clamp((top ? chroma / top : 0) * 1.5 + .22, .3, .92);
  const f = n => {
    const k = (n + hue) % 6;
    return Math.round(255 * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  const rgb = chroma > 1 ? [f(5), f(3), f(1)] : [255, 238, 222];
  return { rgb, glow: clamp(.2 + saturation / count * .55 + luma / count * .12, .2, .52) };
}

async function measureTones() {
  const run = ++toneRun;
  for (const image of playback.slice()) {
    if (run !== toneRun) return;
    if (!image.tone) {
      try {
        const photo = new Image();
        photo.decoding = "async";
        photo.src = image.src;
        await photo.decode();
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(photo, 0, 0, size, size);
        image.tone = toneFromPixels(context.getImageData(0, 0, size, size).data);
        requestRender();
      } catch { /* la foto resta con il tono neutro */ }
    }
    await new Promise(resolve => setTimeout(resolve, 24));
  }
}

function toneAt(index) {
  return playback[clamp(index, 0, Math.max(0, playback.length - 1))]?.tone || neutralTone;
}

// Luce ambientale dal colore della foto attiva e flare anamorfico nel fondale. Entrambi stanno
// dietro tutte le foto: non toccano mai i livelli di profondità e non si sovrappongono alle foto.
function updateLight(position, moving, camera) {
  if (!playback.length) return;
  const base = Math.floor(position);
  const mix = position - base;
  const from = toneAt(base);
  const to = toneAt(base + 1);
  const t = ease((mix - .3) / .4);
  const rgb = from.rgb.map((value, i) => Math.round(value + (to.rgb[i] - value) * t));
  const glow = (from.glow + (to.glow - from.glow) * t) * (1 - .35 * Math.sin(Math.PI * mix));
  const tone = rgb.join(",");
  if (tone !== lastTone) {
    lastTone = tone;
    spill.style.setProperty("--tone", tone);
    // Il flare è freddo (azzurro) come nelle ottiche anamorfiche reali, appena scaldato dal tono della foto.
    const mixed = [132, 190, 255].map((value, i) => Math.round(value * .8 + rgb[i] * .2));
    flare.style.setProperty("--flare-rgb", mixed.join(","));
    flare.style.setProperty("--flare-core", mixed.map(value => Math.round(value + (255 - value) * .62)).join(","));
  }
  const opacity = quality > 1 ? 0 : glow;
  spill.style.opacity = opacity.toFixed(3);
  const energy = reducedMotion.matches || quality > 1 ? 0 : clamp(motionBlur / 3.2, 0, 1);
  flare.style.opacity = (reducedMotion.matches || quality > 1 ? 0 : .5 + .5 * energy).toFixed(3);
  flare.style.transform = "translate3d(" + (-camera.x * sceneWidth * .06).toFixed(1) + "px," +
    (-camera.y * sceneHeight * .06).toFixed(1) + "px,0)";
  if (moving) wasMoving = true;
  else if (wasMoving) {
    wasMoving = false;
    if (Math.abs(position - Math.round(position)) < .03) pulseLight(opacity);
  }
}

function pulseLight(base) {
  if (reducedMotion.matches || quality > 1 || !spill.animate) return;
  spill.animate([{ opacity: base }, { opacity: Math.min(1, base * 1.9 + .06), offset: .22 }, { opacity: base }],
    { duration: 1100, easing: "cubic-bezier(.22,1,.36,1)" });
}

// Snap morbido: a scroll fermo la sequenza si assesta su una foto. Anche un piccolo gesto avanza di una foto.
function snapToPhoto() {
  if (touching || playback.length < 2) return;
  const position = viewport.scrollTop / step;
  const moved = position - settledIndex;
  let target = Math.round(position);
  if (moved > .08) target = Math.max(target, settledIndex + 1);
  else if (moved < -.08) target = Math.min(target, settledIndex - 1);
  target = clamp(target, 0, playback.length - 1);
  if (Math.abs(position - target) > .012) goTo(target);
  else settledIndex = target;
}

function scheduleSnap() {
  clearTimeout(snapTimer);
  if (location.search.includes("snap=0")) return; // solo per i test
  snapTimer = setTimeout(snapToPhoto, 190);
}

viewport.addEventListener("scroll", scheduleSnap, { passive: true });
viewport.addEventListener("touchstart", () => { touching = true; clearTimeout(snapTimer); }, { passive: true });
for (const type of ["touchend", "touchcancel"]) {
  viewport.addEventListener(type, () => { touching = false; scheduleSnap(); }, { passive: true });
}

// Esporta la sequenza come singola pagina HTML (motore + immagini incluse), in sola visione.
async function exportBlob(image) {
  const source = image.blob || await (await fetch(image.src)).blob();
  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const packed = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .82));
    return packed && packed.size < source.size ? packed : source;
  } catch {
    return source;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function exportPage() {
  if (!ready || busy || !images.length) return;
  busy = true;
  updateSelection();
  const status = byId("save-state");
  try {
    const packed = [];
    for (let index = 0; index < images.length; index++) {
      status.textContent = "Esporto… " + (index + 1) + " / " + images.length;
      const { id, name, ratio, x, y } = images[index];
      packed.push({ id, name, ratio, x, y, src: await blobToDataUrl(await exportBlob(images[index])) });
    }
    const [html, css, js] = await Promise.all([
      fetch(location.pathname).then(response => response.text()),
      fetch(document.querySelector('link[rel="stylesheet"]').href).then(response => response.text()),
      fetch(document.querySelector("script[src]").src).then(response => response.text())
    ]);
    const payload = JSON.stringify({ seed: routeSeed, title: "Cinematic Photo Flow", images: packed }).replace(/</g, "\\u003c");
    const page = html
      .replace(/<link rel="stylesheet"[^>]*>/, () => "<style>" + css.replace(/<\/style/gi, "<\\/style") + "</style>")
      .replace(/<script src="app\.js[^>]*><\/script>/, "")
      .replace("<body>", '<body class="exported viewing">')
      .replace("</body>", () => "<script>window.__PFLOW__=" + payload + "</script><script>" + js.replace(/<\/script/gi, "<\\/script") + "</script></body>");
    const file = new Blob([page], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "cinematic-photo-flow.html";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    status.textContent = "Pagina esportata · " + (file.size / 1048576).toFixed(1).replace(".", ",") + " MB";
  } catch {
    status.textContent = "Esportazione non riuscita";
  } finally {
    busy = false;
    updateSelection();
  }
}
byId("export").addEventListener("click", exportPage);

function goTo(index, immediate = false) {
  const target = clamp(index, 0, Math.max(0, playback.length - 1));
  settledIndex = target;
  viewport.scrollTo({ top: target * step, behavior: immediate || reducedMotion.matches ? "instant" : "smooth" });
  requestRender();
}

function updateSelection() {
  for (const thumbnail of strip.querySelectorAll(".thumb")) {
    if (thumbnail.dataset.id === images[selected]?.id) thumbnail.setAttribute("aria-current", "true");
    else thumbnail.removeAttribute("aria-current");
  }
  const image = images[selected];
  byId("image-actions").hidden = !custom || !image;
  byId("selected-name").textContent = image?.name || "";
  byId("new-gallery").hidden = !custom || !images.length;
  byId("new-gallery").disabled = busy || !ready;
  byId("export").disabled = busy || !ready || !images.length;
  for (const id of ["replace", "remove", "focal"]) byId(id).disabled = busy;
}

function renderEditor(reset = true, fromStart = false) {
  if (reset) rebuildPlayback();
  if (fromStart) selected = Math.max(0, images.indexOf(playback[0]));
  strip.replaceChildren();
  playback.forEach((image, index) => {
    const item = document.createElement("li");
    item.dataset.id = image.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb";
    button.dataset.id = image.id;
    button.setAttribute("aria-label", (index + 1) + ". " + image.name);
    const photo = new Image();
    photo.alt = "";
    photo.src = image.src;
    photo.loading = "lazy";
    photo.style.objectPosition = image.x + "% " + image.y + "%";
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    button.append(photo, number);
    button.addEventListener("click", () => {
      selected = images.indexOf(image);
      updateSelection();
      goTo(index);
    });
    item.append(button);
    strip.append(item);
  });

  byId("empty").hidden = images.length > 0;
  byId("source-label").textContent = custom ? "La tua sequenza" : "Galleria demo";
  byId("cta").parentElement.hidden = images.length < 2;
  byId("edit-help").textContent = custom
    ? "Seleziona una miniatura per raggiungere la foto."
    : "Carica le tue immagini per iniziare.";
  if (reset) {
    for (const card of cards.values()) card.remove();
    cards.clear();
    preparedPhotos.clear();
    lastPrefetch = -1;
  }
  updateSelection();
  updateLayout(reset);
  if (reset) measureTones();
}

function restoreSource(image) {
  return { ...image, src: URL.createObjectURL(image.blob) };
}

async function decodeImage(file) {
  const source = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = source;
    await photo.decode();
    const ratio = photo.naturalWidth / photo.naturalHeight;
    const scale = Math.min(1, 2400 / Math.max(photo.naturalWidth, photo.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    canvas.getContext("2d").drawImage(photo, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .88));
    return {
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: file.name, ratio, x: 50, y: 50,
      blob: optimized && optimized.size < file.size ? optimized : file
    };
  } finally {
    URL.revokeObjectURL(source);
  }
}

async function importFiles(files, replaceId = null, resetGallery = false) {
  if (!ready || busy || !files.length) return;
  busy = true;
  byId("upload").disabled = true;
  byId("save-state").textContent = "Preparazione immagini…";
  updateSelection();
  const imported = [];
  let failed = 0;
  for (const file of replaceId ? files.slice(0, 1) : files) {
    try { imported.push(restoreSource(await decodeImage(file))); }
    catch { failed++; }
  }

  if (imported.length) {
    if (resetGallery && custom) {
      for (const image of images) URL.revokeObjectURL(image.src);
    }
    if (!custom || resetGallery) {
      custom = true;
      images = [];
    }
    if (replaceId) {
      const index = images.findIndex(image => image.id === replaceId);
      if (index >= 0) {
        URL.revokeObjectURL(images[index].src);
        images.splice(index, 1, imported[0]);
        selected = index;
      } else {
        URL.revokeObjectURL(imported[0].src);
      }
    } else {
      selected = images.length;
      images.push(...imported);
    }
  }

  busy = false;
  byId("upload").disabled = false;
  const notice = failed ? failed + (failed === 1 ? " immagine non leggibile." : " immagini non leggibili.") : "";
  byId("live").textContent = notice;
  if (imported.length) {
    refreshRouteSeed();
    renderEditor(true, true);
    keepProject();
    if (notice) saving.then(() => { byId("save-state").textContent += " · " + notice; });
  } else {
    byId("save-state").textContent = notice;
    updateSelection();
  }
}

function chooseFiles(id = null, resetGallery = false) {
  if (!ready || busy) return;
  replacementId = id;
  replaceGallery = resetGallery;
  fileInput.multiple = !id;
  fileInput.click();
}

function toggleView() {
  const viewing = document.body.classList.toggle("viewing");
  byId("mode-label").textContent = viewing ? "Torna all’editor" : "Modalità visione";
  byId("mode").setAttribute("aria-pressed", String(viewing));
  requestAnimationFrame(() => updateLayout());
  (viewing ? viewport : byId("mode")).focus({ preventScroll: true });
}

viewport.addEventListener("scroll", requestRender, { passive: true });
new ResizeObserver(() => updateLayout()).observe(viewport);
reducedMotion.addEventListener("change", syncVisibility);
document.addEventListener("visibilitychange", syncVisibility);
if (typeof IntersectionObserver === "function") {
  new IntersectionObserver(([entry]) => {
    sceneInView = entry.isIntersecting;
    syncVisibility();
  }).observe(viewport);
}

viewport.addEventListener("keydown", event => {
  if (event.target !== viewport) return;
  const direction = { ArrowDown: 1, ArrowUp: -1, PageDown: 1, PageUp: -1,
    ArrowRight: 1, ArrowLeft: -1 }[event.key];
  if (!direction && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  if (direction) goTo(Math.round(viewport.scrollTop / step) + direction);
  else goTo(event.key === "Home" ? 0 : playback.length - 1);
});

byId("mode").addEventListener("click", toggleView);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("viewing") && !document.body.classList.contains("exported") && !focalDialog.open) toggleView();
});
byId("upload").addEventListener("click", () => chooseFiles());
byId("empty-upload").addEventListener("click", () => chooseFiles());
byId("new-gallery").addEventListener("click", () => {
  if (window.confirm("Vuoi sostituire la galleria salvata con una nuova?")) chooseFiles(null, true);
});
byId("replace").addEventListener("click", () => chooseFiles(images[selected]?.id));
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  const id = replacementId;
  const resetGallery = replaceGallery;
  fileInput.value = "";
  replacementId = null;
  replaceGallery = false;
  importFiles(files, id, resetGallery);
});
byId("remove").addEventListener("click", () => {
  if (!custom || busy || !images[selected]) return;
  const [removed] = images.splice(selected, 1);
  URL.revokeObjectURL(removed.src);
  selected = clamp(selected, 0, Math.max(0, images.length - 1));
  renderEditor();
  keepProject();
});

dropArea.addEventListener("dragleave", event => {
  if (!dropArea.contains(event.relatedTarget)) dropArea.classList.remove("dragover");
});
dropArea.addEventListener("dragover", event => {
  if (!event.dataTransfer.types.includes("Files")) return;
  event.preventDefault();
  dropArea.classList.add("dragover");
});
dropArea.addEventListener("drop", event => {
  event.preventDefault();
  dropArea.classList.remove("dragover");
  if (event.dataTransfer.files.length) importFiles(Array.from(event.dataTransfer.files));
});

const focalX = byId("focal-x");
const focalY = byId("focal-y");
const focalImage = byId("focal-image");
let focalId = null;

function updateMarker() {
  const marker = byId("focal-marker");
  marker.style.left = focalX.value + "%";
  marker.style.top = focalY.value + "%";
}

byId("focal").addEventListener("click", () => {
  const image = images[selected];
  if (!image) return;
  focalId = image.id;
  focalX.value = image.x;
  focalY.value = image.y;
  focalImage.src = image.src;
  updateMarker();
  focalDialog.returnValue = "";
  focalDialog.showModal();
});

for (const slider of [focalX, focalY]) slider.addEventListener("input", updateMarker);
focalImage.addEventListener("pointerdown", event => {
  const rect = focalImage.getBoundingClientRect();
  focalX.value = Math.round((event.clientX - rect.left) / rect.width * 100);
  focalY.value = Math.round((event.clientY - rect.top) / rect.height * 100);
  updateMarker();
});
focalDialog.addEventListener("close", () => {
  const image = images.find(item => item.id === focalId);
  if (image && focalDialog.returnValue === "save") {
    image.x = Number(focalX.value);
    image.y = Number(focalY.value);
    renderEditor(false);
    keepProject();
  }
  focalId = null;
  focalImage.removeAttribute("src");
});

async function initialize() {
  const exported = window.__PFLOW__;
  if (exported) {
    custom = true;
    images = exported.images.map(image => ({ ...image }));
    routeSeed = exported.seed >>> 0;
    renderEditor(true, true);
    byId("source-label").textContent = exported.title || "Cinematic Photo Flow";
    ready = true;
    viewport.focus({ preventScroll: true });
    return;
  }
  byId("upload").disabled = true;
  refreshRouteSeed();
  renderEditor(true, true);
  try {
    const saved = await projectTransaction("readonly", store => store.get("sequence"));
    if (Array.isArray(saved)) {
      custom = true;
      images = saved.map(restoreSource);
      renderEditor(true, true);
      byId("save-state").textContent = "Salvata su questo browser";
    }
  } catch {
    byId("save-state").textContent = "Salvataggio locale non disponibile";
  }
  ready = true;
  byId("upload").disabled = false;
  updateSelection();
}

initialize();
