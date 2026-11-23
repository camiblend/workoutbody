# WorkOutBody

App personal (PWA) para registrar rutinas de ejercicio en casa, pensada para iPhone.
HTML + CSS + JavaScript puro, sin frameworks ni paso de build: lo que ves en el repo
es exactamente lo que corre en el teléfono.

> Este README crece etapa por etapa. Por ahora cubre: correr en local, publicar en
> GitHub Pages e instalar en el iPhone. Más adelante: Google Sheet + Apps Script y
> cómo editar una rutina.

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

## Estructura de archivos

```
index.html              página única; las pantallas se dibujan con JS dentro de <main>
manifest.webmanifest    nombre, ícono y colores al "Agregar a inicio"
sw.js                   service worker: guarda la app para uso offline
css/styles.css          estilos (colores definidos arriba del archivo)
js/app.js               arranque + navegación entre pantallas
js/ui.js                helper h() para crear elementos HTML
js/screens/*.js         una pantalla por archivo
img/icons/              ícono de la app (icon.svg es el original)
```

### Cómo funciona la navegación
La parte de la URL después de `#` indica la pantalla: `#/home`, `#/body`,
`#/settings`. `js/app.js` lee eso y llama a `render()` del archivo de la pantalla
correspondiente. Para agregar una pantalla nueva: crea `js/screens/nueva.js`
(copia `body.js` como plantilla), impórtala en `app.js`, agrégala a `routes`,
y agrega su ruta a la lista `APP_SHELL` de `sw.js`.
