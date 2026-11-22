# Braillo — web móvil (PWA) para traducir Braille y gestionar el aula

Sin instalación ni compilación: HTML + CSS + JavaScript puro. El modelo CNN corre **en el navegador, sin internet**.

## Probar (30 segundos)
```bash
cd web
python3 -m http.server 8000     # o:  npx serve .
```
Abre `http://localhost:8000` en el computador, o `http://IP-DE-TU-PC:8000` en el celular (misma Wi‑Fi).
La cámara requiere **HTTPS o localhost**; para instalarla como app en el celular, publícala (Firebase Hosting, GitHub Pages o Netlify: arrastra la carpeta `web/`).

## Pantallas
| Pantalla | Qué hace |
|---|---|
| Inicio | Resumen del aula, actividad semanal, últimas traducciones, botón «Probar demo» |
| Traducir | Foto/galería → cuadrícula de celdas → texto en español; toca una celda para corregir sus 6 puntos |
| Aula (ERP escolar) | Estudiantes con alias, grado, sección y nivel de lectura Braille |
| Registro | Historial por estudiante, exportar CSV |
| Ajustes | Umbral de confianza, guardar correcciones (opcional), respaldo, borrar todo, límites |

## Archivos
- `js/engine.js` — CNN en JS puro (BatchNorm fusionado). Coincide con Keras (diferencia máx. 2·10⁻⁴).
- `js/braille.js` — tabla del Braille español (validar con un especialista).
- `model/braille_cnn.json` — pesos exportados desde el notebook de Colab.
- `sw.js` + `manifest.webmanifest` — funciona sin conexión e instalable.

## Reemplazar el modelo con el entrenado en Colab
Ejecuta el notebook completo, toma `models/cnndots_s1.keras` y corre `export_web.py` (en `tools/`) para regenerar `model/braille_cnn.json`. Sube la versión `V` en `sw.js` para refrescar la caché.

## Limitaciones honestas
- Modelo **provisional** (5 épocas, 20 000 celdas): exactitud 71,7 % en las 50 páginas de prueba (todas las celdas), 98,3 % en validación. La brecha indica cambio de dominio (las fotos de prueba tienen menos contraste).
- Una línea a la vez; el número de celdas lo indica el docente. Ajusta «Encuadre de celda» hasta que las miniaturas muestren los puntos centrados.
- Las celdas vacías se detectan por contraste relativo a la línea; calibrar con fotos reales.
- Sin datos personales: solo alias. Nada sale del dispositivo.
