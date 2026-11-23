#!/usr/bin/env python3
"""
fetch_images.py — descarga las imágenes de los ejercicios desde free-exercise-db.

Qué hace:
  1. Lee tools/image_sources.json (qué ejercicio del dataset corresponde a cada uno de los tuyos).
  2. Descarga SOLO esas imágenes (2 por ejercicio: posición inicial y final) a
     img/exercises/<exercise_id>/0.jpg y 1.jpg.
  3. Actualiza el campo "image" en data/routines.json (sin cambiar el resto del archivo).
  4. Escribe data/exercise-details.json con las instrucciones (solo para equivalencias exactas).
  5. Escribe docs/exercise-mapping.md con la tabla de equivalencias.

Uso (desde la carpeta del proyecto):
    python3 tools/fetch_images.py

Si cambias una equivalencia en image_sources.json, vuelve a correrlo.
Usa solo la biblioteca estándar de Python (no hay que instalar nada).
"""

import json
import re
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # carpeta del proyecto
DATASET_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
DATASET_PAGE = "https://github.com/yuhonas/free-exercise-db"

SOURCES_FILE = ROOT / "tools" / "image_sources.json"
ROUTINES_FILE = ROOT / "data" / "routines.json"
DETAILS_FILE = ROOT / "data" / "exercise-details.json"
MAPPING_FILE = ROOT / "docs" / "exercise-mapping.md"
IMAGES_DIR = ROOT / "img" / "exercises"


def download(url: str) -> bytes:
    """Descarga una URL y devuelve los bytes."""
    request = urllib.request.Request(url, headers={"User-Agent": "workoutbody-fetch-images"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def main() -> None:
    sources = {k: v for k, v in json.loads(SOURCES_FILE.read_text()).items() if not k.startswith("_")}
    routines = json.loads(ROUTINES_FILE.read_text())
    exercises = routines["exercises"]

    # Cada ejercicio de la app debe tener una fila en image_sources.json
    missing = sorted(set(exercises) - set(sources))
    if missing:
        raise SystemExit(f"Faltan en image_sources.json: {', '.join(missing)}")

    print("Descargando índice del dataset…")
    dataset = {e["id"]: e for e in json.loads(download(DATASET_URL))}

    details = {}
    rows = []
    image_paths = {}

    for exercise_id, info in sources.items():
        if exercise_id not in exercises:
            print(f"  (se ignora {exercise_id}: no está en routines.json)")
            continue
        source_id = info.get("source")
        target = IMAGES_DIR / exercise_id

        if not source_id:
            # Sin equivalente: borramos imágenes viejas si había
            shutil.rmtree(target, ignore_errors=True)
            image_paths[exercise_id] = None
            rows.append((exercise_id, None, "none", ""))
            print(f"  ✗ {exercise_id}: sin imagen (placeholder)")
            continue

        entry = dataset.get(source_id)
        if not entry:
            raise SystemExit(f"'{source_id}' no existe en el dataset (revisa image_sources.json)")
        if len(entry["images"]) < 2:
            raise SystemExit(f"'{source_id}' no tiene 2 imágenes en el dataset")

        target.mkdir(parents=True, exist_ok=True)
        for index, image in enumerate(entry["images"][:2]):
            data = download(IMAGE_BASE + image)
            if not data.startswith(b"\xff\xd8"):  # todo JPG empieza con estos bytes
                raise SystemExit(f"{image} no parece una imagen JPG")
            (target / f"{index}.jpg").write_bytes(data)

        image_paths[exercise_id] = f"img/exercises/{exercise_id}"
        details[exercise_id] = {
            "source_id": source_id,
            "source_name": entry["name"],
            "match": info["match"],
            # Instrucciones solo si es exacto (si es aproximado describirían otra postura)
            "instructions": entry["instructions"] if info["match"] == "exact" else [],
        }
        rows.append((exercise_id, entry["name"], info["match"], info.get("why", "")))
        mark = "✓" if info["match"] == "exact" else "≈"
        print(f"  {mark} {exercise_id} ← {entry['name']}")

    # --- Actualizar "image" en routines.json SIN reformatear el archivo ---
    text = ROUTINES_FILE.read_text()
    for exercise_id, path in image_paths.items():
        value = json.dumps(path)  # "img/exercises/x" o null
        pattern = re.compile(r'("' + re.escape(exercise_id) + r'":\s*\{[^}]*?"image":\s*)(null|"[^"]*")')
        text, count = pattern.subn(lambda m: m.group(1) + value, text)
        if count != 1:
            raise SystemExit(f"No encontré el campo image de {exercise_id} en routines.json")
    ROUTINES_FILE.write_text(text)
    json.loads(text)  # comprobación: sigue siendo JSON válido

    DETAILS_FILE.write_text(json.dumps(details, indent=2, ensure_ascii=False) + "\n")

    # --- Tabla de equivalencias ---
    names = {k: v["name"] for k, v in exercises.items()}
    labels = {"exact": "✅ Exact", "approx": "≈ Approximate", "none": "❌ Placeholder"}
    lines = [
        "# Equivalencia ejercicio → imagen del dataset",
        "",
        f"Imágenes de [free-exercise-db]({DATASET_PAGE}) (licencia Unlicense, dominio público).",
        "Generado por `tools/fetch_images.py` a partir de `tools/image_sources.json`.",
        "",
        "- **✅ Exact**: mismo ejercicio. La app muestra también las instrucciones del dataset.",
        "- **≈ Approximate**: mismo movimiento con otra postura o implemento. Solo imagen, sin instrucciones.",
        "- **❌ Placeholder**: no hay equivalente; la app muestra un ícono. Puedes agregar un `video_url`.",
        "",
        "| Ejercicio (app) | id | Dataset | Coincidencia | Diferencia |",
        "|---|---|---|---|---|",
    ]
    for exercise_id, source_name, match, why in rows:
        lines.append(f"| {names[exercise_id]} | `{exercise_id}` | {source_name or '—'} | {labels[match]} | {why} |")
    MAPPING_FILE.parent.mkdir(exist_ok=True)
    MAPPING_FILE.write_text("\n".join(lines) + "\n")

    exact = sum(1 for r in rows if r[2] == "exact")
    approx = sum(1 for r in rows if r[2] == "approx")
    none = sum(1 for r in rows if r[2] == "none")
    print(f"\nListo: {exact} exactos, {approx} aproximados, {none} sin imagen.")


if __name__ == "__main__":
    main()
