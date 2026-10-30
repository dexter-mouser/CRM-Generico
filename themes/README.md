# themes/ — Personalización por cliente (etapa 3)

Cada tienda comparte el código pero puede tener su propia identidad.

## Qué agregar
- `base.json`: tokens del tema estándar en grises (colores, radios, tipografía) para modo claro y oscuro.
- `<cliente>.json`: sobrescribe solo lo que cambia (color de acento, logo, nombre).
- `schema.json`: formato permitido de los tokens, para validarlos antes de guardarlos.
- Cargador que convierte los tokens en variables CSS (`--fondo`, `--acento`, ...).
