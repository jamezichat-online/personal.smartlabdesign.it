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
const routeOverlapTarget = maximumOverlap * .64;
const sceneCells = new Map();
const sceneCellSize = 2;
const sceneRadius = 4;
let routeViewSize = "";
const filmSurface = byId("film-surface");
const opticalGlow = byId("optical-glow");
const origin = { x: 0, y: 0, z: 0 };
const grainPlane = { x: 0, y: 0, z: -.78 };
// One layer behind, between and in front of the five photo depths.
const dustPlanes = [-1.55, -1.10, -.36, .36, 1.08, 1.52].map((z, index) => {
  const canvas = byId("dust-plane-" + index);
  return {
    z, canvas, context: canvas.getContext("2d"), dirtyRects: [],
    particles: Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(),
      driftX: (Math.random() - .5) * .004,
      driftY: .001 + Math.random() * .0035,
      radius: .82 + Math.random() * .78,
      shape: .53 + Math.random() * .45,
      angle: Math.random() * Math.PI,
      period: 3 + Math.random() * 5,
      phase: Math.random() * 8,
      flashDuration: .16 + Math.random() * .24
    }))
  };
});
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
  if (sceneWidth + "x" + sceneHeight !== routeViewSize) planRoute();
  scene.style.setProperty("--scene-lens", sceneLens + "px");
  track.style.setProperty("--travel", Math.max(0, playback.length - 1) * step + "px");
  viewport.scrollTop = currentPosition * step;
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

function buildRoute(gallery, random, width, height) {
  if (!gallery.length) return [];
  const depths = buildDepths(gallery.length, random);
  const lens = Math.max(510, height * 1.4);
  const view = { width, height, lens, aspect: width / height };
  const shots = gallery.map((image, i) => ({
    x: 0, y: 0, z: depths[i], attitude: frameAttitude(image.id),
    size: photoSize(image, width, height)
  }));
  const accepted = [shots[0]];
  const samples = [];
  let heading = random() * Math.PI * 2;

  for (let index = 1; index < shots.length; index++) {
    const previous = accepted.at(-1);
    const current = shots[index];
    const preferred = heading + (random() < .5 ? -1 : 1) * (.52 + random() * 1.35);
    const bend = (random() - .5) * .18;
    const hold = .065 + random() * .060;
    const roll = (random() - .5) * 8;
    let winner = null;

    for (const reach of [.46, .58, .70, .83, 1.00, 1.24, 1.56, 2.04, 2.72, 3.7, 5.2, 7.6]) {
      for (const turn of [0, .53, -.53, 1.15, -1.15, 1.74, -1.74, Math.PI]) {
        const angle = preferred + turn;
        const shot = { ...current, x: previous.x + Math.cos(angle) * reach,
          y: previous.y + Math.sin(angle) * reach, bend, hold, roll, push: .09 };
        const result = checkPlacement(accepted, shot, samples, view);
        if (!result) continue;
        const score = Math.abs(result.peak - .024) + reach * .008 + Math.abs(turn) * .003;
        if (!winner || score < winner.score) winner = { ...result, shot, angle, score };
        if (result.peak >= .015 && result.peak <= routeOverlapTarget && reach <= 1.24) break;
      }
      if (winner && (winner.score < .020 || reach >= 1.24)) break;
    }
    if (!winner) {
      // A straight departure into clear space is the conservative path when local directions are crowded.
      winner = findClearDeparture(accepted, current, samples, view, preferred, hold);
    }

    if (!winner) return buildStraightRoute(shots, view, preferred);
    accepted.push(winner.shot);
    heading = winner.angle;
    for (const { sample, face } of winner.priorFaces) sample.faces.push(face);
    samples.push(...winner.frames);
  }
  return accepted;
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
  planRoute();
}

function planRoute() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  routeViewSize = width + "x" + height;
  route = buildRoute(playback, seededRandom(routeSeed ^ 0x5bd1e995), width, height);
  sceneCells.clear();
  for (let index = 0; index < route.length; index++) {
    const shot = route[index];
    const key = Math.floor(shot.x / sceneCellSize) + "," + Math.floor(shot.y / sceneCellSize);
    if (!sceneCells.has(key)) sceneCells.set(key, []);
    sceneCells.get(key).push(index);
  }
}

function cameraAt(position, aspect = 1) {
  const index = Math.floor(position);
  const start = route[index] || origin;
  return cameraBetween(start, route[index + 1] || start, position - index, aspect);
}

function cameraBetween(start, next, phase, aspect) {
  const move = { x: next.x - start.x, y: next.y - start.y, z: next.z - start.z };
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
  const target = reducedMotion.matches ? 0 : clamp((distance / dt - .13) * 1.8, 0, 4.2);
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
  const span = 1.50 * (1.04 + depthPlanes.at(-1) - planeZ);
  const point = {
    x: wrapNear((particle.x - .5) * span + particle.driftX * elapsed, camera.x, span),
    y: wrapNear((particle.y - .5) * span + particle.driftY * elapsed, camera.y, span),
    z: planeZ
  };
  const relative = viewFromCamera(point, camera);
  const x = .5 + relative.x * relative.scale;
  const y = .5 + relative.y * relative.scale;

  const warm = Math.exp(-(((x - (.79 - .27 * y)) / .16) ** 2));
  const cool = .65 * Math.exp(-(((x - (.22 + .12 * y)) / .19) ** 2));
  const light = Math.max(warm, cool);
  // A mote catches the beam only briefly as its surface turns in the air.
  const age = (elapsed + particle.phase) % particle.period;
  const glint = age < particle.flashDuration ? Math.sin(Math.PI * age / particle.flashDuration) ** 2 : 0;
  const alpha = .15 + light * (.20 + .44 * glint);
  return { x, y, scale: relative.scale, alpha, warm: warm >= cool };
}

function paintDustPlane(context, plane, elapsed, camera, width, height, dirtyRects) {
  const imageScale = clamp(Math.min(width, height) / 680, .8, 1.55);
  for (const particle of plane.particles) {
    const { x, y, scale, alpha, warm } = sampleDust(particle, plane.z, elapsed, camera);
    if (x < -.015 || x > 1.015 || y < -.015 || y > 1.015) continue;
    const px = x * width, py = y * height;
    const radius = Math.min(1.95, particle.radius * (.79 + .34 * scale)) * imageScale;
    const tone = warm ? "223,209,187" : "202,210,215";
    context.fillStyle = "rgba(" + tone + "," + alpha + ")";
    context.beginPath();
    context.ellipse(px, py, radius, radius * particle.shape, particle.angle, 0, Math.PI * 2);
    context.fill();
    if (dirtyRects) {
      const pad = Math.ceil(radius) + 2;
      dirtyRects.push({ x: Math.floor(px) - pad, y: Math.floor(py) - pad, size: pad * 2 + 2 });
    }
  }
}

function drawDust() {
  if (!filmWidth || !filmHeight) return;
  // Small motes use CSS-pixel canvases so that deeper layering stays lightweight.
  const width = Math.round(filmWidth), height = Math.round(filmHeight);
  for (const plane of dustPlanes) {
    const { canvas, context, dirtyRects } = plane;
    if (!context) continue;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      dirtyRects.length = 0;
    }
    for (const rect of dirtyRects) context.clearRect(rect.x, rect.y, rect.size, rect.size);
    dirtyRects.length = 0;
    paintDustPlane(context, plane, dustTime, filmCamera, filmWidth, filmHeight, dirtyRects);
  }
}

function opticalBlur(shotZ, focusZ, sequenceDistance) {
  // The original curve ran across a scene spanning half a world unit.
  const normalizedDepth = Math.abs(shotZ - focusZ) / (depthPlanes.at(-1) - depthPlanes[0]);
  const depthDefocus = normalizedDepth * 2.3;
  const separation = .33 * ease((sequenceDistance - .12) / .94);
  return clamp(depthDefocus + separation, 0, 1);
}

function photoSize(image, width, height) {
  const compact = width < 650;
  const ratio = clamp(image.ratio, .58, 2.1);
  const limit = compact ? .84 : ratio < 1 ? .95 : .83;
  const h = Math.min(height * limit, width * (compact ? .83 : .68) / ratio);
  return { width: h * ratio, height: h };
}

function viewRoll(camera, view) {
  const roll = camera.roll * Math.PI / 180;
  return { ...view, rollSin: Math.sin(roll), rollCos: Math.cos(roll) };
}

function projectedFace(shot, index, position, camera, view) {
  if (Math.abs(shot.x - camera.x) > sceneRadius || Math.abs(shot.y - camera.y) > sceneRadius) return null;
  const relative = viewFromCamera(shot, camera);
  const rotation = frameRotation(shot.attitude, index - position);
  const { width, height } = shot.size;
  const tiltDepth = confinedTilt(relative.depth, rotation, width, height, view.lens);
  const points = [];
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const [x, y] of [[-width / 2, -height / 2], [width / 2, -height / 2],
    [width / 2, height / 2], [-width / 2, height / 2]]) {
    const dx = rotation.xx * x + rotation.xy * y;
    const dy = rotation.yx * x + rotation.yy * y;
    const scale = 1 / (1 - relative.z - (rotation.zx * x + rotation.zy * y) * tiltDepth / view.lens);
    const px = (relative.x * view.width + view.rollCos * dx - view.rollSin * dy) * scale;
    const py = (relative.y * view.height + view.rollSin * dx + view.rollCos * dy) * scale;
    points.push([px, py]);
    left = Math.min(left, px); right = Math.max(right, px);
    top = Math.min(top, py); bottom = Math.max(bottom, py);
  }
  if (right < -view.width / 2 || left > view.width / 2 ||
      bottom < -view.height / 2 || top > view.height / 2) return null;
  return { points, left, right, top, bottom, area: polygonArea(points), index };
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[(i + 1) % points.length];
    area += x * ny - y * nx;
  }
  return Math.abs(area) * .5;
}

function clipPolygon(points, edges) {
  for (let i = 0; i < edges.length && points.length; i++) {
    const [ax, ay] = edges[i];
    const [bx, by] = edges[(i + 1) % edges.length];
    const cross = ([x, y]) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    const source = points;
    points = [];
    let previous = source.at(-1);
    let d0 = cross(previous);
    for (const point of source) {
      const d1 = cross(point);
      if ((d0 < 0) !== (d1 < 0)) {
        const t = d0 / (d0 - d1);
        points.push([previous[0] + (point[0] - previous[0]) * t, previous[1] + (point[1] - previous[1]) * t]);
      }
      if (d1 >= 0) points.push(point);
      previous = point;
      d0 = d1;
    }
  }
  return points;
}

function overlapFraction(a, b, view) {
  if (a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top) return 0;
  const w = view.width / 2, h = view.height / 2;
  const intersection = clipPolygon(a.points, b.points);
  if (!intersection.length) return 0;
  const visible = clipPolygon(intersection, [[-w, -h], [w, -h], [w, h], [-w, h]]);
  return polygonArea(visible) / Math.max(1, Math.min(a.area, b.area));
}

function checkPlacement(accepted, shot, samples, view) {
  if (!validatePlacement(accepted, shot, samples, view, 16, 7)) return null;
  return validatePlacement(accepted, shot, samples, view, 112, 1);
}

function validatePlacement(accepted, shot, samples, view, resolution, stride) {
  const index = accepted.length;
  const priorFaces = [];
  let peak = 0;
  for (let i = 0; i < samples.length; i += stride) {
    const sample = samples[i];
    if (Math.abs(shot.x - sample.camera.x) > sceneRadius || Math.abs(shot.y - sample.camera.y) > sceneRadius) continue;
    const face = projectedFace(shot, index, sample.position, sample.camera, sample.view);
    if (!face) continue;
    for (const other of sample.faces) {
      peak = Math.max(peak, overlapFraction(face, other, view));
      if (peak > routeOverlapTarget) return null;
    }
    priorFaces.push({ sample, face });
  }
  const frames = [];
  for (let frame = 0; frame <= resolution; frame++) {
    const phase = frame / resolution;
    const position = index - 1 + phase;
    const camera = cameraBetween(accepted.at(-1), shot, phase, view.aspect);
    const frameView = viewRoll(camera, view);
    const faces = [];
    for (let i = 0; i <= index; i++) {
      const face = projectedFace(i === index ? shot : accepted[i], i, position, camera, frameView);
      if (!face) continue;
      for (const other of faces) {
        peak = Math.max(peak, overlapFraction(face, other, view));
        if (peak > routeOverlapTarget) return null;
      }
      faces.push(face);
    }
    frames.push({ camera, position, view: frameView, faces });
  }
  return { frames, priorFaces, peak };
}

function findClearDeparture(accepted, current, samples, view, heading, hold) {
  const start = accepted.at(-1);
  for (const reach of [3.8, 5.5, 8, 12, 18, 26]) {
    for (let turn = 0; turn < 12; turn++) {
      const angle = heading + turn * Math.PI / 6;
      const shot = { ...current, x: start.x + Math.cos(angle) * reach,
        y: start.y + Math.sin(angle) * reach, hold, push: 0 };
      const result = checkPlacement(accepted, shot, samples, view);
      if (result) return { ...result, shot, angle };
    }
  }
  return null;
}

function buildStraightRoute(shots, view, heading) {
  const direction = Math.cos(heading) >= 0 ? 1 : -1;
  for (const reach of [1.18, 1.5, 2.0, 2.8, 4.0, 6.0, 11]) {
    const accepted = [shots[0]];
    const samples = [];
    for (let i = 1; i < shots.length; i++) {
      const shot = { ...shots[i], x: i * reach * direction, y: 0, hold: .065, push: 0 };
      const result = checkPlacement(accepted, shot, samples, view);
      if (!result) break;
      accepted.push(shot);
      for (const { sample, face } of result.priorFaces) sample.faces.push(face);
      samples.push(...result.frames);
    }
    if (accepted.length === shots.length) return accepted;
  }
  return shots.map((shot, i) => ({ ...shot, x: i * 14 * direction, y: 0 }));
}

function shotsInView(camera) {
  const results = [];
  const left = Math.floor((camera.x - sceneRadius) / sceneCellSize);
  const right = Math.floor((camera.x + sceneRadius) / sceneCellSize);
  const top = Math.floor((camera.y - sceneRadius) / sceneCellSize);
  const bottom = Math.floor((camera.y + sceneRadius) / sceneCellSize);
  for (let x = left; x <= right; x++) {
    for (let y = top; y <= bottom; y++) {
      const members = sceneCells.get(x + "," + y);
      if (members) results.push(...members);
    }
  }
  return results;
}

function render(time) {
  const target = clamp(viewport.scrollTop / step, 0, Math.max(0, playback.length - 1));
  const delta = target - displayed;
  const dt = previousTime ? clamp(time - previousTime, 1, 110) : 1000 / 60;
  previousTime = time;
  displayed = reducedMotion.matches || Math.abs(delta) < .003
    ? target : displayed + delta * (1 - Math.exp(-dt / 68));

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
  const nearby = reducedMotion.matches ? [center] : shotsInView(camera);
  for (const index of nearby) {
    if (!route[index]) continue;
    const image = playback[index];
    const offset = index - position;
    const distance = Math.abs(offset);
    const shot = route[index];
    if (Math.abs(shot.x - camera.x) > sceneRadius || Math.abs(shot.y - camera.y) > sceneRadius) continue;
    const relative = viewFromCamera(shot, camera);
    if (Math.abs(relative.x * relative.scale) > 2.7 || Math.abs(relative.y * relative.scale) > 2.7) continue;
    const tilt = ease((distance - .09) / .74);
    const rotation = frameRotation(shot.attitude, offset);
    const defocus = opticalBlur(shot.z, camera.focusZ, distance);
    const blur = defocus * (compact ? 10 : 16) + motionBlur * (.45 + .55 * tilt);
    const { width: photoWidth, height: photoHeight } = shot.size;
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
      "px) brightness(" + (1 - defocus * .24).toFixed(3) + ")" : "none";
    card.style.setProperty("--edge-light", (.10 + .12 * camera.crossing + .06 * tilt).toFixed(2));
    visible.add(image.id);
  }

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
  if (Math.abs(target - displayed) >= .003 || motionBlur) requestRender();
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

function goTo(index, immediate = false) {
  const target = clamp(index, 0, Math.max(0, playback.length - 1));
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

// The controls sit above the scroller, so forward wheel input over the CTA.
cta.addEventListener("wheel", event => {
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 :
    event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport.clientHeight : 1;
  viewport.scrollBy({ top: event.deltaY * unit, left: event.deltaX * unit, behavior: "instant" });
  event.preventDefault();
}, { passive: false });


const galleryFrame = viewport.closest(".viewport-shell");
let gallerySwipe;

galleryFrame.addEventListener("pointerdown", event => {
  if (event.pointerType !== "touch" || !event.isPrimary) return;
  gallerySwipe = { id: event.pointerId, startY: event.clientY, lastY: event.clientY,
    scroll: viewport.scrollTop, dragging: false };
});

galleryFrame.addEventListener("pointermove", event => {
  const swipe = gallerySwipe;
  if (!swipe || event.pointerId !== swipe.id) return;
  if (!swipe.dragging) {
    if (Math.abs(event.clientY - swipe.startY) < 6) return;
    swipe.dragging = true;
    galleryFrame.setPointerCapture(event.pointerId);
    viewport.scrollTo({ top: swipe.scroll, behavior: "instant" });
  }
  const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  swipe.scroll = clamp(swipe.scroll + event.clientY - swipe.lastY, 0, max);
  swipe.lastY = event.clientY;
  viewport.scrollTop = swipe.scroll;
});

function endGallerySwipe(event) {
  if (gallerySwipe?.id === event.pointerId) gallerySwipe = null;
}

galleryFrame.addEventListener("pointerup", endGallerySwipe);
galleryFrame.addEventListener("pointercancel", endGallerySwipe);

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
  if (event.key === "Escape" && document.body.classList.contains("viewing") && !focalDialog.open) toggleView();
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
