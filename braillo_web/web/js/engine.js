/* Motor CNN en JavaScript puro: lee braille_cnn.json (pesos exportados con BatchNorm fusionado).
   Sin WebAssembly ni librerias externas: funciona sin conexion en cualquier navegador movil. */
(function (root) {
  "use strict";
  const T = (a) => Float32Array.from(a);

  function load(json) {
    return { kind: json.kind, ops: json.ops.map((o) => (o.w ? { ...o, w: T(o.w), b: T(o.b) } : o)) };
  }

  function conv(x, H, W, o) { // 3x3, padding "same", ReLU
    const { cin, cout, w, b } = o, y = new Float32Array(H * W * cout);
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
      const base = (i * W + j) * cout;
      for (let co = 0; co < cout; co++) y[base + co] = b[co];
      for (let di = -1; di <= 1; di++) { const ii = i + di; if (ii < 0 || ii >= H) continue;
        for (let dj = -1; dj <= 1; dj++) { const jj = j + dj; if (jj < 0 || jj >= W) continue;
          const xi = (ii * W + jj) * cin, wi = ((di + 1) * 3 + (dj + 1)) * cin * cout;
          for (let ci = 0; ci < cin; ci++) { const v = x[xi + ci]; if (v === 0) continue;
            const wo = wi + ci * cout; for (let co = 0; co < cout; co++) y[base + co] += v * w[wo + co]; } } }
      for (let co = 0; co < cout; co++) if (y[base + co] < 0) y[base + co] = 0;
    }
    return y;
  }
  function pool(x, H, W, C) {
    const h = H >> 1, w = W >> 1, y = new Float32Array(h * w * C);
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) for (let c = 0; c < C; c++) {
      let m = -1e30;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) m = Math.max(m, x[((2 * i + a) * W + 2 * j + b) * C + c]);
      y[(i * w + j) * C + c] = m;
    }
    return y;
  }
  function dense(x, o) {
    const y = new Float32Array(o.nout);
    for (let k = 0; k < o.nout; k++) { let s = o.b[k]; for (let i = 0; i < o.nin; i++) s += x[i] * o.w[i * o.nout + k]; y[k] = s; }
    if (o.act === "relu") for (let k = 0; k < y.length; k++) y[k] = Math.max(0, y[k]);
    else if (o.act === "sigmoid") for (let k = 0; k < y.length; k++) y[k] = 1 / (1 + Math.exp(-y[k]));
    return y;
  }
  // pixels: Float32Array(784) en [0,1]. Devuelve salida cruda de la red.
  function forward(model, pixels) {
    let x = Float32Array.from(pixels), H = 28, W = 28, C = 1;
    for (const o of model.ops) {
      if (o.t === "std") { let m = 0; for (const v of x) m += v; m /= x.length; let s = 0; for (const v of x) s += (v - m) ** 2;
        const sd = Math.sqrt(s / x.length) + 1e-3; x = x.map((v) => (v - m) / sd); }
      else if (o.t === "conv") { x = conv(x, H, W, o); C = o.cout; }
      else if (o.t === "pool") { x = pool(x, H, W, C); H >>= 1; W >>= 1; }
      else if (o.t === "gap") { const y = new Float32Array(C); for (let p = 0; p < H * W; p++) for (let c = 0; c < C; c++) y[c] += x[p * C + c]; x = y.map((v) => v / (H * W)); H = W = 1; }
      else if (o.t === "dense") x = dense(x, o);
    }
    return x;
  }
  // 6 sigmoides -> patron 1..63 y confianza (producto de la prob. de cada punto)
  function toPattern(out) {
    let bits = Array.from(out, (p) => p > 0.5);
    if (!bits.some(Boolean)) { let k = 0; out.forEach((p, i) => { if (p > out[k]) k = i; }); bits[k] = true; }
    let pat = 0, conf = 1;
    bits.forEach((b, i) => { if (b) pat |= 1 << i; conf *= b ? out[i] : 1 - out[i]; });
    return { pattern: pat, confidence: conf };
  }
  const api = { load, forward, toPattern };
  if (typeof module !== "undefined") module.exports = api; else root.BrailleEngine = api;
})(typeof self !== "undefined" ? self : this);
