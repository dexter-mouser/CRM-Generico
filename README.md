# Genérico — CRM para tiendas pequeñas

Panel de gestión para tiendas pequeñas que reemplaza el cuaderno donde se anotan ventas, se lleva el inventario y se cuadra la caja. Pensado como plantilla base: un mismo código que se adapta a cada cliente, con estructura y funciones personalizables por tienda.

## Características
- **Acceso:** `index.html` es la única página pública. Se ingresa con un correo autorizado o con usuario y clave (el ojo de la clave muestra u oculta lo escrito). Todas las demás páginas exigen sesión: sin sesión vigente (o con la sesión vencida, a las 8 horas) redirigen al ingreso y, al entrar, devuelven a la página pedida. "Mantener la sesión en este dispositivo" la conserva al cerrar el navegador. "Cerrar sesión", al final del menú lateral, la termina.
- **Páginas por vista:** cada vista es su propio archivo HTML (`panel.html`, `nueva-venta.html`, `ventas.html`, `inventario.html`, ...) con el mismo menú superior y lateral.
- **Marca:** logo "Genérico", una G decorada con un anillo fino y un punto, en grises. Está en el ingreso, el menú superior y el icono de la pestaña, y cambia con el modo claro u oscuro.
- **Interfaz:** menú superior de ancho completo y menú lateral debajo. El botón de tema es un icono (luna en modo claro, sol en modo oscuro) en el menú superior. El menú lateral se recoge a solo iconos y recuerda la elección en todas las páginas.
- **Diseño:** grises neutros, bordes suaves, modo claro y oscuro, español y moneda COP. Prioridad en computador, con diseño adaptado a celular.
- **Campos numéricos:** se escriben a mano (sin flechas de aumento ni rueda del ratón); solo admiten dígitos, y el stock admite un "-" inicial.
- **Confirmaciones:** cada cambio aplicado (producto, venta, factura, documento, orden de tarjetas, tema) muestra el aviso "... correctamente"; las advertencias se muestran sin la marca de éxito.
- **Animaciones:** esqueletos al cargar cada página y contadores/barras que suben de 0 al valor actual. Respeta la preferencia de reducir animaciones del dispositivo.
- **Panel:** tarjetas de resumen reordenables (ventas del día, efectivo en caja, fiados pendientes y productos en negativo), gráfica de las ventas de los últimos 7 días y últimas ventas. Al arrastrar, la tarjeta se levanta y sigue al puntero, un hueco punteado marca el destino y las demás tarjetas se deslizan a su nueva posición. El orden se guarda en el instante de soltar. Con teclado: flechas sobre el icono de agarre.
- **Registrar venta** (`nueva-venta.html`, independiente del historial): es una cuadrícula con las columnas ID, Referencia, Producto, Costo, Stock, Cantidad, Valor unitario y Subtotal. La búsqueda se hace en la casilla que está debajo de cada columna (ID, referencia, producto, costo o stock); las casillas se combinan y los resultados se abren debajo, alineados con las columnas. Flechas y Enter eligen el producto, que se agrega como línea; el cursor pasa a la cantidad, Enter pasa al valor unitario y otro Enter vuelve a la búsqueda de ID. Una venta puede tener varios productos. Cantidad y valor unitario se escriben a mano; el valor sugerido es el de la última venta de ese producto. Cada producto descuenta su cantidad del stock.
- **Últimas búsquedas:** al hacer clic en una casilla de búsqueda vacía se muestran las últimas búsquedas (con su columna); un clic en una la repite y "Borrar" limpia el historial. El buscador de las facturas de compra también las muestra.
- **Tipos de documento** (en **Registrar venta**): *Factura de venta* (cuenta como venta, descuenta el stock y mueve la caja o la deuda), *Remisión* (REM; descuenta el stock de lo entregado sin cobrar) y *Cotización* (COT; oferta con vigencia de 15 días que no toca stock ni dinero). Desde Ventas, una remisión o cotización pendiente se pasa a factura con "Facturar" (la remisión no vuelve a descontar lo ya entregado) y se puede anular con motivo (la remisión devuelve lo entregado al stock).
- **Pago en efectivo:** al cobrar en efectivo se elige un monto rápido (exacto o el billete que lo cubre) o se escribe con cuánto paga el cliente; el sistema calcula la devuelta y avisa cuánto falta si no alcanza. La factura guarda lo recibido y la devuelta. Las observaciones del documento se imprimen en el comprobante.
- **Comprobante:** "Vista previa" muestra el documento (tirilla de 80 mm u hoja carta) antes de registrarlo; al registrarlo, "Ver comprobante" lo muestra con su número. Incluye tienda con NIT, dirección y teléfono, fecha y hora, cliente (con código, teléfono y dirección si está registrado), forma de pago, referencia y cantidad por producto, unidades, quién atendió, recibido y devuelta, observaciones, notas asociadas y sello «ANULADA».
- **Ventas** (`ventas.html`): tres cuadrículas con búsqueda debajo de cada columna: facturas de venta, remisiones y cotizaciones, y notas de devolución y anulación.
- **Inventario:** cada producto tiene ID (único, automático si se deja vacío), referencia, nombre, costo y stock (puede ser negativo). Se edita en línea; el ID no se edita porque lo usan las ventas y las facturas. Guarda costo, no precio de venta.
- **Facturas de compra:** el botón "Ingresar factura" abre un panel con proveedor, número, fecha y productos (con el mismo buscador). Al registrarla suma las cantidades al stock y deja el costo de la factura como costo del producto. No admite repetir el número de factura de un mismo proveedor.
- **Documentos:** el inventario se descarga y se carga como CSV, un documento de texto que abren e importan directamente las hojas de cálculo del navegador (por ejemplo Google Sheets), sin depender de Excel.
- **Ajustes** (`ajustes.html`): datos de la tienda (nombre, NIT, teléfono, ciudad y dirección), apariencia (tema claro, oscuro o automático, y menú lateral expandido o recogido), ventas (métodos de pago disponibles, con al menos uno siempre activo, y si se permite vender sin existencias), recibo (mensaje final, mostrar u ocultar los datos de la tienda y un recibo de ejemplo) y restablecer los datos de prueba, con confirmación previa. Los datos de la tienda y el mensaje se muestran en cada recibo.
- **Roles y permisos** (`roles.html`): se elige un rol de la lista de la izquierda y se marcan sus permisos en la tabla; debajo, "Así lo ve este rol" muestra el menú que tendría esa persona y lo que puede hacer en cada módulo, y se actualiza al marcar. Cada cambio queda en Auditoría. Lista de roles con una tabla de permisos por módulo (Ver, Crear, Editar, Eliminar; solo aparecen las acciones que cada módulo admite). Activar una acción activa también "Ver" y quitar "Ver" quita todas las del módulo. Se pueden crear, editar y eliminar roles (no se elimina un rol con personas asignadas). El rol Propietario tiene acceso total y no se puede modificar. Cada persona tiene correo, rol y estado activo; siempre debe quedar al menos un propietario activo.
- **Clientes** (`clientes.html`): cuadrícula con búsqueda por columna (ID, nombre, teléfono o correo), alta, edición y eliminación con confirmación. Muestra la deuda de cada uno (ventas a Fiado menos abonos) y su historial de compras. No se elimina un cliente con deuda y, al cambiar un nombre, sus ventas se actualizan. Las ventas a Fiado solo se permiten a clientes registrados.
- **Caja** (`caja.html`): se abre con una base, muestra el efectivo esperado (base + ventas en efectivo + abonos en efectivo + ingresos - egresos - pagos a proveedores en efectivo), permite registrar ingresos y egresos y se cierra contando el efectivo; guarda la diferencia en el historial de cierres.
- **Contabilidad** (`contabilidad.html`): cierra la contabilidad de cada día ya terminado, en orden y con confirmación; guarda un resumen fijo (ventas, costo, utilidad, fiado, abonos, pagos a proveedores, compras y diferencia de caja). No se cierra con una caja abierta y, una vez cerrado un día, no se pueden registrar facturas de compra con esa fecha o anteriores.
- **Notas de devolución y de anulación** (en **Ventas**): devolver productos de una factura genera una *nota de devolución* (ND-0001) y anularla completa genera una *nota de anulación* (NA-0001), ambas con motivo obligatorio y ancladas a la factura original (muestran su número, fecha, total y el saldo que queda). Suman el stock, restan de las ventas del día en que se registran, sacan el dinero de la caja abierta si se pagó en efectivo (o bajan la deuda si fue Fiado) y generan su comprobante. Una factura de un día con la contabilidad cerrada solo admite devoluciones, no anulación.
- **Reabrir contabilidad**: con el permiso especial *Reabrir* se reabre el último día cerrado, con motivo y registro en la auditoría.
- **Comprobantes imprimibles**: ventas, devoluciones, abonos, pagos a proveedores y facturas de compra, con número, fecha y hora, persona que registró, firmas cuando aplica y sello «ANULADA». Se imprimen en tirilla de 80 mm o en hoja carta.
- **Auditoría** (`auditoria.html`, opción "Auditoría" del menú): consulta de quién hizo qué y cuándo (ventas, devoluciones, cierres, cambios de roles y permisos, copias), con búsqueda debajo de cada columna y exportación a CSV. Desde Roles, "Ver cambios en Auditoría" abre el registro ya filtrado por los cambios de roles.
- **Cuadrículas de datos:** todas las listas (facturas, remisiones y cotizaciones, notas, clientes, inventario, facturas de compra, pagos, caja, contabilidad, auditoría y personas) usan la misma cuadrícula de Registrar venta: encabezado y una casilla de búsqueda debajo de cada columna. Las casillas se combinan, ignoran mayúsculas y tildes, muestran cuántos registros coinciden y cargan más filas con "Ver más".
- **Copia de seguridad** (en **Ajustes**): descarga de todos los datos en un archivo, restauración con validación completa y exportación de tablas a CSV. La importación de inventario también se valida completa antes de cambiar nada.
- **Atajos y lector de códigos** (en **Registrar venta**): la tecla aparece dentro del botón de cada acción: `F4` (o `Ctrl+Enter`) registrar, `F8` vista previa y `F9` vaciar; `F2` o `/` buscar (indicado en la fila de búsqueda). Un lector de códigos de barras agrega el producto cuyo ID o referencia coincide.
- **Seguridad**: permisos por rol aplicados en cada pantalla y servicio, bloqueo tras intentos fallidos, cierre por inactividad y política de contenido (CSP). Ver `docs/seguridad.md` y `docs/validacion.md`.
- **Pagos** (`pagos.html`): abonos de clientes con deuda y pagos a proveedores con facturas pendientes; ninguno puede superar lo pendiente. Los métodos son los de Ajustes, sin Fiado. Incluye el historial de pagos.
- **Reportes** (`reportes.html`): total vendido, número de ventas, ticket promedio y utilidad estimada (con el costo actual) en un rango de fechas, con atajos (hoy, 7 días, este mes); ventas por método de pago, productos más vendidos, productos con stock bajo (5 o menos) y clientes con deuda. Descarga las ventas del rango como CSV.

## Acceso de prueba
| Forma | Datos |
|---|---|
| Correo | `demo@generico.com` |
| Usuario y clave | `admin` / `admin123` |

Se definen en `src/config/acceso.js`. La verificación ocurre en el navegador, por lo que sirve para recorrer la interfaz pero **no protege datos reales**: cualquiera puede alterar el almacenamiento del navegador. La protección real la da el servidor (ver Seguridad).

## Estructura
```
crm-tiendas/
├── index.html                  Ingreso (única página pública)
├── panel.html, nueva-venta.html, ventas.html, clientes.html, inventario.html,
│   caja.html, pagos.html, reportes.html, roles.html, ajustes.html
│                               Una página protegida por vista (mismo shell)
├── package.json
├── styles/
│   ├── style.css               Punto de entrada: importa todos los demás
│   ├── tono.css                Colores y tema claro/oscuro (variables)
│   ├── base.css                Reinicio y tipografía
│   ├── layout.css              Encabezado, menú lateral, contenido, marca
│   ├── components.css          Tarjetas, botones, tablas, formularios, selector, arrastre
│   ├── animations.css          Esqueletos de carga, entradas y barras
│   ├── cuadricula.css          Cuadrícula de Registrar venta y últimas búsquedas
│   ├── ajustes.css             Pantalla de Ajustes
│   ├── reportes.css            Reportes, resumen de caja y etiquetas de la gráfica
│   ├── roles.css               Pantalla de Roles y permisos
│   ├── recibo.css              Recibo: vista previa e impresión
│   └── acceso.css              Pantalla de ingreso
├── src/
│   ├── main.js                 Arranque de las páginas protegidas (verifica sesión y monta el menú)
│   ├── main-acceso.js          Arranque de index.html
│   ├── config/                 nav.js (menú), routes.js (módulo de cada vista), acceso.js (usuarios de prueba),
│   │                           permisos.js (módulos y acciones de los permisos),
│   │                           entorno.js (dirección de la API)
│   ├── core/                   previo, sesion, router, store, preferencias, template, tema, animate,
│   │                           numeros, codigos, busquedas, format, iconos, dom
│   ├── components/             header/, sidebar/, logo/, toast/ (aviso), reordenar/ (arrastrar y soltar),
│   │                           buscador-cuadricula/ (fila de búsqueda), cuadricula-datos/ (cuadrícula de las listas),
│   │                           selector-productos/ (buscador simple),
│   │                           recibo/ (vista previa e impresión)
│   ├── modules/                acceso/, panel/, nueva-venta/, ventas/, inventario/ (incluye factura.js),
│   │                           ajustes/, roles/, clientes/, caja/, pagos/, reportes/,
│   │                           placeholder/ (cada uno con su .html y su .js)
│   ├── services/               inventario.service.js, ventas.service.js, ajustes.service.js, roles.service.js,
│   │                           clientes.service.js, pagos.service.js, caja.service.js, reportes.service.js
│   │                           (reglas de negocio),
│   │                           csv.service.js (documentos), api.js (cliente de la API para el backend)
│   └── data/seed.js            Datos de prueba
├── backend/                    API Spring Boot
├── database/                   Migraciones y datos de prueba
├── themes/                     Temas por cliente
├── assets/                     logos/ (icono.svg, logo.svg, logo-oscuro.svg), iconos y plantillas
├── docs/                       Documentación
├── deploy/                     Docker y despliegue
├── tests/                      Pruebas
└── README.md
```
Cada carpeta futura incluye un `README.md` con lo que se debe agregar.

## Cómo ejecutarlo
Las páginas usan módulos ES y cargan sus plantillas HTML con `fetch`, por lo que deben abrirse desde un servidor local (no con doble clic):
```
npm start          # usa npx serve
# o bien
python3 -m http.server 8000
```
Luego abre la dirección que indique (por ejemplo `http://localhost:8000`). Los datos de prueba se guardan en el navegador (`localStorage`) y se comparten entre páginas; para volver a los datos iniciales, borra los datos del sitio.

## Cómo funciona el acceso
- `src/core/previo.js` corre antes de dibujar cada página: aplica el tema guardado y, en las páginas marcadas con `<html data-protegida>`, redirige a `index.html?siguiente=<página>` si no hay sesión vigente.
- `src/core/sesion.js` guarda y valida la sesión (`sessionStorage`, o `localStorage` si se mantiene la sesión).
- `index.html` solo acepta como destino de regreso páginas del menú, nunca direcciones externas.

## Cómo agregar un módulo
1. Crea `src/modules/<nombre>/<nombre>.html` (marcado y `<template>` para filas repetidas) y `<nombre>.js`.
2. En el `.js` exporta `dibujar(contexto)`, que devuelve el HTML, y opcionalmente `montar(raiz, contexto)`, que enlaza los eventos. El contexto ofrece `aviso(texto)` y `alerta(texto)` para los mensajes, y `redibujar()`.
3. Agrega la entrada en `src/config/nav.js` y la ruta en `src/config/routes.js`.
4. Crea `<nombre>.html` en la raíz copiando otra página protegida: cambia el título y `data-vista="<nombre>"`.

Los campos numéricos se declaran con `data-numero="entero"` o `data-numero="entero-negativo"`. Las reglas de negocio (registrar ventas y facturas, buscar productos) viven en `src/services/`, sin tocar la interfaz.

Plantillas: `{{x}}` inserta texto escapado, `{{{x}}}` inserta HTML y `<!--{{{x}}}-->` se usa dentro de tablas.

## Conexión con el backend
`src/services/api.js` es el cliente de la API (cookie de sesión, error de conexión y cierre de sesión al recibir 401) y la dirección se configura en `src/config/entorno.js`. Las reglas de negocio de `src/services/*.service.js` hoy leen y guardan en el navegador; para conectar el backend cada función se reemplaza por su llamada a `api` (asíncrona) y los módulos de interfaz esperan su respuesta con `await`. Los endpoints esperados están en `docs/api.md`.

## Formato del CSV de inventario
Una fila de encabezado con las columnas `ID`, `Referencia`, `Producto`, `Costo` y `Stock` (acepta separador coma o punto y coma). Al cargar el archivo se actualizan los productos con el mismo ID y se crean los nuevos (si la fila no trae ID, se asigna uno). El stock acepta valores negativos. Para trabajar en Google Sheets: súbelo a Drive, edítalo y descárgalo de nuevo como CSV.

## Arquitectura objetivo
- **Frontend:** React (Vite), flexbox, dnd-kit para los widgets, skeletons y contadores animados.
- **Backend:** Spring Boot (REST) con Spring Security.
- **Base de datos:** PostgreSQL, con JSONB para campos personalizados.
- **Despliegue:** Docker; local con docker-compose y luego nube (Render, Railway o VPS).

## Seguridad
- Ingreso solo con Google (OAuth2/OIDC): el servidor valida el token, solo entran correos autorizados por el dueño, la sesión va en cookie HttpOnly.
- El servidor debe verificar la sesión en cada petición y en cada página protegida; la verificación del navegador es solo de comodidad.
- Aislamiento multitienda: `tienda_id` en cada tabla y en cada consulta.
- Roles y permisos en tablas, que el dueño puede crear y eliminar desde el menú.
- Auditoría de cambios.

## Modelo de datos inicial
`tienda`, `usuario`, `membresia` (usuario, tienda, rol), `rol`, `permiso`, `rol_permiso`, `cliente`, `producto` (ID, referencia, nombre, costo, stock que puede ser negativo), `factura_compra` y `factura_compra_item`, `venta` y `venta_item` (varios productos por venta), `pago`, `caja_sesion`, `movimiento_caja`, `campo_definicion`, `campo_valor` (JSONB), `widget_panel` (posición y tamaño por usuario), `tema_tienda` (tokens de color), `auditoria`.

## Etapas
1. Pantallas, páginas por vista y acceso de prueba.
2. Base de datos, API, ingreso con Google y roles.
3. Frontend con datos reales: menús, tema y panel con widgets.
4. Ventas, pagos y cuadre de caja.
5. Campos personalizados, integración con documentos de Google desde el servidor y auditoría.
6. Despliegue en la nube.
