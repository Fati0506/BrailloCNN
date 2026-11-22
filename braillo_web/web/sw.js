const V="braillo-v1",FILES=["./","index.html","css/styles.css","js/engine.js","js/braille.js","js/store.js","js/app.js","model/braille_cnn.json","assets/icon.svg","assets/demo_hola_lima.png","manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
