/* Braillo - interfaz. Pantallas: Inicio, Traducir, Aula (ERP escolar), Registro, Ajustes. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const view = $("#view"), sheet = $("#sheet"), db = Store.db;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const initials = (s) => (s || "?").trim().slice(0, 2).toUpperCase();
  const GRADES = ["1.º", "2.º", "3.º", "4.º", "5.º", "6.º"], LEVELS = ["Inicial", "Letras", "Palabras", "Frases", "Lectura fluida"];
  let model = null, tab = "home", tr = null;               // tr = estado de la pantalla Traducir

  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.k); toast.k = setTimeout(() => t.classList.remove("show"), 2200); }
  function openSheet(html) { sheet.innerHTML = `<div role="dialog" aria-modal="true">${html}</div>`; sheet.hidden = false; }
  function closeSheet() { sheet.hidden = true; sheet.innerHTML = ""; }
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  async function ensureModel() {
    if (model) return model;
    const r = await fetch("model/braille_cnn.json"); model = BrailleEngine.load(await r.json()); return model;
  }

  /* ---------- navegacion ---------- */
  function go(t) {
    tab = t; document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
    ({ home, translate, class: classroom, log, settings }[t])(); view.focus({ preventScroll: true }); window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));
  $("#btn-settings").addEventListener("click", () => go("settings"));

  /* ---------- INICIO ---------- */
  function home() {
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
    const counts = days.map((d) => db.records.filter((r) => new Date(r.date).toDateString() === d.toDateString()).length), mx = Math.max(1, ...counts);
    const conf = db.records.length ? Math.round((db.records.reduce((s, r) => s + (r.avgConf || 0), 0) / db.records.length) * 100) : null;
    view.innerHTML = `
      <section class="hero"><div class="dots" aria-hidden="true"><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i></div>
        <h2>Lee Braille<br>en segundos ✨</h2><p>Fotografía una línea, la IA la traduce al español sin internet y tú la corriges con un toque.</p>
        <div class="row" style="margin-top:14px"><button class="btn" data-go="translate">Traducir ahora</button><button class="btn alt" id="demo">Probar demo</button></div></section>
      <div class="stats"><div class="stat"><b>${db.students.length}</b><span>estudiantes</span></div><div class="stat"><b>${db.records.length}</b><span>traducciones</span></div><div class="stat"><b>${conf === null ? "–" : conf + "%"}</b><span>confianza media</span></div></div>
      <div class="card"><h3>Actividad de la semana</h3><div class="bars">${counts.map((c, i) => `<div><i style="height:${(c / mx) * 70 + 4}px" title="${c}"></i>${"DLMXJVS"[days[i].getDay()]}</div>`).join("")}</div></div>
      <h2>Últimas traducciones</h2>${db.records.slice(0, 3).map(recordItem).join("") || `<div class="empty"><big>⠿</big>Aún no hay traducciones.<br>Prueba la demo para ver cómo funciona.</div>`}
      <div class="card mut">Herramienta de apoyo para el docente: no reemplaza su criterio. Modelo en evaluación, revisa siempre las celdas marcadas con ⚠.</div>`;
    view.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    $("#demo").addEventListener("click", () => { go("translate"); loadImage("assets/demo_hola_lima.png", true); });
  }
  function recordItem(r) {
    const s = db.students.find((x) => x.id === r.studentId);
    return `<div class="item"><div class="avatar">${esc(initials(s?.alias || "··"))}</div><div class="grow"><div class="t">${esc(r.text || "(vacío)")}</div><div class="mut">${esc(s?.alias || "Sin estudiante")} · ${new Date(r.date).toLocaleDateString("es-PE")} · ${Math.round((r.avgConf || 0) * 100)}%${r.fixed ? ` · ${r.fixed} corregida(s)` : ""}</div></div></div>`;
  }

  /* ---------- TRADUCIR ---------- */
  function translate() {
    tr = tr || { cols: 9, rows: 1, crop: { l: 0, r: 0, t: 0, b: 0 }, zoom: 0, img: null, cells: null };
    view.innerHTML = `
      <h2>Traducir</h2>
      <div class="card"><div class="row"><label class="btn vio grow" style="text-align:center">📷 Tomar foto<input id="cam" type="file" accept="image/*" capture="environment" hidden></label>
        <label class="btn alt grow" style="text-align:center">🖼 Galería<input id="gal" type="file" accept="image/*" hidden></label></div>
        <p class="mut">Encuadra <b>una línea</b> de Braille, con buena luz lateral para que se vean los puntos.</p></div>
      <div id="work" ${tr.img ? "" : "hidden"}>
        <div class="stage"><canvas id="cv" aria-label="Vista previa con la cuadrícula de celdas"></canvas></div>
        <div class="card">
          <div class="field"><label for="cols">Celdas por línea</label><div class="step"><button data-st="cols" data-d="-1" aria-label="Menos celdas">−</button><output id="o-cols">${tr.cols}</output><button data-st="cols" data-d="1" aria-label="Más celdas">+</button></div></div>
          <div class="field"><label>Líneas</label><div class="step"><button data-st="rows" data-d="-1" aria-label="Menos líneas">−</button><output id="o-rows">${tr.rows}</output><button data-st="rows" data-d="1" aria-label="Más líneas">+</button></div></div>
          ${[["l", "Recorte izquierdo"], ["r", "Recorte derecho"], ["t", "Recorte superior"], ["b", "Recorte inferior"]].map(([k, n]) => `<label class="mut" for="c-${k}">${n}</label><input id="c-${k}" type="range" min="0" max="45" value="${tr.crop[k]}">`).join("")}
          <label class="mut" for="c-z">Encuadre de celda: <b id="zv">${tr.zoom > 0 ? "+" : ""}${tr.zoom}%</b> <span>(negativo = acercar)</span></label><input id="c-z" type="range" min="-30" max="25" value="${tr.zoom}">
          <button class="btn grow" id="go" style="width:100%;margin-top:12px">⚡ Traducir</button></div>
        <div id="out"></div></div>`;
    $("#cam").addEventListener("change", (e) => fileIn(e.target.files[0])); $("#gal").addEventListener("change", (e) => fileIn(e.target.files[0]));
    view.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.st; tr[k] = Math.min(k === "cols" ? 40 : 8, Math.max(1, tr[k] + +b.dataset.d)); $("#o-" + k).textContent = tr[k]; draw();
    }));
    ["l", "r", "t", "b"].forEach((k) => $("#c-" + k).addEventListener("input", (e) => { tr.crop[k] = +e.target.value; draw(); }));
    $("#c-z").addEventListener("input", (e) => { tr.zoom = +e.target.value; $("#zv").textContent = (tr.zoom > 0 ? "+" : "") + tr.zoom + "%"; });
    $("#go").addEventListener("click", run);
    if (tr.img) { draw(); if (tr.cells) renderOut(); }
  }
  function fileIn(f) { if (f) loadImage(URL.createObjectURL(f)); }
  function loadImage(src, demo) {
    const img = new Image(); img.onload = () => {
      tr = { cols: demo ? 9 : 9, rows: 1, crop: { l: 0, r: 0, t: 0, b: 0 }, zoom: 0, img, cells: null, demo: !!demo }; translate(); if (demo) run();
    }; img.src = src;
  }
  function region() { // area recortada en pixeles de la imagen original
    const { img, crop: c } = tr, w = img.naturalWidth, h = img.naturalHeight;
    return { x: (c.l / 100) * w, y: (c.t / 100) * h, w: w * (1 - (c.l + c.r) / 100), h: h * (1 - (c.t + c.b) / 100) };
  }
  function draw() {
    const cv = $("#cv"), { img } = tr, W = 640, H = Math.round((W * img.naturalHeight) / img.naturalWidth);
    cv.width = W; cv.height = H; const g = cv.getContext("2d"); g.drawImage(img, 0, 0, W, H);
    const R = region(), k = W / img.naturalWidth, x = R.x * k, y = R.y * k, w = R.w * k, h = R.h * k;
    g.fillStyle = "rgba(13,11,31,.62)"; g.fillRect(0, 0, W, y); g.fillRect(0, y + h, W, H - y - h); g.fillRect(0, y, x, h); g.fillRect(x + w, y, W - x - w, h);
    g.strokeStyle = "#2ee6b6"; g.lineWidth = 2; g.setLineDash([6, 5]);
    for (let i = 0; i <= tr.cols; i++) { g.beginPath(); g.moveTo(x + (w * i) / tr.cols, y); g.lineTo(x + (w * i) / tr.cols, y + h); g.stroke(); }
    for (let j = 0; j <= tr.rows; j++) { g.beginPath(); g.moveTo(x, y + (h * j) / tr.rows); g.lineTo(x + w, y + (h * j) / tr.rows); g.stroke(); }
  }
  function sampleCell(R, i, j) { // recorta una celda de la cuadricula y la lleva a 28x28 en grises
    const cw = R.w / tr.cols, ch = R.h / tr.rows, m = tr.zoom / 100;
    const s = document.createElement("canvas"); s.width = s.height = 28; const g = s.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingEnabled = true; g.drawImage(tr.img, R.x + (i - m) * cw, R.y + (j - m) * ch, cw * (1 + 2 * m), ch * (1 + 2 * m), 0, 0, 28, 28);
    const d = g.getImageData(0, 0, 28, 28).data, px = new Float32Array(784);
    for (let p = 0; p < 784; p++) px[p] = (0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2]) / 255;
    return px;
  }
  async function run() {
    const btn = $("#go"); btn.disabled = true; btn.textContent = "Analizando…"; await ensureModel(); await new Promise((r) => setTimeout(r, 30));
    const R = region(), raw = [], sds = [];
    for (let j = 0; j < tr.rows; j++) {
      for (let i = 0; i < tr.cols; i++) {
        const px = sampleCell(R, i, j); let m = 0; px.forEach((v) => (m += v)); m /= 784; let v = 0; px.forEach((x) => (v += (x - m) ** 2));
        const sd = Math.sqrt(v / 784); raw.push({ px, sd }); sds.push(sd);
      }
    }
    // celda vacia = desviacion muy baja respecto a la linea (umbral relativo: las fotos con poco contraste lo exigen)
    const sorted = [...sds].sort((a, b) => a - b), p75 = sorted[Math.floor(sorted.length * 0.75)] || 0, thEmpty = Math.min(0.02, Math.max(0.006, 0.35 * p75));
    const cells = []; let n = 0;
    for (let j = 0; j < tr.rows; j++) {
      for (let i = 0; i < tr.cols; i++) {
        const { px, sd } = raw[n++];
        if (sd < thEmpty) cells.push({ px, pattern: 0, conf: 1, empty: true });
        else { const { pattern, confidence } = BrailleEngine.toPattern(BrailleEngine.forward(model, px)); cells.push({ px, pattern, conf: confidence }); }
      }
      if (j < tr.rows - 1) cells.push({ nl: true });
    }
    tr.cells = cells; btn.disabled = false; btn.textContent = "⚡ Traducir de nuevo"; renderOut(); $("#out").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function thumb(px) { const c = document.createElement("canvas"); c.width = c.height = 28; const g = c.getContext("2d"), im = g.createImageData(28, 28);
    let lo = 1, hi = 0; px.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    for (let i = 0; i < 784; i++) { const v = Math.round(((px[i] - lo) / (hi - lo || 1)) * 255); im.data.set([v, v, v, 255], i * 4); } g.putImageData(im, 0, 0); return c.toDataURL(); }
  const real = () => tr.cells.filter((c) => !c.nl);
  function textOf() { // une lineas con salto
    let out = [], cur = []; tr.cells.forEach((c) => { if (c.nl) { out.push(Braille.decode(cur)); cur = []; } else cur.push(c.pattern); }); out.push(Braille.decode(cur)); return out.join("\n").replace(/ +\n/g, "\n").trim();
  }
  function renderOut() {
    const rc = real(), th = db.settings.threshold, low = rc.filter((c) => !c.empty && c.conf < th).length, avg = rc.reduce((s, c) => s + c.conf, 0) / (rc.length || 1);
    const stu = `<option value="">Sin estudiante</option>` + db.students.map((s) => `<option value="${s.id}">${esc(s.alias)}</option>`).join("");
    $("#out").innerHTML = `<div class="card"><p class="mut">Texto reconocido</p><div class="result" id="txt">${esc(textOf()) || "…"}</div>
      <div class="chips" role="list">${tr.cells.map((c, k) => c.nl ? `<span class="chip nl"></span>` : `<button role="listitem" class="chip ${!c.empty && c.conf < th ? "low" : ""} ${c.fixed ? "fixed" : ""}" data-k="${k}" aria-label="Celda ${k + 1}: ${Braille.label(c.pattern)}${!c.empty && c.conf < th ? ", baja confianza" : ""}"><img alt="" src="${thumb(c.px)}">${esc(Braille.label(c.pattern))}<small>${c.empty ? "vacía" : Math.round(c.conf * 100) + "%"}</small></button>`).join("")}</div>
      <div class="legend"><span>■ verde: segura</span><span>⚠ ámbar: revisa</span><span style="color:#c8b6ff">■ morado: corregida</span></div>
      <p class="mut">${low ? `⚠ ${low} celda(s) con baja confianza. Tócalas para corregir los puntos.` : "Toca cualquier celda para corregirla."}</p></div>
      <div class="card"><h3>Guardar en el registro</h3><select id="stu" aria-label="Estudiante">${stu}</select><input id="task" placeholder="Actividad (opcional): dictado, tarea 3…" style="margin-top:8px">
      <div class="row" style="margin-top:10px"><button class="btn grow" id="save">Guardar</button><button class="btn alt" id="copy">Copiar</button></div></div>`;
    $("#out").querySelectorAll(".chip[data-k]").forEach((b) => b.addEventListener("click", () => editCell(+b.dataset.k)));
    $("#copy").addEventListener("click", () => { navigator.clipboard?.writeText(textOf()).then(() => toast("Texto copiado"), () => toast("No se pudo copiar")); });
    $("#save").addEventListener("click", () => {
      Store.addRecord({ studentId: $("#stu").value || null, task: $("#task").value.trim(), text: textOf(), avgConf: avg, cells: rc.length, low, fixed: rc.filter((c) => c.fixed).length }); toast("Guardado en el registro ✓");
    });
  }
  function editCell(k) {
    const c = tr.cells[k]; let pat = c.pattern;
    const paint = () => { sheet.querySelectorAll(".dotgrid button").forEach((b) => b.classList.toggle("on", !!(pat & (1 << (+b.dataset.d - 1))))); $("#pv").textContent = Braille.label(pat); $("#warn").hidden = Braille.known(pat); };
    openSheet(`<h3>Corregir celda ${k + 1}</h3><p class="mut">Toca los puntos que están en relieve.</p>
      <div class="dotgrid">${[1, 2, 3, 4, 5, 6].map((d) => `<button data-d="${d}" aria-label="Punto ${d}">${d}</button>`).join("")}</div>
      <p class="big" id="pv"></p><p class="mut" id="warn" style="text-align:center" hidden>Combinación no reconocida en la tabla (se mostrará “?”).</p>
      <div class="row" style="margin-top:12px"><button class="btn grow" id="ok">Aplicar</button><button class="btn alt" id="x">Cancelar</button></div>`);
    sheet.querySelectorAll(".dotgrid button").forEach((b) => b.addEventListener("click", () => { pat ^= 1 << (+b.dataset.d - 1); paint(); }));
    $("#x").addEventListener("click", closeSheet);
    $("#ok").addEventListener("click", () => {
      if (pat !== c.pattern) {
        c.pattern = pat; c.fixed = true; c.empty = false; c.conf = 1;
        if (db.settings.saveCorrections) Store.addCorrection({ px: Array.from(c.px, (v) => Math.round(v * 255)), pattern: pat });
      }
      closeSheet(); renderOut();
    });
    paint();
  }

  /* ---------- AULA (modulo ERP) ---------- */
  function classroom() {
    view.innerHTML = `<h2>Aula</h2><div class="row"><button class="btn vio grow" id="add">＋ Nuevo estudiante</button></div>
      ${db.students.map((s) => { const rs = db.records.filter((r) => r.studentId === s.id); const a = rs.length ? Math.round((rs.reduce((t, r) => t + r.avgConf, 0) / rs.length) * 100) : null;
        return `<button class="item" data-id="${s.id}" style="width:100%;text-align:left;color:inherit;font:inherit"><div class="avatar">${esc(initials(s.alias))}</div><div class="grow"><div class="t">${esc(s.alias)}</div><div class="mut">${esc(s.grade)} ${esc(s.section || "")} · <span class="tag">${esc(s.level)}</span></div></div><div class="mut" style="text-align:right">${rs.length} reg.<br>${a === null ? "" : a + "%"}</div></button>`; }).join("") || `<div class="empty"><big>☺</big>Agrega a tus estudiantes con un alias o iniciales.<br>No guardes nombres completos ni datos sensibles.</div>`}`;
    $("#add").addEventListener("click", () => studentForm());
    view.querySelectorAll(".item[data-id]").forEach((b) => b.addEventListener("click", () => studentDetail(b.dataset.id)));
  }
  function studentForm() {
    openSheet(`<h3>Nuevo estudiante</h3><label class="mut" for="f-a">Alias o iniciales</label><input id="f-a" maxlength="20" placeholder="Ej.: Sol, M.R.">
      <div class="row" style="margin:10px 0"><div class="grow"><label class="mut" for="f-g">Grado</label><select id="f-g">${GRADES.map((g) => `<option>${g}</option>`).join("")}</select></div><div class="grow"><label class="mut" for="f-s">Sección</label><input id="f-s" maxlength="2" placeholder="A"></div></div>
      <label class="mut" for="f-l">Nivel de lectura Braille</label><select id="f-l">${LEVELS.map((l) => `<option>${l}</option>`).join("")}</select>
      <div class="row" style="margin-top:14px"><button class="btn grow" id="ok">Guardar</button><button class="btn alt" id="x">Cancelar</button></div>`);
    $("#x").addEventListener("click", closeSheet);
    $("#ok").addEventListener("click", () => { const a = $("#f-a").value.trim(); if (!a) return toast("Escribe un alias");
      Store.addStudent({ alias: a, grade: $("#f-g").value, section: $("#f-s").value.trim().toUpperCase(), level: $("#f-l").value }); closeSheet(); classroom(); toast("Estudiante agregado"); });
  }
  function studentDetail(id) {
    const s = db.students.find((x) => x.id === id), rs = db.records.filter((r) => r.studentId === id);
    openSheet(`<div class="row"><div class="avatar">${esc(initials(s.alias))}</div><div class="grow"><h3>${esc(s.alias)}</h3><span class="mut">${esc(s.grade)} ${esc(s.section || "")} · ${esc(s.level)}</span></div></div>
      <h3 style="margin-top:14px">Traducciones (${rs.length})</h3>${rs.map(recordItem).join("") || `<p class="mut">Sin registros todavía.</p>`}
      <div class="row" style="margin-top:12px"><button class="btn danger grow" id="del">Eliminar estudiante</button><button class="btn alt" id="x">Cerrar</button></div>`);
    $("#x").addEventListener("click", closeSheet);
    $("#del").addEventListener("click", () => { if (confirm("¿Eliminar a este estudiante? Sus registros quedarán sin estudiante.")) { Store.delStudent(id); closeSheet(); classroom(); } });
  }

  /* ---------- REGISTRO ---------- */
  function log() {
    const opts = `<option value="">Todos</option>` + db.students.map((s) => `<option value="${s.id}">${esc(s.alias)}</option>`).join("");
    view.innerHTML = `<h2>Registro</h2><div class="row"><select id="flt" class="grow" aria-label="Filtrar por estudiante">${opts}</select><button class="btn alt sm" id="csv">⬇ CSV</button></div><div id="list"></div>`;
    const render = () => { const f = $("#flt").value, rs = db.records.filter((r) => !f || r.studentId === f);
      $("#list").innerHTML = rs.map((r) => `<div>${recordItem(r)}<div class="row" style="justify-content:flex-end;margin:-4px 4px 4px"><button class="btn sm danger" data-del="${r.id}">Borrar</button></div></div>`).join("") || `<div class="empty"><big>☰</big>Aquí aparecerán las traducciones guardadas.</div>`;
      $("#list").querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { Store.delRecord(b.dataset.del); render(); })); };
    $("#flt").addEventListener("change", render); render();
    $("#csv").addEventListener("click", () => {
      const rows = [["fecha", "estudiante", "grado", "actividad", "texto", "celdas", "baja_confianza", "corregidas", "confianza_media"]];
      db.records.forEach((r) => { const s = db.students.find((x) => x.id === r.studentId); rows.push([r.date, s?.alias || "", s ? s.grade + (s.section || "") : "", r.task || "", (r.text || "").replace(/\n/g, " / "), r.cells, r.low, r.fixed, (r.avgConf || 0).toFixed(3)]); });
      download("registro_braillo.csv", "﻿" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
    });
  }
  function download(name, data, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

  /* ---------- AJUSTES ---------- */
  function settings() {
    view.innerHTML = `<h2>Ajustes</h2>
      <div class="card"><div class="switch"><div><b>Guardar mis correcciones</b><p class="mut">Guarda solo la celda de 28×28 píxeles y su patrón, en este dispositivo, para mejorar el modelo después. Desactivado por defecto.</p></div><input type="checkbox" id="sc" ${db.settings.saveCorrections ? "checked" : ""} aria-label="Guardar correcciones"></div>
      <p class="mut">Correcciones guardadas: <b>${db.corrections.length}</b></p><button class="btn alt sm" id="expc" ${db.corrections.length ? "" : "disabled"}>Descargar correcciones (JSON)</button></div>
      <div class="card"><label for="th"><b>Umbral de baja confianza: <span id="thv">${Math.round(db.settings.threshold * 100)}%</span></b></label><input type="range" id="th" min="40" max="95" value="${Math.round(db.settings.threshold * 100)}"><p class="mut">Las celdas por debajo se marcan con ⚠.</p></div>
      <div class="card"><h3>Datos</h3><div class="row"><button class="btn alt sm" id="seed">Cargar datos de ejemplo</button><button class="btn alt sm" id="bk">Respaldo (JSON)</button><button class="btn danger sm" id="wipe">Borrar todo</button></div></div>
      <div class="card"><h3>Acerca de</h3><p class="mut"><b>Privacidad.</b> Todo ocurre en tu dispositivo: las fotos no se envían ni se guardan. Solo se guardan alias, no nombres completos (Ley 29733).</p>
      <p class="mut"><b>Modelo.</b> CNN de 6 puntos (≈42 mil parámetros) entrenada con AngelinaDataset (Ovodov, 2021). Versión provisional: la evaluación final está en el informe.</p>
      <p class="mut"><b>Límites.</b> Traduce una línea a la vez, con el número de celdas indicado por ti. La tabla del Braille español debe ser validada por un especialista antes de usarse con estudiantes. Letras raras (ñ, v, y) tienen pocos ejemplos de entrenamiento.</p></div>`;
    $("#sc").addEventListener("change", (e) => { db.settings.saveCorrections = e.target.checked; Store.save(); });
    $("#th").addEventListener("input", (e) => { db.settings.threshold = e.target.value / 100; $("#thv").textContent = e.target.value + "%"; Store.save(); });
    $("#expc").addEventListener("click", () => download("correcciones.json", JSON.stringify(db.corrections), "application/json"));
    $("#bk").addEventListener("click", () => download("respaldo_braillo.json", JSON.stringify({ students: db.students, records: db.records }), "application/json"));
    $("#seed").addEventListener("click", () => {
      const names = [["Sol", "3.º", "A", "Palabras"], ["Mateo", "4.º", "B", "Frases"], ["Luz", "2.º", "A", "Letras"]].map(([alias, grade, section, level]) => Store.addStudent({ alias, grade, section, level }));
      [["hola lima", 0, .93], ["casa", 1, .88], ["mama y papa", 1, .81], ["sol", 2, .9]].forEach(([text, i, avgConf], n) => { Store.addRecord({ studentId: names[i].id, task: "Dictado " + (n + 1), text, avgConf, cells: text.length, low: n % 2, fixed: 0 }); });
      toast("Datos de ejemplo cargados"); settings();
    });
    $("#wipe").addEventListener("click", () => { if (confirm("¿Borrar estudiantes, registros y correcciones de este dispositivo?")) { Store.reset(); location.reload(); } });
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  go("home");
  window.__braillo = { go, ensureModel };
})();
