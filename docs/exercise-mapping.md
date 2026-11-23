# Equivalencia ejercicio → imagen del dataset

Imágenes de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (licencia Unlicense, dominio público).
Generado por `tools/fetch_images.py` a partir de `tools/image_sources.json`.

- **✅ Exact**: mismo ejercicio. La app muestra también las instrucciones del dataset.
- **≈ Approximate**: mismo movimiento con otra postura o implemento. Solo imagen, sin instrucciones.
- **❌ Placeholder**: no hay equivalente; la app muestra un ícono. Puedes agregar un `video_url`.

| Ejercicio (app) | id | Dataset | Coincidencia | Diferencia |
|---|---|---|---|---|
| Dumbbell floor press | `db_floor_press` | Dumbbell Floor Press | ✅ Exact |  |
| Dumbbell floor fly | `db_floor_fly` | Dumbbell Flyes | ≈ Approximate | On a bench instead of the floor |
| Dumbbell squeeze press | `db_squeeze_press` | Close-Grip Dumbbell Press | ≈ Approximate | One dumbbell held with both hands, on a bench |
| Dumbbell pullover | `db_pullover` | Straight-Arm Dumbbell Pullover | ≈ Approximate | Lying across a bench instead of on the mat |
| Incline push-up | `incline_push_up` | Incline Push-Up | ✅ Exact |  |
| Bent-over dumbbell row | `db_bent_over_row` | Bent Over Two-Dumbbell Row | ✅ Exact |  |
| One-arm dumbbell row | `db_one_arm_row` | One-Arm Dumbbell Row | ✅ Exact |  |
| Band pull-apart | `band_pull_apart` | Band Pull Apart | ✅ Exact |  |
| Superman | `superman` | Superman | ✅ Exact |  |
| Bird dog | `bird_dog` | — | ❌ Placeholder |  |
| Seated dumbbell shoulder press | `db_seated_shoulder_press` | Seated Dumbbell Press | ✅ Exact |  |
| Dumbbell lateral raise | `db_lateral_raise` | Side Lateral Raise | ✅ Exact |  |
| Dumbbell front raise | `db_front_raise` | Front Two-Dumbbell Raise | ✅ Exact |  |
| Bent-over dumbbell reverse fly | `db_reverse_fly` | Seated Bent-Over Rear Delt Raise | ≈ Approximate | Seated bent over instead of standing |
| Band external rotation | `band_external_rotation` | External Rotation with Band | ≈ Approximate | Band anchored to a post, one arm at a time |
| Dumbbell biceps curl | `db_biceps_curl` | Dumbbell Bicep Curl | ✅ Exact |  |
| Hammer curl | `db_hammer_curl` | Hammer Curls | ✅ Exact |  |
| Dumbbell overhead triceps extension | `db_overhead_triceps_ext` | Standing Dumbbell Triceps Extension | ✅ Exact |  |
| Dumbbell triceps kickback | `db_triceps_kickback` | Tricep Dumbbell Kickback | ✅ Exact |  |
| Chair dips | `chair_dip` | Bench Dips | ≈ Approximate | On a bench with straight legs |
| Goblet squat | `db_goblet_squat` | Goblet Squat | ≈ Approximate | Kettlebell instead of a dumbbell |
| Glute bridge with miniband | `band_glute_bridge` | Butt Lift (Bridge) | ≈ Approximate | Without the band |
| Reverse lunge | `reverse_lunge` | Dumbbell Rear Lunge | ✅ Exact |  |
| Dumbbell Romanian deadlift | `db_romanian_deadlift` | Stiff-Legged Dumbbell Deadlift | ✅ Exact |  |
| Band lateral walk | `band_lateral_walk` | Monster Walk | ≈ Approximate | Walks forward/back instead of sideways |
| Band clamshell | `band_clamshell` | — | ❌ Placeholder |  |
| Crunch | `crunch` | Crunches | ✅ Exact |  |
| Dead bug | `dead_bug` | Dead Bug | ✅ Exact |  |
| Forearm plank | `forearm_plank` | Plank | ✅ Exact |  |
| Bicycle crunch | `bicycle_crunch` | Air Bike | ✅ Exact |  |
| Bent-knee leg raise | `bent_knee_leg_raise` | Reverse Crunch | ≈ Approximate | Also rolls the hips up at the top |
