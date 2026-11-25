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
const playbackOrder = byId("playback-order");
const regenerate = byId("regenerate");
const routePreferenceKey = "cinematic-photo-flow:route";
const depthPlanes = [-.27, -.14, 0, .08, .23];
let routeSeed = 867293;
let custom = false;
let selected = 0;
let step = 380;
let displayed = 0;
let frame = 0;
let previousTime = 0;
let previousCamera = null;
let motionBlur = 0;
let replacementId = null;
let draggedId = null;
let busy = false;
let ready = false;
let lastCounter = "";
let saving = Promise.resolve();
const cards = new Map();
const filmSurface = byId("film-surface");
const opticalGlow = byId("optical-glow");
const referenceMove = { x: .405, y: .07, z: -.22 };
const origin = { x: 0, y: 0, z: 0 };
const grainPlane = { x: 0, y: 0, z: -.78 };
const dustPlanes = [
  { canvas: byId("dust-far"), z: -.73, count: 23 },
  { canvas: byId("dust-mid"), z: -.27, count: 24 },
  { canvas: byId("dust-near"), z: .26, count: 15 }
].map(plane => ({
  ...plane,
  context: plane.canvas.getContext("2d"),
  particles: Array.from({ length: plane.count }, () => ({
    x: Math.random(), y: Math.random(), z: (Math.random() - .5) * .07,
    speedX: (Math.random() - .38) * .034,
    speedY: .010 + Math.random() * .026,
    radius: .38 + Math.random() * 1.05,
    phase: Math.random() * Math.PI * 2,
    frequency: .55 + Math.random() * 1.05
  }))
}));
let dustStrength = 0;
let dustFrame = 0;
let dustTime = 0;
let lastDustTime = 0;
let filmWidth = 0;
let filmHeight = 0;
let filmCamera = origin;
const filmControls = ["grain", "dust"].map(name => ({
  name, input: byId("film-" + name), value: byId("film-" + name + "-value")
}));

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
  track.style.setProperty("--travel", Math.max(0, playback.length - 1) * step + "px");
  viewport.scrollTop = currentPosition * step;
  if (reset) {
    displayed = currentPosition;
    previousCamera = null;
    motionBlur = 0;
  }
  requestRender();
}

function requestRender() {
  if (!frame) frame = requestAnimationFrame(render);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ease(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function mountCard(image) {
  const card = document.createElement("figure");
  card.className = "photo";
  const photo = new Image();
  photo.alt = "";
  photo.src = image.src;
  photo.decoding = "async";
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
    axis: [(x / length).toFixed(4), (y / length).toFixed(4), (z / length).toFixed(4)].join(","),
    angle: 2 * Math.atan2(length, w) * 180 / Math.PI
  };
}

function frameRotation(attitude, offset) {
  const pose = offset >= 0 ? attitude.entry : attitude.exit;
  const lean = ease((Math.abs(offset) - .075) / .78);
  return "rotate3d(" + pose.axis + "," + (pose.angle * lean).toFixed(2) + "deg)";
}

function shuffled(items, random) {
  const result = items.slice();
  for (let last = result.length - 1; last > 0; last--) {
    const other = Math.floor(random() * (last + 1));
    [result[last], result[other]] = [result[other], result[last]];
  }
  return result;
}

function buildDepths(length, referenceIndex, random) {
  const depths = [];
  while (depths.length < length) {
    const firstDeck = !depths.length;
    const reserve = firstDeck && referenceIndex >= 0;
    const pins = reserve ? [.08, -.14] : [];
    const deck = shuffled(depthPlanes.filter(z => !pins.includes(z)), random);
    if (reserve) deck.splice(referenceIndex, 0, ...pins);
    if (!firstDeck && deck[0] === depths.at(-1)) deck.push(deck.shift());
    const ascending = deck.slice(1).every((z, i) => z > deck[i]);
    const descending = deck.slice(1).every((z, i) => z < deck[i]);
    if (ascending || descending) [deck[3], deck[4]] = [deck[4], deck[3]];
    depths.push(...deck);
  }
  return depths.slice(0, length);
}

function buildRoute(length, referenceIndex, random) {
  const depths = buildDepths(length, referenceIndex, random);
  if (!length) return [];
  const shots = [{ x: 0, y: 0, z: depths[0] }];
  let bearing = random() * Math.PI * 2;
  for (let index = 1; index < length; index++) {
    const start = shots[index - 1];
    const isReference = index - 1 === referenceIndex;
    if (isReference) {
      bearing = Math.atan2(referenceMove.y, referenceMove.x);
    } else {
      const turn = .87 + random() * 1.54;
      bearing += (random() < .5 ? -1 : 1) * turn;
    }
    const reach = .59 + random() * .22;
    const x = isReference ? referenceMove.x : Math.cos(bearing) * reach;
    const y = isReference ? referenceMove.y : Math.sin(bearing) * reach;
    const bend = (random() < .5 ? -1 : 1) * (.10 + random() * .14);
    shots.push({
      x: start.x + x, y: start.y + y, z: depths[index], bend, reference: isReference,
      hold: .055 + random() * .095,
      roll: (random() - .5) * 10
    });
  }
  return shots;
}

function rebuildPlayback() {
  const random = seededRandom(routeSeed);
  const isShuffle = playbackOrder.value === "shuffle";
  playback = isShuffle ? shuffled(images, random) : images.slice();
  if (isShuffle && playback.length > 1 && playback.every((image, index) => image === images[index])) {
    playback.push(playback.shift());
  }
  const referenceIndex = isShuffle ? -1 : custom ? 0 : 1;
  route = buildRoute(playback.length, referenceIndex, random);
  for (let index = 0; index < route.length; index++) {
    route[index].attitude = frameAttitude(playback[index].id);
  }
  regenerate.disabled = playback.length < 2;
  playbackOrder.disabled = playback.length < 2;
}

function restoreRoutePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(routePreferenceKey));
    if (Number.isInteger(saved?.seed)) routeSeed = saved.seed >>> 0;
    playbackOrder.value = saved?.order === "shuffle" ? "shuffle" : "manual";
  } catch {}
}

function saveRoutePreferences() {
  try {
    localStorage.setItem(routePreferenceKey, JSON.stringify({ seed: routeSeed, order: playbackOrder.value }));
  } catch {}
}

function cameraAt(position, aspect = 1) {
  const index = Math.floor(position);
  const start = route[index] || origin;
  const next = route[index + 1] || start;
  const move = { x: next.x - start.x, y: next.y - start.y, z: next.z - start.z };
  const phase = position - index;

  if (next.reference) {
    const glide = ease((phase - .12) / .76);
    const crossing = Math.sin(Math.PI * glide) ** 2;
    const rack = ease((phase - .25) / .55);
    return {
      x: start.x + move.x * glide + .045 * crossing,
      y: start.y + move.y * glide - .078 * crossing,
      z: start.z + move.z * glide - .205 * crossing,
      roll: -5.2 * crossing,
      focusZ: start.z + move.z * rack,
      crossing, aspect
    };
  }

  const hold = next.hold ?? .065;
  const glide = ease((phase - hold) / (1 - 2 * hold));
  const arc = Math.sin(Math.PI * glide) ** 2;
  const bend = (next.bend || 0) * arc;
  return {
    x: start.x + move.x * glide - move.y * bend,
    y: start.y + move.y * glide + move.x * bend,
    z: start.z + move.z * glide + .065 * arc,
    roll: (next.roll || 0) * arc,
    focusZ: start.z + move.z * ease((phase - .16) / .68),
    crossing: 0, aspect
  };
}

function viewFromCamera(point, camera) {
  const z = Math.min(.58, point.z - camera.z);
  const x = point.x - camera.x;
  const y = point.y - camera.y;
  const angle = (camera.roll || 0) * Math.PI / 180;
  const aspect = camera.aspect || 1;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return { x: x * cos - y * sin / aspect, y: x * sin * aspect + y * cos,
    z, scale: 1 / (1 - z) };
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
  return 38 + Math.round(z * 36);
}

function renderFilm(camera, width, height) {
  filmWidth = width;
  filmHeight = height;
  filmCamera = camera;

  const grainView = viewFromCamera(grainPlane, { ...camera, roll: 0 });
  const tile = 144 * (1 - grainPlane.z) * grainView.scale;
  const textureX = (width * (.62 + grainView.x * grainView.scale)) % tile;
  const textureY = (height * (.62 + grainView.y * grainView.scale)) % tile;
  const tileSize = tile.toFixed(2) + "px";
  filmSurface.style.transform = "rotate(" + (camera.roll || 0).toFixed(2) + "deg)";
  opticalGlow.style.opacity = String(.035 + (camera.crossing || 0) * .16);
  opticalGlow.style.transform = "translateX(" + ((camera.crossing || 0) * -9) + "%)";
  filmSurface.style.backgroundSize = tileSize + " " + tileSize;
  filmSurface.style.backgroundPosition = textureX.toFixed(2) + "px " + textureY.toFixed(2) + "px";

  for (const { canvas, z } of dustPlanes) canvas.style.zIndex = String(layerAtDepth(z - camera.z));
  if (reducedMotion.matches && dustStrength) drawDust();
}

function wrapNear(value, center, span) {
  const offset = value - center + span / 2;
  return center + ((offset % span + span) % span) - span / 2;
}

function sampleDust(particle, planeZ, elapsed, camera) {
  const wave = elapsed * particle.frequency + particle.phase;
  const span = 1.42 * (1.31 - planeZ);
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

function drawDust() {
  if (!filmWidth || !filmHeight) return;
  const density = Math.min(window.devicePixelRatio || 1, 1.5);
  const pixelWidth = Math.round(filmWidth * density);
  const pixelHeight = Math.round(filmHeight * density);
  const strength = Math.pow(dustStrength, .68);
  for (const { canvas, context, particles, z } of dustPlanes) {
    if (!context) continue;
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.clearRect(0, 0, filmWidth, filmHeight);
    for (const particle of particles) {
      const { x, y, scale, light, warm } = sampleDust(particle, z, dustTime, filmCamera);
      if (x < -.015 || x > 1.015 || y < -.015 || y > 1.015) continue;
      const px = x * filmWidth;
      const py = y * filmHeight;
      const radius = particle.radius * (.45 + .58 * scale);
      const tone = warm ? "255,228,189" : "213,234,255";
      if (light > .34) {
        const reach = radius * (2.4 + Math.min(1.4, scale));
        const glow = context.createRadialGradient(px, py, 0, px, py, reach);
        glow.addColorStop(0, "rgba(" + tone + "," + (.47 * light * strength) + ")");
        glow.addColorStop(1, "rgba(" + tone + ",0)");
        context.fillStyle = glow;
        context.fillRect(px - reach, py - reach, reach * 2, reach * 2);
      }
      const alpha = strength * (.05 + .82 * light) * Math.min(1, .62 + .27 * scale);
      context.fillStyle = "rgba(" + tone + "," + alpha + ")";
      context.beginPath();
      context.arc(px, py, radius * (1 + .18 * light), 0, Math.PI * 2);
      context.fill();
    }
  }
}

function animateDust(time) {
  dustFrame = 0;
  if (!dustStrength || document.hidden || reducedMotion.matches) return;
  const elapsed = lastDustTime ? time - lastDustTime : 34;
  if (elapsed >= 30) {
    dustTime += Math.min(elapsed, 60) / 1000;
    lastDustTime = time;
    drawDust();
  }
  dustFrame = requestAnimationFrame(animateDust);
}

function refreshDust() {
  for (const { canvas } of dustPlanes) canvas.hidden = !dustStrength;
  const moving = dustStrength && !document.hidden && !reducedMotion.matches;
  if (moving && !dustFrame) {
    lastDustTime = 0;
    dustFrame = requestAnimationFrame(animateDust);
  } else if (!moving && dustFrame) {
    cancelAnimationFrame(dustFrame);
    dustFrame = 0;
  }
  if (!moving && dustStrength && !document.hidden) drawDust();
}

function applyFilmControl({ name, input, value }) {
  const strength = Number(input.value) / 100;
  if (name === "grain") {
    stage.style.setProperty("--film-grain", String(strength));
  } else {
    dustStrength = strength;
    refreshDust();
  }
  value.value = input.value + "%";
}

function initializeFilmControls() {
  for (const control of filmControls) {
    const { name, input } = control;
    const key = "cinematic-photo-flow:film:" + name;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) input.value = saved;
    } catch {}
    applyFilmControl(control);
    input.addEventListener("input", () => applyFilmControl(control));
    input.addEventListener("change", () => {
      try { localStorage.setItem(key, input.value); } catch {}
    });
  }
}

function render(time) {
  frame = 0;
  const target = clamp(viewport.scrollTop / step, 0, Math.max(0, playback.length - 1));
  const delta = target - displayed;
  const dt = clamp(time - previousTime, 8, 32);
  previousTime = time;
  displayed = reducedMotion.matches || Math.abs(delta) < .003
    ? target : displayed + delta * (1 - Math.exp(-dt / 68));

  const center = clamp(Math.round(displayed), 0, Math.max(0, playback.length - 1));
  const position = reducedMotion.matches ? center : displayed;
  const visible = new Set();
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const lens = Math.max(510, height * 1.4);
  const camera = cameraAt(position, width / Math.max(1, height));
  updateMotionBlur(camera, width, height, lens, dt);
  scene.style.setProperty("--scene-lens", lens + "px");
  renderFilm(reducedMotion.matches ? origin : camera, width, height);
  const compact = width < 650;
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
    const depthDefocus = Math.abs(shot.z - camera.focusZ) * 4.6;
    const separation = .33 * ease((distance - .12) / .94);
    const defocus = clamp(depthDefocus + separation, 0, 1);
    const blur = defocus * (compact ? 10 : 16) + motionBlur * (.45 + .55 * tilt);
    const viewRatio = clamp(image.ratio, .58, 2.1);
    const heightLimit = compact ? .84 : viewRatio < 1 ? .95 : .83;
    const photoHeight = Math.min(height * heightLimit, width * (compact ? .83 : .68) / viewRatio);
    const photoWidth = photoHeight * viewRatio;
    const card = cards.get(image.id) || mountCard(image);
    const photo = card.firstElementChild;

    card.style.width = photoWidth + "px";
    card.style.height = photoHeight + "px";
    card.style.transform = "translate3d(calc(-50% + " + (relative.x * width).toFixed(2) +
      "px),calc(-50% + " + (relative.y * height).toFixed(2) + "px)," +
      (relative.z * lens).toFixed(2) + "px) rotateZ(" + camera.roll.toFixed(2) +
      "deg) " + rotation;
    card.style.zIndex = String(layerAtDepth(relative.z));
    card.style.filter = blur > .05 ? "blur(" + blur.toFixed(2) +
      "px) brightness(" + (1 - defocus * .24).toFixed(3) + ")" : "none";
    card.style.setProperty("--edge-light", (.10 + .12 * camera.crossing + .06 * tilt).toFixed(2));
    card.style.opacity = String(1 - ease((distance - 1.15) / 1.57));
    photo.style.objectPosition = image.x + "% " + image.y + "%";
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
  byId("progress").style.width = playback.length > 1 ? (position / (playback.length - 1) * 100) + "%" : "0%";
  if (Math.abs(target - displayed) >= .003 || motionBlur) requestRender();
}

function goTo(index, immediate = false) {
  const target = clamp(index, 0, Math.max(0, playback.length - 1));
  viewport.scrollTo({ top: target * step, behavior: immediate || reducedMotion.matches ? "instant" : "smooth" });
  requestRender();
}

function updateSelection() {
  for (const [index, thumbnail] of Array.from(strip.querySelectorAll(".thumb")).entries()) {
    if (index === selected) thumbnail.setAttribute("aria-current", "true");
    else thumbnail.removeAttribute("aria-current");
  }
  const image = images[selected];
  byId("image-actions").hidden = !custom || !image;
  byId("selected-name").textContent = image?.name || "";
  byId("earlier").disabled = busy || selected === 0;
  byId("later").disabled = busy || selected >= images.length - 1;
  for (const id of ["replace", "remove", "focal"]) byId(id).disabled = busy;
}

function renderEditor(reset = true, fromStart = false) {
  if (reset) rebuildPlayback();
  if (fromStart) selected = Math.max(0, images.indexOf(playback[0]));
  strip.replaceChildren();
  images.forEach((image, index) => {
    const item = document.createElement("li");
    item.dataset.id = image.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb";
    button.draggable = custom;
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
      selected = index;
      updateSelection();
      goTo(playback.indexOf(image));
    });
    item.append(button);
    strip.append(item);
  });

  byId("empty").hidden = images.length > 0;
  byId("source-label").textContent = custom ? "La tua sequenza" : "Galleria demo";
  byId("instruction").textContent = images.length > 1 ? "Scorri per esplorare" : "";
  byId("instruction").parentElement.hidden = images.length < 2;
  byId("edit-help").textContent = custom
    ? "Trascina le miniature per cambiare l’ordine."
    : "Carica le tue immagini per iniziare.";
  if (reset) {
    for (const card of cards.values()) card.remove();
    cards.clear();
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

async function importFiles(files, replaceId = null) {
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
    if (!custom) {
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
    renderEditor();
    keepProject();
    if (notice) saving.then(() => { byId("save-state").textContent += " · " + notice; });
  } else {
    byId("save-state").textContent = notice;
    updateSelection();
  }
}

function chooseFiles(id = null) {
  if (!ready || busy) return;
  replacementId = id;
  fileInput.multiple = !id;
  fileInput.click();
}

function moveImage(from, to) {
  if (!custom || busy || from < 0 || to < 0 || to >= images.length || from === to) return;
  const [image] = images.splice(from, 1);
  images.splice(to, 0, image);
  selected = to;
  renderEditor();
  strip.querySelectorAll(".thumb")[selected]?.focus({ preventScroll: true });
  byId("live").textContent = image.name + " in posizione " + (to + 1);
  keepProject();
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
reducedMotion.addEventListener("change", () => {
  requestRender();
  refreshDust();
});
document.addEventListener("visibilitychange", refreshDust);

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
playbackOrder.addEventListener("change", () => {
  saveRoutePreferences();
  renderEditor(true, true);
});
regenerate.addEventListener("click", () => {
  routeSeed = (routeSeed + 0x9E3779B9) >>> 0;
  saveRoutePreferences();
  renderEditor(true, true);
  byId("live").textContent = "Nuovo percorso pronto.";
});
byId("replace").addEventListener("click", () => chooseFiles(images[selected]?.id));
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  const id = replacementId;
  fileInput.value = "";
  replacementId = null;
  importFiles(files, id);
});
byId("earlier").addEventListener("click", () => moveImage(selected, selected - 1));
byId("later").addEventListener("click", () => moveImage(selected, selected + 1));
byId("remove").addEventListener("click", () => {
  if (!custom || busy || !images[selected]) return;
  const [removed] = images.splice(selected, 1);
  URL.revokeObjectURL(removed.src);
  selected = clamp(selected, 0, Math.max(0, images.length - 1));
  renderEditor();
  keepProject();
});

strip.addEventListener("dragstart", event => {
  const item = event.target.closest("li");
  if (!item || !custom || busy) { event.preventDefault(); return; }
  draggedId = item.dataset.id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedId);
});

function clearDrop() {
  dropArea.classList.remove("dragover");
  strip.querySelector("[data-drop]")?.removeAttribute("data-drop");
}
strip.addEventListener("dragend", () => { draggedId = null; clearDrop(); });
dropArea.addEventListener("dragleave", event => {
  if (!dropArea.contains(event.relatedTarget)) clearDrop();
});
dropArea.addEventListener("dragover", event => {
  if (!draggedId && !event.dataTransfer.types.includes("Files")) return;
  event.preventDefault();
  clearDrop();
  if (draggedId) event.target.closest("li")?.setAttribute("data-drop", "");
  else dropArea.classList.add("dragover");
});
dropArea.addEventListener("drop", event => {
  event.preventDefault();
  clearDrop();
  if (event.dataTransfer.files.length) {
    importFiles(Array.from(event.dataTransfer.files));
  } else if (draggedId) {
    const target = event.target.closest("li")?.dataset.id;
    const to = target ? images.findIndex(image => image.id === target) : images.length - 1;
    moveImage(images.findIndex(image => image.id === draggedId), to);
  }
  draggedId = null;
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
  restoreRoutePreferences();
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
}

initializeFilmControls();
initialize();
