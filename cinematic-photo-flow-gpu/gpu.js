/* Experimental GPU blur. The original renderer remains available per photo as a fallback. */
const gpuPhotos = new WeakMap();
let gpuReady = 0;
let gpuUnavailable = false;

function updateGpuStatus() {
  const status = document.getElementById("gpu-status");
  if (!status) return;
  status.textContent = gpuReady ? "Sfocatura GPU attiva" :
    gpuUnavailable ? "GPU non disponibile · sfocatura standard" : "Verifica GPU…";
}

function attachGpuPhoto(card, photo) {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) {
    gpuUnavailable = true;
    updateGpuStatus();
    return;
  }
  const state = { gl, canvas, photo, ready: false, disposed: false, blur: -1, brightness: -1 };
  gpuPhotos.set(card, state);
  const vertex = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = (position + 1.0) * 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`;
  const fragment = `
    precision mediump float;
    uniform sampler2D image;
    uniform vec2 radius;
    uniform float brightness;
    varying vec2 uv;
    void main() {
      vec4 color = texture2D(image, uv) * 0.20;
      color += texture2D(image, uv + vec2(radius.x, 0.0)) * 0.10;
      color += texture2D(image, uv - vec2(radius.x, 0.0)) * 0.10;
      color += texture2D(image, uv + vec2(0.0, radius.y)) * 0.10;
      color += texture2D(image, uv - vec2(0.0, radius.y)) * 0.10;
      color += texture2D(image, uv + radius * 0.70) * 0.075;
      color += texture2D(image, uv - radius * 0.70) * 0.075;
      color += texture2D(image, uv + vec2(radius.x, -radius.y) * 0.70) * 0.075;
      color += texture2D(image, uv + vec2(-radius.x, radius.y) * 0.70) * 0.075;
      color += texture2D(image, uv + vec2(radius.x * 2.0, 0.0)) * 0.025;
      color += texture2D(image, uv - vec2(radius.x * 2.0, 0.0)) * 0.025;
      color += texture2D(image, uv + vec2(0.0, radius.y * 2.0)) * 0.025;
      color += texture2D(image, uv - vec2(0.0, radius.y * 2.0)) * 0.025;
      gl_FragColor = vec4(color.rgb * brightness, color.a);
    }`;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  try {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    state.radius = gl.getUniformLocation(program, "radius");
    state.brightnessUniform = gl.getUniformLocation(program, "brightness");
    photo.decode().then(() => {
      if (state.disposed || !card.isConnected) return;
      const limit = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 2048);
      const scale = Math.min(1, limit / Math.max(photo.naturalWidth, photo.naturalHeight));
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
      canvas.style.objectPosition = photo.style.objectPosition;
      state.ready = true;
      gpuReady++;
      updateGpuStatus();
      drawGpuPhoto(card, 0, 1);
      card.replaceChild(canvas, photo);
      requestRender();
    }).catch(() => releaseGpuPhoto(card));
  } catch (error) {
    console.warn("GPU blur unavailable", error);
    gpuUnavailable = true;
    updateGpuStatus();
    releaseGpuPhoto(card);
  }
}

function drawGpuPhoto(card, blur, brightness) {
  const state = gpuPhotos.get(card);
  if (!state || !state.ready) return false;
  if (state.gl.isContextLost()) {
    if (state.canvas.parentNode === card) card.replaceChild(state.photo, state.canvas);
    releaseGpuPhoto(card);
    return false;
  }
  const { gl, canvas } = state;
  const roundedBlur = Math.round(blur * 20) / 20;
  const roundedBrightness = Math.round(brightness * 1000) / 1000;
  if (state.blur === roundedBlur && state.brightness === roundedBrightness) return true;
  state.blur = roundedBlur;
  state.brightness = roundedBrightness;
  gl.uniform2f(state.radius, roundedBlur / Math.max(1, card.clientWidth), roundedBlur / Math.max(1, card.clientHeight));
  gl.uniform1f(state.brightnessUniform, roundedBrightness);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  return true;
}

function releaseGpuPhoto(card) {
  const state = gpuPhotos.get(card);
  if (!state) return;
  state.disposed = true;
  if (state.ready) {
    gpuReady--;
    state.ready = false;
    updateGpuStatus();
  }
  state.gl.getExtension("WEBGL_lose_context")?.loseContext();
  gpuPhotos.delete(card);
}
