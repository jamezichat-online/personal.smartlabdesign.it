
(() => {
  const width = 1920, height = 1080, fps = 60;
  const view = { width, height, lens: height * 1.4, aspect: width / height };
  const button = byId("export-video");
  const progress = byId("video-progress");
  const status = byId("video-status");
  const cancel = byId("cancel-video");
  let job;
  let downloadUrl;

  function makeCanvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  function texture(photo, shot, bitmap) {
    const w = Math.ceil(shot.size.width), h = Math.ceil(shot.size.height);
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.roundRect(0, 0, w, h, 22);
    ctx.clip();
    const scale = Math.max(w / (bitmap.naturalWidth || bitmap.width), h / (bitmap.naturalHeight || bitmap.height));
    const iw = (bitmap.naturalWidth || bitmap.width) * scale, ih = (bitmap.naturalHeight || bitmap.height) * scale;
    ctx.drawImage(bitmap, (w - iw) * photo.x / 100, (h - ih) * photo.y / 100, iw, ih);
    ctx.strokeStyle = "#ffffff22";
    ctx.stroke();
    return canvas;
  }

  function triangle(ctx, bitmap, a, b, c, sx, sy, sw, sh, reverse) {
    const sign = reverse ? -1 : 1;
    const ux = (b[0] - a[0]) / sw * sign, uy = (b[1] - a[1]) / sw * sign;
    const vx = (c[0] - a[0]) / sh * sign, vy = (c[1] - a[1]) / sh * sign;
    ctx.save();
    ctx.beginPath();
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
    for (const [x, y] of [a, b, c]) {
      const distance = Math.hypot(x - cx, y - cy) || 1;
      ctx.lineTo(x + (x - cx) / distance, y + (y - cy) / distance);
    }
    ctx.closePath();
    ctx.clip();
    ctx.setTransform(ux, uy, vx, vy, a[0] - ux * sx - vx * sy, a[1] - uy * sx - vy * sy);
    ctx.drawImage(bitmap, 0, 0);
    ctx.restore();
  }

  function drawPhoto(ctx, scratch, source, shot, index, position, camera, frameView, speedBlur) {
    const face = projectedFace(shot, index, position, camera, frameView);
    if (!face) return;
    const offset = index - position;
    const rotation = frameRotation(shot.attitude, offset);
    const relative = viewFromCamera(shot, camera);
    const tilt = confinedTilt(relative.depth, rotation, shot.size.width, shot.size.height, view.lens);
    const grid = 5;
    const sw = source.width / grid, sh = source.height / grid;
    const points = Array.from({ length: grid + 1 }, (_, row) =>
      Array.from({ length: grid + 1 }, (_, col) => {
        const u = col / grid, v = row / grid;
        const x = (u - .5) * shot.size.width, y = (v - .5) * shot.size.height;
        const d = (1 - relative.z - (rotation.zx * x + rotation.zy * y) * tilt / view.lens);
        const dx = rotation.xx * x + rotation.xy * y;
        const dy = rotation.yx * x + rotation.yy * y;
        const px = relative.x * width + frameView.rollCos * dx - frameView.rollSin * dy;
        const py = relative.y * height + frameView.rollSin * dx + frameView.rollCos * dy;
        return [width / 2 + px / d, height / 2 + py / d];
      }));
    const distance = Math.abs(offset);
    const defocus = opticalBlur(shot.z, camera.focusZ, distance);
    const blur = (defocus * 16 + speedBlur * (.45 + .55 * ease((distance - .09) / .74))) * relative.scale;
    const target = blur > .05 ? scratch : ctx;
    if (target === scratch) scratch.clearRect(0, 0, width, height);
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const a = points[y][x], b = points[y][x + 1];
        const c = points[y + 1][x], d = points[y + 1][x + 1];
        triangle(target, source, a, b, c, x * sw, y * sh, sw, sh, false);
        triangle(target, source, d, c, b, (x + 1) * sw, (y + 1) * sh, sw, sh, true);
      }
    }
    if (target === scratch) {
      if ("filter" in ctx) ctx.filter = "blur(" + blur + "px) brightness(" + (1 - defocus * .24) + ")";
      ctx.drawImage(scratch.canvas, 0, 0);
      ctx.filter = "none";
    }
  }

  function paintDust(ctx, plane, time, camera) {
    for (const particle of plane.particles) {
      const { x, y, scale, light, warm } = sampleDust(particle, plane.z, time, camera);
      if (x < -.015 || x > 1.015 || y < -.015 || y > 1.015) continue;
      const px = x * width, py = y * height;
      const radius = particle.radius * (.45 + .58 * scale);
      const tone = warm ? "255,228,189" : "213,234,255";
      if (light > .34) {
        const extent = radius * (2.4 + Math.min(1.4, scale));
        ctx.globalAlpha = light;
        ctx.drawImage(dustGlow(tone), px - extent, py - extent, extent * 2, extent * 2);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "rgba(" + tone + "," + ((.05 + .82 * light) * Math.min(1, .62 + .27 * scale)) + ")";
      ctx.beginPath();
      ctx.arc(px, py, radius * (1 + .18 * light), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function ellipse(ctx, x, y, rx, ry, stops) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [where, color] of stops) gradient.addColorStop(where, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(-x / rx, -y / ry, width / rx, height / ry);
    ctx.restore();
  }

  function makeRenderer(ctx, shots, textures, grain) {
    const scratch = makeCanvas(width, height).getContext("2d");
    const tile = makeCanvas(72, 72);
    tile.getContext("2d").drawImage(grain, 0, 0, 72, 72);
    const pattern = ctx.createPattern(tile, "repeat");
    const layers = shots.map((shot, index) => ({ index, z: layerAtDepth(shot.z) + index % 8 }));
    layers.push(...dustPlanes.map(plane => ({ plane, z: layerAtDepth(plane.z) })));
    layers.sort((a, b) => a.z - b.z);
    const background = makeCanvas(width, height);
    ellipse(background.getContext("2d"), width * .54, height * .47, width * .72, height * .72,
      [[0,"#292323"],[.63,"#100e10"],[1,"#0a090a"]]);
    const vignette = makeCanvas(width, height);
    ellipse(vignette.getContext("2d"), width / 2, height / 2, width * .71, height * .71,
      [[.36,"#08070900"],[.84,"#08070938"],[1,"#08070958"]]);
    let previous;
    let speedBlur = 0;
    return (position, time) => {
      const index = Math.floor(position);
      const shot = shots[index];
      const camera = cameraBetween(shot, { ...(shots[index + 1] || shot), hold: 0 }, position - index, view.aspect);
      const speed = previous ? Math.hypot((camera.x - previous.x) * width, (camera.y - previous.y) * height,
        (camera.z - previous.z) * view.lens) * fps / 1000 : 0;
      previous = camera;
      speedBlur += (clamp((speed - .13) * 1.8, 0, 4.2) - speedBlur) * (1 - Math.exp(-1000 / fps / 32));
      if (speedBlur < .045) speedBlur = 0;
      const frameView = viewRoll(camera, view);
      ctx.drawImage(background, 0, 0);
      for (const layer of layers) {
        if (layer.plane) paintDust(ctx, layer.plane, time, camera);
        else drawPhoto(ctx, scratch, textures[layer.index], shots[layer.index], layer.index, position, camera, frameView, speedBlur);
      }
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = .035 + camera.crossing * .16;
      ellipse(ctx, width * (.92 - camera.crossing * .09), height * .39, width * .6, height * .68,
        [[0,"#ffc19b"],[.22,"#82462c"],[.73,"#82462c00"]]);
      ellipse(ctx, width * .10, height * .84, width * .5, height * .57, [[0,"#397c97"],[.7,"#397c9700"]]);
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = .15;
      const grainView = viewFromCamera(grainPlane, { ...camera, roll: 0 });
      const scale = 2 * (1 - grainPlane.z) * grainView.scale;
      ctx.translate(width / 2, height / 2);
      ctx.rotate(camera.roll * Math.PI / 180);
      ctx.translate((width * grainView.x * grainView.scale) % (72 * scale),
        (height * grainView.y * grainView.scale) % (72 * scale));
      ctx.scale(scale, scale);
      ctx.fillStyle = pattern;
      const span = Math.hypot(width, height) / scale + 144;
      ctx.fillRect(-span, -span, span * 2, span * 2);
      ctx.restore();
      ctx.drawImage(vignette, 0, 0);
    };
  }

  cancel.addEventListener("click", () => job?.abort());
  button.addEventListener("click", async () => {
    if (job) return;
    if (!playback.length) {
      status.textContent = "Aggiungi almeno una foto per esportare il video.";
      return;
    }
    job = new AbortController();
    const { signal } = job;
    button.disabled = true;
    cancel.hidden = false;
    progress.hidden = false;
    progress.value = 0;
    status.textContent = "Preparazione…";
    const gallery = playback.map(image => ({ ...image }));
    let output;
    try {
      const shots = buildRoute(gallery, seededRandom(routeSeed ^ 0x5bd1e995), width, height);
      if (!globalThis.VideoEncoder || !("filter" in makeCanvas(1, 1).getContext("2d"))) {
        throw new Error("Export video non supportato da questo browser. Prova una versione recente di Chrome o Edge.");
      }
      const { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, canEncodeVideo } =
        await import("https://cdn.jsdelivr.net/npm/mediabunny@1.23.0/+esm");
      const encoding = { width, height, bitrate: 16000000, framerate: fps };
      const codec = await canEncodeVideo("avc", encoding) ? "avc" :
        await canEncodeVideo("vp9", encoding) ? "vp9" : null;
      if (!codec) throw new Error("Nessun codificatore video 1080p disponibile. Prova Chrome o Edge aggiornati.");
      const mp4 = codec === "avc";
      const grain = new Image();
      const grainUrl = getComputedStyle(scene).getPropertyValue("--grain-tile").match(/data:image[^)"']+/)?.[0];
      grain.src = grainUrl;
      const textures = [];
      for (let index = 0; index < gallery.length; index++) {
        signal.throwIfAborted();
        const photo = gallery[index];
        const image = photo.blob ? await createImageBitmap(photo.blob) : makeStagePhoto(photo);
        try {
          if (image.decode) await image.decode();
          textures.push(texture(photo, shots[index], image));
        } finally {
          image.close?.();
        }
      }
      await grain.decode();
      signal.throwIfAborted();
      const canvas = makeCanvas(width, height);
      const renderFrame = makeRenderer(canvas.getContext("2d", { alpha: false }), shots, textures, grain);
      const target = new BufferTarget();
      output = new Output({ format: mp4 ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
      const source = new CanvasSource(canvas, { codec, bitrate: encoding.bitrate, latencyMode: "quality" });
      output.addVideoTrack(source, { frameRate: fps });
      await output.start();
      const transition = 2.5 * fps;
      const hold = 2 * fps;
      const segment = hold + transition;
      const total = (gallery.length - 1) * segment + hold;
      for (let i = 0; i < total; i++) {
        signal.throwIfAborted();
        const index = Math.floor(i / segment);
        const phase = Math.max(0, (i % segment - hold + 1) / (transition + 1));
        renderFrame(index + phase, i / fps);
        await source.add(i / fps, 1 / fps);
        const percent = Math.min(99, Math.floor((i + 1) * 100 / total));
        if (progress.value !== percent || i === 0) {
          progress.value = percent;
          status.textContent = "Rendering " + percent + "%";
        }
        if (i % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      status.textContent = "Finalizzazione del video…";
      await output.finalize();
      signal.throwIfAborted();
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(new Blob([target.buffer], { type: mp4 ? "video/mp4" : "video/webm" }));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "cinematic-photo-flow-1080p60." + (mp4 ? "mp4" : "webm");
      link.textContent = "Scarica di nuovo";
      progress.value = 100;
      status.replaceChildren("Video pronto · 100% ", link);
      link.click();
    } catch (error) {
      if (output && !["finalized", "canceled"].includes(output.state)) {
        await output.cancel().catch(() => {});
      }
      progress.hidden = true;
      status.textContent = signal.aborted ? "Esportazione annullata." :
        error.message || "Impossibile esportare il video.";
    } finally {
      job = null;
      button.disabled = false;
      cancel.hidden = true;
    }
  });
})();
