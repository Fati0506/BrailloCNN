/* Almacenamiento local (localStorage). Sin fotos ni datos personales: solo alias del estudiante. */
(function (root) {
  const K = "braillo.v1";
  const blank = () => ({ students: [], records: [], settings: { saveCorrections: false, threshold: 0.7 }, corrections: [] });
  let db;
  try { db = Object.assign(blank(), JSON.parse(localStorage.getItem(K) || "{}")); } catch { db = blank(); }
  const save = () => { try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) { console.warn("No se pudo guardar", e); } };
  const id = () => Math.random().toString(36).slice(2, 9);
  root.Store = {
    get db() { return db; }, save, id,
    reset() { db = blank(); save(); },
    addStudent(s) { const x = { id: id(), ...s }; db.students.push(x); save(); return x; },
    delStudent(i) { db.students = db.students.filter((s) => s.id !== i); db.records.forEach((r) => { if (r.studentId === i) r.studentId = null; }); save(); },
    addRecord(r) { const x = { id: id(), date: new Date().toISOString(), ...r }; db.records.unshift(x); save(); return x; },
    delRecord(i) { db.records = db.records.filter((r) => r.id !== i); save(); },
    addCorrection(c) { db.corrections.push(c); db.corrections = db.corrections.slice(-300); save(); },
  };
})(self);
