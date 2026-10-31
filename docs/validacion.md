# Validación de datos

Todas las reglas viven en un solo archivo, **`src/core/validacion.js`**: JavaScript puro, sin navegador ni almacenamiento. Los servicios del navegador lo usan hoy y se puede ejecutar tal cual en Node (por ejemplo, en una función de validación compartida o en pruebas). El backend Java debe replicar estas reglas con Bean Validation; la tabla es la referencia.

| Campo | Regla |
|---|---|
| Texto corto (nombre, proveedor, concepto…) | Sin caracteres de control, espacios recortados, máximo 120 caracteres |
| Texto largo (dirección, mensaje del recibo, descripción) | Máximo 300 caracteres |
| Motivo (devolución, anulación, reapertura) | Obligatorio, de 5 a 200 caracteres |
| Observaciones del documento | Opcional, hasta 300 caracteres |
| Monto recibido (efectivo) | Entero; si se escribe debe cubrir el total; la devuelta es la diferencia. Vacío = valor exacto |
| Tipo de documento | `factura`, `remision` o `cotizacion`; solo la factura admite método de pago y monto recibido |
| Valores en pesos y cantidades | Enteros; máximo 1 000 000 000; el costo, el valor y la cantidad son mayores que 0 donde se pide un valor |
| Stock | Entero (admite negativos) |
| Correo | `^[^\s@]+@[^\s@]+\.[^\s@]+$`, máximo 120 caracteres |
| Teléfono | `^[\d\s()+-]{7,20}$` |
| ID de producto | Solo números: `^\d{1,12}$`, sin ceros a la izquierda (si se deja vacío, se genera el siguiente: el mayor más uno) |
| Fecha | `AAAA-MM-DD` válida |
| Archivos (CSV y copia) | Máximo 10 MB; CSV de hasta 5000 filas |

## Importación de inventario (CSV)

Se valida **toda** la tabla antes de cambiar nada. Si una fila falla, no se importa ninguna y el mensaje indica la fila (`Fila 3: …`). No se aceptan IDs repetidos dentro del archivo ni valores no enteros en costo o stock.

## Copia de seguridad (JSON)

Formato `generico-copia-1` con `version`, `fecha`, `huella` (SHA-256 de `datos`) y `datos`. Antes de restaurar se comprueba: formato, versión, huella, que cada sección exista (las copias anteriores a las remisiones y cotizaciones se toman con `documentos` vacío) y que cada registro cumpla `ESQUEMA_DATOS`, que haya ajustes, métodos de pago, rol Propietario y al menos un propietario activo. Solo se copian las claves conocidas.
