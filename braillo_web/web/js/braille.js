/* Tabla del Braille espanol (igual que el notebook). Punto 1 = bit menos significativo.
   VALIDAR con un especialista (SAE/CENAREBE) antes de usar con estudiantes. */
(function (root) {
  const P = (d) => d.reduce((s, k) => s + (1 << (k - 1)), 0);
  const L = { a:[1],b:[1,2],c:[1,4],d:[1,4,5],e:[1,5],f:[1,2,4],g:[1,2,4,5],h:[1,2,5],i:[2,4],j:[2,4,5],k:[1,3],l:[1,2,3],m:[1,3,4],n:[1,3,4,5],"ñ":[1,2,4,5,6],o:[1,3,5],p:[1,2,3,4],q:[1,2,3,4,5],r:[1,2,3,5],s:[2,3,4],t:[2,3,4,5],u:[1,3,6],v:[1,2,3,6],w:[2,4,5,6],x:[1,3,4,6],y:[1,3,4,5,6],z:[1,3,5,6] };
  const A = { "á":[1,2,3,5,6],"é":[2,3,4,6],"í":[3,4],"ó":[3,4,6],"ú":[2,3,4,5,6],"ü":[1,2,5,6] };
  const CAP = P([4, 6]), NUM = P([3, 4, 5, 6]), letter = {}, acc = {}, digit = {};
  for (const k in L) letter[P(L[k])] = k;
  for (const k in A) acc[P(A[k])] = k;
  "abcdefghij".split("").forEach((c, i) => (digit[P(L[c])] = "1234567890"[i]));
  function decode(pats) {
    let out = "", cap = false, num = false;
    for (const p of pats) {
      if (p === 0) { out += " "; cap = num = false; }
      else if (p === CAP) cap = true;
      else if (p === NUM) num = true;
      else if (num && digit[p]) out += digit[p];
      else if (letter[p] || acc[p]) { const c = letter[p] || acc[p]; out += cap ? c.toUpperCase() : c; cap = false; }
      else { out += "�"; cap = false; }   // nunca se inventa una letra
    }
    return out;
  }
  function label(p) { // texto corto para la ficha de una celda
    if (p === 0) return "␣"; if (p === CAP) return "⇧"; if (p === NUM) return "#";
    return letter[p] || acc[p] || "?";
  }
  root.Braille = { decode, label, CAP, NUM, known: (p) => p === 0 || p === CAP || p === NUM || !!(letter[p] || acc[p]) };
})(self);
