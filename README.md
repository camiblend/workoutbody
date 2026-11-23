# WorkOutBody

App personal (PWA) para registrar rutinas de ejercicio en casa, pensada para iPhone.
HTML + CSS + JavaScript puro, sin frameworks ni paso de build: lo que ves en el repo
es exactamente lo que corre en el teléfono.

**App publicada:** <https://camiblend.github.io/workoutbody/>

## Qué hace
- **Home:** semanas de lunes a domingo (hora de Chile) con 3 puntos por semana.
  Cada sesión completada pinta un punto verde con su fecha; la 4ª en adelante
  queda como *Extra*. La semana nueva aparece sola el lunes a las 00:00.
- **Start → elegir grupo muscular → Today's routine → Let's go!**
  Sesión en 3 pasos: *Warm-up* (minutos caminados), *Routine* (checklist + kg
  opcional) y *Cool-down*. Si sales a la mitad, queda como borrador y la retomas.
- **Body:** peso y medidas cuando quieras, con historial y gráfico por medida.
- **Settings:** conexión con Google Sheets, estatura y respaldo JSON.
- **Offline:** todo se guarda primero en el teléfono y se sincroniza al
  Google Sheet cuando hay internet.

## Índice
1. [Correr la app en tu computador](#1-correr-la-app-en-tu-computador)
2. [Publicar en GitHub Pages](#2-publicar-en-github-pages)
3. [Instalar en el iPhone](#3-instalar-en-el-iphone)
4. [Configurar Google Sheet + Apps Script](#4-configurar-google-sheet--apps-script)
5. [Respaldo JSON](#5-respaldo-json)
6. [Editar una rutina](#6-editar-una-rutina)
7. [Imágenes de ejercicios](#7-imágenes-de-ejercicios)
8. [Tests](#8-tests)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)
10. [Para la etapa 2 (estadísticas)](#10-para-la-etapa-2-estadísticas)

---

## 1. Correr la app en tu computador

Solo necesitas Python (ya lo tienes). Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000> en Chrome. Para verla con tamaño de teléfono:
clic derecho → **Inspeccionar** → ícono de celular (arriba a la izquierda del panel).

Para detener el servidor: `Ctrl + C` en la terminal.

> **Ojo con la caché:** la app guarda una copia de sí misma para funcionar sin
> internet. Si cambias un archivo y no ves el cambio, recarga **dos veces**. Si sigue
> igual, en Chrome: Inspeccionar → pestaña **Application** → **Service workers** →
> marca **Update on reload**.

---

## 2. Publicar en GitHub Pages

Se hace una sola vez. Después, cada `git push` publica la versión nueva en ~1 minuto.

> Ya está hecho para este repo ([camiblend/workoutbody](https://github.com/camiblend/workoutbody)).
> Estos pasos sirven si algún día lo armas de nuevo.

1. Crea un repositorio **público** en GitHub llamado `workoutbody` (sin README).
2. En la carpeta del proyecto:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/workoutbody.git
   git push -u origin main
   ```
3. En GitHub: repo → **Settings** → **Pages** → en *Branch* elige `main` y carpeta
   `/ (root)` → **Save**.
4. Espera 1–2 minutos. Tu app queda en `https://TU_USUARIO.github.io/workoutbody/`.

### Publicar cambios después
```bash
git add .
git commit -m "Describe el cambio"
git push
```
En el iPhone, abre la app **dos veces** para ver la versión nueva (la primera vez
descarga los cambios en segundo plano, la segunda los muestra).

Si la app queda "pegada" en una versión vieja: en `sw.js` sube `CACHE_VERSION`
(ej. `'v1'` → `'v2'`), publica, y abre la app dos veces.

---

## 3. Instalar en el iPhone

1. Abre la URL de GitHub Pages en **Safari** (tiene que ser Safari).
2. Toca el botón **Compartir** (cuadrado con flecha hacia arriba).
3. Baja y toca **Agregar a pantalla de inicio** → **Agregar**.
4. Abre la app desde el ícono. Se ve a pantalla completa, sin barra de Safari.

Para comprobar que funciona sin internet: abre la app una vez con internet, ciérrala,
activa el modo avión y vuelve a abrirla.

---

## 4. Configurar Google Sheet + Apps Script

La app funciona perfecto sin esto (todo queda en el teléfono). El Sheet sirve como
copia de seguridad y para hacer estadísticas después. Se hace una sola vez, en el computador.

### 4.1 Crear el Sheet y pegar el script
1. Ve a <https://sheets.new> (crea un Google Sheet nuevo). Ponle nombre, ej. `WorkOutBody`.
2. Menú **Extensiones → Apps Script**. Se abre el editor en otra pestaña.
3. Borra todo lo que hay en `Código.gs` y pega el contenido completo de
   [`apps-script/Code.gs`](apps-script/Code.gs). Guarda (ícono 💾 o `Cmd + S`).

### 4.2 Crear las pestañas y el token
1. Arriba, en el selector de funciones, elige **`setup`** y toca **▶ Ejecutar**.
2. Google pide permisos: **Revisar permisos** → elige tu cuenta → aparece
   "Google no ha verificado esta aplicación" → **Configuración avanzada** →
   **Ir a … (no seguro)** → **Permitir**. (Es tu propio script; el aviso sale
   porque no está publicado en la tienda de Google.)
3. Abajo, en el **Registro de ejecución**, aparece `Tu token es: …`. Cópialo.
   El token queda guardado en ⚙ **Configuración del proyecto → Propiedades de la
   secuencia de comandos → TOKEN** (ahí lo puedes ver o cambiar después).
4. Vuelve al Sheet: ahora tiene las pestañas `sessions`, `session_exercises`,
   `body_measurements` y `settings` con sus encabezados.

### 4.3 Publicar como aplicación web
1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. En ⚙ *Seleccionar tipo* elige **Aplicación web**.
3. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier usuario**.
   (Nadie puede escribir sin el token; "cualquier usuario" solo permite que la app
   llegue al script sin iniciar sesión en Google.)
4. **Implementar** → copia la **URL de la aplicación web** (termina en `/exec`).

### 4.4 Conectar la app
1. En el iPhone: app → ⚙ **Settings** → pega la **URL** y el **token** →
   **Save & test connection**. Debe decir `Connected ✓`.
   - Truco: si tu Mac y tu iPhone usan el mismo Apple ID, copia en el Mac y pega
     en el iPhone (Portapapeles universal). Si no, mándatelos por Notas o AirDrop.
2. Listo. Desde ahora la app sincroniza sola: al abrirla, al terminar una sesión,
   al guardar medidas y cuando vuelve internet. Settings muestra los cambios
   pendientes y la última sincronización; **Sync now** fuerza una.

### Si cambias `Code.gs` más adelante
Pega el código nuevo, guarda, y luego **Implementar → Gestionar implementaciones →
✏️ Editar → Versión: Nueva versión → Implementar**. Así la URL sigue siendo la misma.

### Problemas comunes
| Mensaje en la app | Qué revisar |
|---|---|
| `Invalid token` | El token de la app no coincide con TOKEN en las propiedades del script. |
| `Unexpected answer…` | La URL no es la de la aplicación web (`…/exec`), o no elegiste "Cualquier usuario". |
| `Could not reach the server` | Sin internet o URL mal copiada. Los cambios quedan pendientes y se envían después. |

### Cómo quedan los datos
- Fechas en formato `2026-11-23`; `completed_at` en hora de Santiago (`2026-11-23 18:45:10`).
- `week_start` es el lunes de esa semana.
- Puedes **agregar columnas** o **reordenarlas** en el Sheet: el script escribe por
  nombre de columna y no borra lo que agregues a mano.
- Si borras una sesión en la app (solo se puede en la semana actual), también se
  borra del Sheet.

---

## 5. Respaldo JSON

Settings → **Export** crea un archivo con todas tus sesiones, medidas y estatura
(sin la URL ni el token). En el iPhone se abre el menú Compartir → **Guardar en Archivos**.

**Import** reemplaza TODOS los datos del teléfono por los del archivo (pide
confirmación) y vuelve a sincronizar todo con el Sheet sin duplicar filas.
Útil si cambias de teléfono o borras la app.

---

## 6. Editar una rutina

Todas las rutinas están en [`data/routines.json`](data/routines.json). Tiene dos partes:

**`exercises`**: el catálogo. Cada ejercicio se define una sola vez:
```json
"db_goblet_squat": { "name": "Goblet squat", "implement": "dumbbell",
                     "image": null, "video_url": null, "note": "One dumbbell" }
```
- La clave (`db_goblet_squat`) es el **id**: es lo que va al Sheet. No lo cambies
  después de usarlo, o las estadísticas lo verán como un ejercicio distinto.
- `implement`: `dumbbell`, `miniband` o `bodyweight`. Solo los `dumbbell` muestran
  el campo de kg en la sesión.
- `video_url`: link opcional (ej. un reel de Instagram), o `null`.
- `note`: texto corto opcional bajo el nombre, o `null`.

**`routines`**: cada rutina lista sus ejercicios por id, con series y reps:
```json
{ "exercise_id": "dead_bug", "sets": 3, "reps": 8, "per_side": true }
{ "exercise_id": "forearm_plank", "sets": 3, "seconds": 20 }
```
- Usa `reps` **o** `seconds`, nunca ambos.
- `per_side` es opcional (por defecto `false`).
- El orden de la lista es el orden en la app.

**Después de editar**, revisa que no haya errores y publica:
```bash
npm test
```
Si escribiste mal un id, el test te dice en qué rutina y en qué posición.

---

## 7. Imágenes de ejercicios

Las fotos vienen de [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(licencia Unlicense). Cada ejercicio tiene 2 fotos (inicio y fin) que la app alterna
cada segundo. Solo se guardan en el repo las que se usan (`img/exercises/<id>/`).

La equivalencia está en [`docs/exercise-mapping.md`](docs/exercise-mapping.md):
19 exactas, 10 aproximadas (mismo movimiento con otra postura o implemento) y
2 sin imagen (Bird dog y Band clamshell, que muestran un ícono).

**Cambiar o agregar una imagen:**
1. Busca el ejercicio en el dataset (el `id` es el nombre de la carpeta en
   `exercises/`, ej. `Dumbbell_Floor_Press`).
2. Edita [`tools/image_sources.json`](tools/image_sources.json):
   `"source"` con ese id y `"match"` con `exact`, `approx` o `none`.
3. Corre:
   ```bash
   python3 tools/fetch_images.py
   ```
   Descarga las fotos, actualiza el campo `image` en `routines.json`, las
   instrucciones (`data/exercise-details.json`) y la tabla de equivalencias.

Si agregas un ejercicio nuevo a `routines.json`, agrégalo también a
`image_sources.json` (aunque sea con `"source": null`).

**Videos:** para cualquier ejercicio puedes poner un link en `video_url`
(ej. un reel de Instagram). Aparece como "▶ Watch video" al tocar el ejercicio
en *Today's routine* y se abre fuera de la app.

---

## 8. Tests

Prueban el cálculo de semanas (zona horaria de Santiago, cambio de horario, cambio
de año), que `routines.json` esté bien escrito, y el Apps Script (`Code.gs`) contra
un Google Sheet simulado. Necesitan Node, pero la app no.
```bash
npm test
```

---

## 9. Preguntas frecuentes

**¿Dónde están mis datos?**
En el teléfono (IndexedDB de la app). Si configuraste el Sheet, también allá.
Las apps agregadas a la pantalla de inicio no sufren el borrado automático de
Safari, pero si **borras la app** del iPhone se borran sus datos: antes de eso,
asegúrate de que Settings diga *Pending changes: 0* o haz un **Export**.

**Publiqué un cambio y no lo veo en el iPhone.**
Abre la app, ciérrala (desliza hacia arriba) y ábrela de nuevo. Si sigue igual,
sube `CACHE_VERSION` en `sw.js`, publica y repite.

**Empecé una sesión y no la terminé.**
Home muestra *Workout in progress*: **Resume** para seguir donde quedaste o
**Discard** para descartarla. Solo puede haber una a la vez.

**Me equivoqué y registré una sesión que no hice.**
En la semana actual, toca la **×** al lado de la sesión. Las semanas pasadas son
de solo lectura (si de verdad necesitas corregir una, bórrala en el Sheet y en un
respaldo JSON, e impórtalo).

**¿Qué fecha usa una sesión que empecé el domingo a las 23:50?**
La del momento en que tocaste **Start** (domingo), aunque la termines el lunes.

**¿Por qué Bird dog y Band clamshell no tienen imagen?**
No existen en el dataset. Puedes ponerles un `video_url` (ver sección 7).

---

## 10. Para la etapa 2 (estadísticas)

Las pestañas del Sheet están pensadas para analizarse directo (tabla dinámica,
Looker Studio, o Python con pandas):

| Pestaña | Una fila por | Clave |
|---|---|---|
| `sessions` | sesión completada | `session_id` |
| `session_exercises` | ejercicio de cada sesión | `session_id` + `exercise_id` |
| `body_measurements` | registro de medidas | `measurement_id` |
| `settings` | ajuste (`height_cm`) | `key` |

- `week_start` (lunes) agrupa por semana; `is_extra` marca la 4ª sesión en adelante.
- `exercise_id` es estable aunque cambies el nombre visible del ejercicio.
- Para unir sesiones con sus ejercicios usa `session_id`.
- **Agregar un dato nuevo** (ej. velocidad e inclinación de la caminata): basta con
  que la app lo guarde en la sesión (en `js/data.js` / `js/screens/session.js`); el
  Apps Script crea la columna sola la primera vez que llega. Las filas antiguas
  quedan con esa celda vacía.
- IMC: peso (`body_measurements.weight_kg`) / (estatura en m)², con la estatura de `settings`.

---

## Créditos
- Imágenes de ejercicios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
  (Unlicense / dominio público).
- Siluetas musculares e ícono: hechos para esta app (SVG).

---

## Estructura de archivos

```
index.html              página única; las pantallas se dibujan con JS dentro de <main>
manifest.webmanifest    nombre, ícono y colores al "Agregar a inicio"
sw.js                   service worker: guarda la app para uso offline
css/styles.css          estilos (colores definidos arriba del archivo)
data/routines.json      las rutinas (para editarlas, ver sección 6)
js/app.js               arranque + navegación entre pantallas
js/ui.js                helper h() para crear elementos HTML
js/routines.js          lee y valida routines.json
js/weeks.js             fechas y semanas (lunes a domingo, America/Santiago)
js/db.js                acceso de bajo nivel a IndexedDB (base de datos del teléfono)
js/data.js              operaciones de la app: sesiones, borrador, medidas, ajustes, respaldo
js/sync.js              envía los cambios pendientes al Apps Script
js/chart.js             gráfico de línea SVG (pestaña Body)
js/silhouette.js        siluetas con el músculo resaltado
js/exercise-image.js    imagen animada de cada ejercicio
apps-script/Code.gs     backend que se pega en el Google Sheet
js/screens/*.js         una pantalla por archivo
img/icons/              ícono de la app (icon.svg es el original)
img/exercises/          fotos de ejercicios (descargadas por tools/fetch_images.py)
data/exercise-details.json  instrucciones del dataset (generado)
tools/fetch_images.py   descarga imágenes del dataset
tools/image_sources.json    equivalencia ejercicio → dataset
docs/exercise-mapping.md    tabla de equivalencias (generada)
tests/                  tests (npm test)
```

### Dónde se guardan los datos
En el teléfono, en IndexedDB (dentro de Safari, no en archivos). Las sesiones,
medidas y ajustes viven ahí; cada cambio queda anotado en una cola (`sync_queue`)
para enviarlo al Google Sheet cuando haya internet. Si agregas un archivo `.js`
nuevo, súmalo también a la lista `APP_SHELL` de `sw.js` para que funcione offline.

### Cómo funciona la navegación
La parte de la URL después de `#` indica la pantalla: `#/home`, `#/body`,
`#/settings`. `js/app.js` lee eso y llama a `render()` del archivo de la pantalla
correspondiente. Para agregar una pantalla nueva: crea `js/screens/nueva.js`
(copia `body.js` como plantilla), impórtala en `app.js`, agrégala a `routes`,
y agrega su ruta a la lista `APP_SHELL` de `sw.js`.
