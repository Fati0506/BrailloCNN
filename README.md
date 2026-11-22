
# BrailloCNN: Sistema Inteligente de Traducción Óptica de Braille para Inclusión Educativa

## 1. ¿Cuál es el problema?
En las escuelas públicas de educación básica regular en Lima Metropolitana, los docentes de aula suelen carecer de formación especializada en lectoescritura Braille, lo que genera demoras en la revisión de tareas y limita la retroalimentación oportuna hacia estudiantes con discapacidad visual en el marco de la Ley N.º 32289.

## 2. ¿Cuál es el objetivo?
Desarrollar y validar un modelo compacto de visión artificial basado en redes neuronales convolucionales (CNN) capaz de reconocer celdas Braille en fotografías reales y traducirlas al alfabeto español dentro de una Aplicación Web Progresiva (PWA) móvil 100 % *offline*, garantizando privacidad de datos y alta interpretabilidad.

## 3. ¿Qué dataset se utilizó?
Se empleó **AngelinaDataset** (Ovodov, 2021), compuesto por **85 263 celdas Braille** extraídas de **290 fotografías reales** de documentos impresos, manuscritos y capturas subidas por usuarios externos. Se utilizó la partición oficial agrupada por página completa: 191 páginas para entrenamiento (57 551 celdas), 49 para validación (14 699 celdas) y 50 páginas externas para prueba (13 013 celdas), verificando cero solapamiento y cero duplicados entre particiones.

## 4. ¿Cómo obtener los datos?
El cuaderno `notebooks/Braille_CNN_Colab.ipynb` descarga y descomprime automáticamente *AngelinaDataset* desde su repositorio oficial en GitHub al ejecutarse, generando los recortes normalizados de $28 \times 28$ píxeles y los archivos de auditoría en `data/processed/`.

## 5. ¿Cómo instalar el proyecto?
1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/Shanks0465/BrailleCNN.git](https://github.com/Shanks0465/BrailleCNN.git)
   cd BrailleCNN
   
